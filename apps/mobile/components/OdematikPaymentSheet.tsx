import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { C } from '@/lib/theme';
import {
  odematikCancel,
  odematikCheckout,
  odematikGetBilling,
  odematikVerify,
  type OdematikBillingInfo,
  type OdematikCustomer,
} from '@/lib/odematik';

// PSP iframe'inin window'a yaydığı postMessage'ları React Native'e iletmek
// için. WebView, üst seviye window olduğundan PSP'nin `window.parent.postMessage`
// çağrısı kendisine post eder; bu listener onu yakalayıp RN'e gönderir. Ayrıca
// `window.parent.postMessage` ve `window.top.postMessage` çağrılarını override
// ediyoruz — bazı PSP'ler doğrudan bunları çağırıyor.
const INJECTED_JS = `
(function() {
  function send(data) {
    try {
      var payload = typeof data === 'string' ? data : JSON.stringify(data);
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(payload);
    } catch (e) {}
  }
  function patch(obj) {
    try {
      var orig = obj.postMessage;
      obj.postMessage = function(message) {
        send(message);
        try { return orig.apply(obj, arguments); } catch (e) {}
      };
    } catch (e) {}
  }
  window.addEventListener('message', function(ev) { send(ev.data); }, false);
  patch(window.parent);
  patch(window.top);
  true;
})();
`;

interface ProductSummary {
  productId: string;
  label: string;
  priceTRY: number;
  /** Modal başlığı altında küçük satır (örn. "100 Coin · 99 ₺") */
  summary?: string;
  /** Vurgu rengi (default #6366F1) */
  accent?: string;
}

interface OdematikPaymentSheetProps {
  visible: boolean;
  product: ProductSummary | null;
  customer: OdematikCustomer;
  onClose: () => void;
  onPaid: (info: { paymentId?: string; productId: string }) => void;
  onError?: (error: Error) => void;
}

type Stage = 'preview' | 'billing' | 'iframe' | 'verifying' | 'done';

export function OdematikPaymentSheet({
  visible,
  product,
  customer,
  onClose,
  onPaid,
  onError,
}: OdematikPaymentSheetProps) {
  const [stage, setStage] = useState<Stage>('preview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [savedBilling, setSavedBilling] = useState<OdematikBillingInfo | null>(null);
  const [savedBillingLoading, setSavedBillingLoading] = useState(false);
  const [billingMode, setBillingMode] = useState<'first-time' | 'override'>('first-time');
  const [billingForm, setBillingForm] = useState<OdematikBillingInfo>({
    unvan: '',
    vkn_tckn: '',
    vergi_dairesi: '',
    adres: '',
    il: '',
    ilce: '',
  });
  const verifiedRef = useRef(false);
  const accent = product?.accent ?? '#6366F1';

  const reset = useCallback(() => {
    setStage('preview');
    setLoading(false);
    setError(null);
    setIframeUrl(null);
    setPaymentId(null);
    setSavedBilling(null);
    setSavedBillingLoading(false);
    setBillingMode('first-time');
    setBillingForm({
      unvan: '',
      vkn_tckn: '',
      vergi_dairesi: '',
      adres: '',
      il: '',
      ilce: '',
    });
    verifiedRef.current = false;
  }, []);

  // Modal her açıldığında temizle + kayıtlı fatura bilgisini fetch et.
  useEffect(() => {
    if (!visible) {
      reset();
      return;
    }
    let cancelled = false;
    setSavedBillingLoading(true);
    odematikGetBilling()
      .then((b) => {
        if (!cancelled) setSavedBilling(b);
      })
      .finally(() => {
        if (!cancelled) setSavedBillingLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, reset]);

  const handleCancel = useCallback(() => {
    if (stage === 'verifying') return;
    if (paymentId && !verifiedRef.current) {
      void odematikCancel(paymentId);
    }
    reset();
    onClose();
  }, [onClose, paymentId, reset, stage]);

  const runVerify = useCallback(
    async (pid: string) => {
      if (verifiedRef.current || !product) return;
      verifiedRef.current = true;
      setStage('verifying');
      setError(null);
      try {
        const result = await odematikVerify(pid, product.productId);
        if (!result.ok) {
          const msg = result.error?.message ?? 'Ödeme doğrulanamadı';
          setError(msg);
          onError?.(new Error(msg));
          setStage('iframe');
          verifiedRef.current = false;
          return;
        }
        setStage('done');
        onPaid({ paymentId: pid, productId: product.productId });
        reset();
        onClose();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Doğrulama hatası';
        setError(msg);
        onError?.(err instanceof Error ? err : new Error(msg));
        setStage('iframe');
        verifiedRef.current = false;
      }
    },
    [onClose, onError, onPaid, product, reset],
  );

  const startCheckout = useCallback(
    async (extraBilling?: OdematikBillingInfo) => {
      if (!product) return;
      setLoading(true);
      setError(null);
      verifiedRef.current = false;
      try {
        const customerForRequest = extraBilling
          ? { ...customer, billing: extraBilling }
          : customer;
        const res = await odematikCheckout(product.productId, customerForRequest);
        if (!res.ok) {
          if (res.error?.code === 'billing_required') {
            setBillingMode('first-time');
            setStage('billing');
            return;
          }
          const msg = res.error?.message ?? 'Ödeme başlatılamadı';
          setError(msg);
          onError?.(new Error(msg));
          return;
        }

        // Abonelik anında aktive olduysa (trial), iframe açma — direkt başarı.
        if (res.activated) {
          setStage('done');
          onPaid({ productId: product.productId });
          reset();
          onClose();
          return;
        }

        if (res.redirectUrl) {
          // Şu an redirect senaryosunu desteklemiyoruz (ödematik default iframe
          // dönüyor; redirect-only PSP varsa burada Linking ile açılır).
          const msg = 'Bu ödeme yöntemi mobilde henüz desteklenmiyor.';
          setError(msg);
          onError?.(new Error(msg));
          return;
        }

        if (!res.iframeUrl || !res.paymentId) {
          const msg = 'Sunucu iframe URL döndürmedi.';
          setError(msg);
          onError?.(new Error(msg));
          return;
        }

        setPaymentId(res.paymentId);
        setIframeUrl(res.iframeUrl);
        setStage('iframe');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Ağ hatası';
        setError(msg);
        onError?.(err instanceof Error ? err : new Error(msg));
      } finally {
        setLoading(false);
      }
    },
    [customer, onClose, onError, onPaid, product, reset],
  );

  const handleEditBilling = useCallback(() => {
    setBillingForm(
      savedBilling ?? {
        unvan: '',
        vkn_tckn: '',
        vergi_dairesi: '',
        adres: '',
        il: '',
        ilce: '',
      },
    );
    setBillingMode('override');
    setStage('billing');
  }, [savedBilling]);

  const handleBillingSubmit = useCallback(() => {
    const b: OdematikBillingInfo = {
      unvan: billingForm.unvan.trim(),
      vkn_tckn: billingForm.vkn_tckn.trim(),
      vergi_dairesi: billingForm.vergi_dairesi?.trim() || undefined,
      adres: billingForm.adres.trim(),
      il: billingForm.il.trim(),
      ilce: billingForm.ilce.trim(),
    };
    if (!b.unvan || !b.vkn_tckn || !b.adres || !b.il || !b.ilce) {
      setError('Tüm zorunlu alanları doldur.');
      return;
    }
    if (!/^\d{10,11}$/.test(b.vkn_tckn)) {
      setError('VKN 10 hane, TCKN 11 hane olmalı.');
      return;
    }
    setError(null);
    void startCheckout(b);
  }, [billingForm, startCheckout]);

  const handleWebViewMessage = useCallback(
    (ev: WebViewMessageEvent) => {
      if (!paymentId) return;
      const raw = ev.nativeEvent.data;
      if (!raw) return;
      const lc = String(raw).toLowerCase();
      // PSP'lerin tip mesajlarını yutuyoruz (iframe resize vb.)
      if (lc.includes('iframe') && lc.includes('size')) return;
      if (
        lc.includes('success') ||
        lc.includes('approved') ||
        lc === 'paytrcheckoutsuccess' ||
        lc === 'odeme-basarili'
      ) {
        void runVerify(paymentId);
        return;
      }
      if (lc.includes('fail') || lc === 'paytrcheckoutfailed' || lc === 'odeme-basarisiz') {
        setError('Ödeme reddedildi. Başka bir kart deneyebilirsin.');
        return;
      }
      if (lc.includes('cancel') || lc.includes('iptal')) {
        handleCancel();
      }
    },
    [handleCancel, paymentId, runVerify],
  );

  // PSP bazen başarı/başarısızlığı doğrudan navigation ile bildiriyor.
  // İçinde "success" / "fail" geçen URL'lere düşersek aksiyon al.
  const handleNavStateChange = useCallback(
    (state: { url: string }) => {
      if (!paymentId) return;
      const url = (state.url || '').toLowerCase();
      if (url.includes('success') || url.includes('basarili') || url.includes('paid')) {
        void runVerify(paymentId);
      } else if (
        url.includes('fail') ||
        url.includes('basarisiz') ||
        url.includes('declined')
      ) {
        setError('Ödeme reddedildi. Başka bir kart deneyebilirsin.');
      }
    },
    [paymentId, runVerify],
  );

  if (!product) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleCancel}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'bottom']}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: C.border,
          }}
        >
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: C.text, fontWeight: '700', fontSize: 15 }} numberOfLines={1}>
              {product.label}
            </Text>
            <Text style={{ color: C.text3, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
              {product.summary ?? `${product.priceTRY} ₺`}
            </Text>
          </View>
          <Pressable
            onPress={handleCancel}
            disabled={stage === 'verifying'}
            hitSlop={8}
            style={{ padding: 6, opacity: stage === 'verifying' ? 0.4 : 1 }}
          >
            <Ionicons name="close" size={22} color={C.text} />
          </Pressable>
        </View>

        {error && (
          <View
            style={{
              backgroundColor: 'rgba(248, 113, 113, 0.08)',
              borderBottomWidth: 1,
              borderBottomColor: 'rgba(248, 113, 113, 0.25)',
              paddingHorizontal: 16,
              paddingVertical: 10,
            }}
          >
            <Text style={{ color: '#fca5a5', fontSize: 13, lineHeight: 18 }}>{error}</Text>
          </View>
        )}

        {(stage === 'preview' || stage === 'verifying') && (
          <PreviewStage
            product={product}
            accent={accent}
            busy={loading}
            verifying={stage === 'verifying'}
            savedBilling={savedBilling}
            savedBillingLoading={savedBillingLoading}
            onEditBilling={handleEditBilling}
            onProceed={() => startCheckout()}
          />
        )}

        {stage === 'billing' && (
          <BillingFormView
            value={billingForm}
            onChange={setBillingForm}
            onSubmit={handleBillingSubmit}
            busy={loading}
            accent={accent}
            mode={billingMode}
          />
        )}

        {stage === 'iframe' && iframeUrl && (
          <View style={{ flex: 1, backgroundColor: '#fff' }}>
            <WebView
              source={{ uri: iframeUrl }}
              originWhitelist={['*']}
              javaScriptEnabled
              domStorageEnabled
              thirdPartyCookiesEnabled
              setSupportMultipleWindows={false}
              injectedJavaScriptBeforeContentLoaded={INJECTED_JS}
              onMessage={handleWebViewMessage}
              onNavigationStateChange={handleNavStateChange}
              startInLoadingState
              renderLoading={() => (
                <View
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#fff',
                  }}
                >
                  <ActivityIndicator color={accent} />
                  <Text style={{ marginTop: 12, color: '#555', fontSize: 13 }}>
                    Ödeme sayfası yükleniyor…
                  </Text>
                </View>
              )}
            />
          </View>
        )}

        {stage === 'verifying' && (
          <View
            style={{
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderTopWidth: 1,
              borderTopColor: C.border,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 10,
            }}
          >
            <ActivityIndicator color={accent} />
            <Text style={{ color: C.text2, fontSize: 13 }}>Ödeme doğrulanıyor…</Text>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

function PreviewStage({
  product,
  accent,
  busy,
  verifying,
  savedBilling,
  savedBillingLoading,
  onEditBilling,
  onProceed,
}: {
  product: ProductSummary;
  accent: string;
  busy: boolean;
  verifying: boolean;
  savedBilling: OdematikBillingInfo | null;
  savedBillingLoading: boolean;
  onEditBilling: () => void;
  onProceed: () => void;
}) {
  return (
    <ScrollView
      contentContainerStyle={{ padding: 20, gap: 18 }}
      keyboardShouldPersistTaps="handled"
    >
      <View
        style={{
          padding: 22,
          borderRadius: 16,
          backgroundColor: C.surface2,
          borderWidth: 1,
          borderColor: C.border,
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            color: C.text3,
            fontSize: 11,
            letterSpacing: 0.6,
            textTransform: 'uppercase',
          }}
        >
          {product.label}
        </Text>
        <Text
          style={{ color: C.text, fontSize: 36, fontWeight: '800', marginTop: 8, lineHeight: 40 }}
        >
          {product.priceTRY}{' '}
          <Text style={{ fontSize: 18, fontWeight: '500', color: C.text3 }}>TRY</Text>
        </Text>
        {product.summary && (
          <Text style={{ color: C.text3, fontSize: 12.5, marginTop: 8, textAlign: 'center' }}>
            {product.summary}
          </Text>
        )}
      </View>

      {savedBillingLoading ? (
        <View
          style={{
            padding: 12,
            borderRadius: 10,
            borderWidth: 1,
            borderStyle: 'dashed',
            borderColor: C.border,
          }}
        >
          <Text style={{ color: C.text3, fontSize: 12 }}>Fatura bilgileri yükleniyor…</Text>
        </View>
      ) : savedBilling ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: 12,
            borderRadius: 10,
            backgroundColor: C.surface2,
            borderWidth: 1,
            borderColor: C.border,
          }}
        >
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              style={{
                color: C.text3,
                fontSize: 10.5,
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: 0.6,
                marginBottom: 2,
              }}
            >
              Faturalandırma
            </Text>
            <Text style={{ color: C.text, fontSize: 13 }} numberOfLines={1}>
              {savedBilling.unvan} ·{' '}
              {savedBilling.vkn_tckn.length === 11 ? 'TCKN' : 'VKN'} ••••
              {savedBilling.vkn_tckn.slice(-4)}
            </Text>
          </View>
          <Pressable
            onPress={onEditBilling}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 6,
              borderWidth: 1,
              borderColor: `${accent}88`,
            }}
          >
            <Text style={{ color: accent, fontSize: 12, fontWeight: '600' }}>Değiştir</Text>
          </Pressable>
        </View>
      ) : null}

      <View
        style={{
          padding: 12,
          borderRadius: 10,
          backgroundColor: C.surface2,
          borderWidth: 1,
          borderColor: C.border,
        }}
      >
        <Text style={{ color: C.text3, fontSize: 12, lineHeight: 18 }}>
          🔒 Kart bilgilerin şifreli olarak doğrudan banka altyapısına iletilir.{'\n'}
          ✓ 3D Secure korumalı · Visa · Mastercard · Troy · Amex
        </Text>
      </View>

      <Pressable
        onPress={onProceed}
        disabled={busy || verifying}
        style={{
          marginTop: 6,
          paddingVertical: 14,
          borderRadius: 12,
          backgroundColor: busy || verifying ? `${accent}88` : accent,
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 10,
        }}
      >
        {busy ? (
          <>
            <ActivityIndicator color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Hazırlanıyor…</Text>
          </>
        ) : (
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
            Ödemeye Devam Et →
          </Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

function BillingFormView({
  value,
  onChange,
  onSubmit,
  busy,
  accent,
  mode,
}: {
  value: OdematikBillingInfo;
  onChange: (next: OdematikBillingInfo) => void;
  onSubmit: () => void;
  busy: boolean;
  accent: string;
  mode: 'first-time' | 'override';
}) {
  const set = (patch: Partial<OdematikBillingInfo>) => onChange({ ...value, ...patch });
  const title = mode === 'override' ? 'Fatura bilgilerini düzenle' : 'Fatura bilgileri';
  const description =
    mode === 'override'
      ? 'Kayıtlı bilgilerin güncellenecek ve bu ödeme yeni bilgilerle faturalanacak.'
      : 'Bu bilgileri yalnızca ilk satın alımda gireceksin — sonraki ödemelerde tekrar sorulmaz.';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 14 }}
        keyboardShouldPersistTaps="handled"
      >
        <View>
          <Text style={{ color: C.text, fontWeight: '600', fontSize: 15 }}>{title}</Text>
          <Text style={{ color: C.text3, fontSize: 12.5, marginTop: 4, lineHeight: 18 }}>
            {description}
          </Text>
        </View>

        <Field
          label="Ticari ünvan"
          value={value.unvan}
          placeholder="Örnek Yazılım Ltd. Şti."
          onChangeText={(t) => set({ unvan: t })}
          editable={!busy}
        />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Field
              label="VKN / TCKN"
              value={value.vkn_tckn}
              placeholder="10 veya 11 hane"
              keyboardType="number-pad"
              onChangeText={(t) => set({ vkn_tckn: t.replace(/\D/g, '').slice(0, 11) })}
              editable={!busy}
              monospace
            />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label="Vergi dairesi"
              value={value.vergi_dairesi ?? ''}
              placeholder="Kadıköy"
              onChangeText={(t) => set({ vergi_dairesi: t })}
              editable={!busy}
            />
          </View>
        </View>
        <Field
          label="Açık adres"
          value={value.adres}
          placeholder="Örnek Mah. Test Cad. No: 1"
          onChangeText={(t) => set({ adres: t })}
          editable={!busy}
        />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Field
              label="İl"
              value={value.il}
              placeholder="İstanbul"
              onChangeText={(t) => set({ il: t })}
              editable={!busy}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label="İlçe"
              value={value.ilce}
              placeholder="Kadıköy"
              onChangeText={(t) => set({ ilce: t })}
              editable={!busy}
            />
          </View>
        </View>

        <Pressable
          onPress={onSubmit}
          disabled={busy}
          style={{
            marginTop: 6,
            paddingVertical: 14,
            borderRadius: 12,
            backgroundColor: busy ? `${accent}88` : accent,
            alignItems: 'center',
          }}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Devam et</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  editable = true,
  keyboardType,
  monospace,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  editable?: boolean;
  keyboardType?: 'default' | 'number-pad' | 'email-address';
  monospace?: boolean;
}) {
  return (
    <View>
      <Text
        style={{
          color: C.text3,
          fontSize: 11,
          fontWeight: '500',
          textTransform: 'uppercase',
          letterSpacing: 0.6,
          marginBottom: 6,
        }}
      >
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.text4}
        editable={editable}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize="none"
        autoCorrect={false}
        style={{
          paddingHorizontal: 12,
          paddingVertical: 10,
          borderRadius: 9,
          borderWidth: 1,
          borderColor: C.border,
          backgroundColor: C.surface2,
          color: C.text,
          fontSize: 14,
          fontFamily: monospace
            ? Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' })
            : undefined,
        }}
      />
    </View>
  );
}

export type { ProductSummary };
