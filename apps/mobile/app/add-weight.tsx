import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMutation } from '@tanstack/react-query';
import { ApiError } from '@yemek-takip/api-client';
import { api } from '@/lib/api';
import { pickFromLibrary, takePhoto, uploadImageFromUri } from '@/lib/upload';
import { todayLocalDate } from '@yemek-takip/utils';
import { C, onPrimary } from '@/lib/theme';

export default function AddWeightScreen() {
  const router = useRouter();
  const [weightKg, setWeightKg] = useState('');
  const [note, setNote] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [focused, setFocused] = useState<'weight' | 'note' | null>(null);
  const date = todayLocalDate();

  const save = useMutation({
    mutationFn: async () => {
      let photoKey: string | undefined;
      let photoUrl: string | undefined;
      if (photoUri) {
        setUploading(true);
        try {
          const r = await uploadImageFromUri(photoUri, 'weight');
          photoKey = r.key;
          photoUrl = r.publicUrl;
        } finally {
          setUploading(false);
        }
      }
      return api.weight.upsert({
        date,
        weightKg: Number(weightKg),
        photoKey,
        photoUrl,
        note: note.trim() || undefined,
      });
    },
    onSuccess: () => router.back(),
    onError: (err) =>
      Alert.alert('Hata', err instanceof ApiError ? err.message : 'Kaydedilemedi'),
  });

  async function selectPhoto(source: 'camera' | 'library') {
    try {
      const uri = source === 'camera' ? await takePhoto() : await pickFromLibrary();
      if (uri) setPhotoUri(uri);
    } catch (err) {
      Alert.alert('Hata', err instanceof Error ? err.message : 'Foto seçilemedi');
    }
  }

  const canSubmit =
    !!weightKg && !Number.isNaN(Number(weightKg)) && !save.isPending && !uploading;
  const isBusy = save.isPending || uploading;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Kilo ekle',
          headerBackTitle: 'Geri',
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={{ padding: 18, gap: 18, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
          >
            <View>
              <Text style={s.labelXs}>{date}</Text>
              <Text style={s.h1}>Kilonu kaydet</Text>
            </View>

            <View>
              <Text style={s.fieldLabel}>Kilo (kg)</Text>
              <View
                style={[
                  s.inputCard,
                  focused === 'weight' && { borderColor: C.amber },
                ]}
              >
                <TextInput
                  value={weightKg}
                  onChangeText={setWeightKg}
                  onFocus={() => setFocused('weight')}
                  onBlur={() => setFocused(null)}
                  keyboardType="decimal-pad"
                  placeholder="ör: 78.5"
                  placeholderTextColor={C.text4}
                  style={[s.input, { fontSize: 22, fontWeight: '700', height: 48 }]}
                />
              </View>
            </View>

            <View>
              <Text style={s.fieldLabel}>Vücut fotoğrafı (opsiyonel)</Text>
              {photoUri ? (
                <View>
                  <Image source={{ uri: photoUri }} style={s.photoPreview} resizeMode="cover" />
                  <Pressable onPress={() => setPhotoUri(null)} style={s.closeBtn}>
                    <Ionicons name="close" size={18} color="#fff" />
                  </Pressable>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Pressable
                    onPress={() => selectPhoto('camera')}
                    android_ripple={{ color: 'rgba(184,240,77,0.10)' }}
                    style={s.photoBtn}
                  >
                    <Ionicons name="camera-outline" size={20} color={C.lime} />
                    <Text style={s.photoBtnText}>Çek</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => selectPhoto('library')}
                    android_ripple={{ color: 'rgba(184,240,77,0.10)' }}
                    style={s.photoBtn}
                  >
                    <Ionicons name="images-outline" size={20} color={C.lime} />
                    <Text style={s.photoBtnText}>Galeri</Text>
                  </Pressable>
                </View>
              )}
            </View>

            <View>
              <Text style={s.fieldLabel}>Not (opsiyonel)</Text>
              <View
                style={[
                  s.inputCard,
                  focused === 'note' && { borderColor: C.lime },
                ]}
              >
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  onFocus={() => setFocused('note')}
                  onBlur={() => setFocused(null)}
                  placeholder="ör: aç karna, sabah"
                  placeholderTextColor={C.text4}
                  maxLength={300}
                  style={[s.input, { height: 44 }]}
                />
              </View>
            </View>

            <Pressable
              onPress={() => canSubmit && save.mutate()}
              disabled={!canSubmit}
              style={[s.primaryBtn, !canSubmit && { opacity: 0.5 }]}
            >
              <LinearGradient
                colors={['#e4ff8a', '#b8f04d', '#9bd03a']}
                locations={[0, 0.55, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.primaryBtnInner}
              >
                {isBusy ? (
                  <>
                    <ActivityIndicator size="small" color={onPrimary} />
                    <Text style={s.primaryBtnText}>
                      {uploading ? 'Foto yükleniyor…' : 'Kaydediliyor…'}
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="checkmark" size={18} color={onPrimary} />
                    <Text style={s.primaryBtnText}>Kaydet</Text>
                    <Ionicons name="arrow-forward" size={18} color={onPrimary} />
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const s = StyleSheet.create({
  labelXs: {
    fontSize: 10.5,
    letterSpacing: 1.2,
    color: C.text3,
    fontWeight: '600',
  },
  h1: {
    fontSize: 26,
    fontWeight: '700',
    color: C.text,
    letterSpacing: -0.6,
    marginTop: 6,
  },
  fieldLabel: {
    fontSize: 12,
    color: C.text2,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputCard: {
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
  },
  input: {
    color: C.text,
    fontSize: 15,
    padding: 0,
  },
  photoPreview: {
    width: '100%',
    height: 240,
    borderRadius: 14,
    backgroundColor: C.surface,
  },
  closeBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  photoBtnText: {
    color: C.text,
    fontSize: 14,
    fontWeight: '600',
  },
  primaryBtn: {
    borderRadius: 16,
    marginTop: 8,
    shadowColor: C.lime,
    shadowOpacity: 0.45,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 8,
    overflow: 'hidden',
  },
  primaryBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 58,
    paddingHorizontal: 20,
  },
  primaryBtnText: {
    color: onPrimary,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});
