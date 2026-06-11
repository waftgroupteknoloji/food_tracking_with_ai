import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Gizlilik Politikası — kackal',
  description:
    'kackal uygulamasının kişisel verileri nasıl topladığı, kullandığı ve koruduğuna dair gizlilik politikası.',
};

const LAST_UPDATED = '11 Haziran 2026';
const CONTACT_EMAIL = 'info@waftgroup.com';

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-background px-6 py-12">
      <article className="mx-auto max-w-3xl space-y-8">
        <header className="space-y-3 border-b border-border pb-6">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground transition"
          >
            ← Ana sayfa
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Gizlilik Politikası
          </h1>
          <p className="text-sm text-muted-foreground">
            Son güncelleme: {LAST_UPDATED}
          </p>
        </header>

        <section className="space-y-3">
          <p className="text-muted-foreground leading-relaxed">
            Bu gizlilik politikası, <strong>kackal</strong> mobil ve web
            uygulamasının (&quot;Uygulama&quot;) kişisel verilerinizi nasıl
            topladığını, kullandığını, sakladığını ve koruduğunu açıklar.
            Uygulamayı kullanarak bu politikada açıklanan uygulamaları kabul
            etmiş olursunuz.
          </p>
        </section>

        <Section title="1. Topladığımız Veriler">
          <p className="text-muted-foreground leading-relaxed">
            Hizmeti sunabilmek için aşağıdaki verileri topluyoruz:
          </p>
          <ul className="list-disc space-y-2 pl-6 text-muted-foreground leading-relaxed">
            <li>
              <strong>Hesap bilgileri:</strong> E-posta adresi ve şifre (şifre
              güvenli biçimde şifrelenerek saklanır).
            </li>
            <li>
              <strong>Profil ve sağlık bilgileri:</strong> Yaş, cinsiyet, boy,
              kilo, hedefler gibi kalori hesabı için girdiğiniz bilgiler.
            </li>
            <li>
              <strong>Yemek fotoğrafları:</strong> Kalori ve besin değeri tahmini
              için yüklediğiniz veya çektiğiniz yemek görselleri.
            </li>
            <li>
              <strong>Günlük kayıtlar:</strong> Öğünler, aktiviteler ve kilo
              ölçümleri gibi takip verileri.
            </li>
            <li>
              <strong>Teknik veriler:</strong> Uygulamanın çalışması için gerekli
              oturum bilgileri ve cihaz/işlem kayıtları.
            </li>
          </ul>
        </Section>

        <Section title="2. Cihaz İzinleri">
          <p className="text-muted-foreground leading-relaxed">
            Mobil uygulama, yalnızca ilgili özelliği kullandığınızda aşağıdaki
            izinleri ister:
          </p>
          <ul className="list-disc space-y-2 pl-6 text-muted-foreground leading-relaxed">
            <li>
              <strong>Kamera:</strong> Yemek fotoğrafı çekmek için.
            </li>
            <li>
              <strong>Fotoğraf galerisi:</strong> Mevcut bir yemek fotoğrafını
              yüklemek için.
            </li>
          </ul>
          <p className="text-muted-foreground leading-relaxed">
            Bu izinleri istediğiniz zaman cihazınızın ayarlarından
            kaldırabilirsiniz.
          </p>
        </Section>

        <Section title="3. Verileri Nasıl Kullanıyoruz">
          <ul className="list-disc space-y-2 pl-6 text-muted-foreground leading-relaxed">
            <li>Kalori ve besin değerlerini hesaplamak ve size sunmak.</li>
            <li>
              Yüklediğiniz yemek fotoğraflarını yapay zeka ile analiz ederek
              tahmini besin değeri üretmek.
            </li>
            <li>Günlük takip, geçmiş ve ilerleme raporlarınızı oluşturmak.</li>
            <li>Hesabınızın güvenliğini sağlamak ve hizmeti iyileştirmek.</li>
          </ul>
        </Section>

        <Section title="4. Üçüncü Taraf Hizmetleri">
          <p className="text-muted-foreground leading-relaxed">
            Hizmeti sunabilmek için sınırlı sayıda güvenilir hizmet sağlayıcı
            kullanırız:
          </p>
          <ul className="list-disc space-y-2 pl-6 text-muted-foreground leading-relaxed">
            <li>
              <strong>Yapay zeka analiz sağlayıcıları:</strong> Yemek
              fotoğraflarının besin değeri analizi için.
            </li>
            <li>
              <strong>Bulut depolama:</strong> Verilerinizin ve görsellerin
              güvenli biçimde saklanması için.
            </li>
            <li>
              <strong>Ödeme sağlayıcısı:</strong> Ücretli özellikleri satın
              alırsanız ödeme işlemleri için. Kart bilgileriniz tarafımızca
              saklanmaz.
            </li>
          </ul>
          <p className="text-muted-foreground leading-relaxed">
            Verilerinizi pazarlama amacıyla üçüncü taraflara satmıyoruz.
          </p>
        </Section>

        <Section title="5. Veri Saklama ve Güvenlik">
          <p className="text-muted-foreground leading-relaxed">
            Verileriniz, hesabınız aktif olduğu sürece saklanır. Verilerinizi
            yetkisiz erişime karşı korumak için makul teknik ve idari önlemler
            (şifreleme, erişim kontrolü vb.) uygularız. Ancak internet üzerinden
            hiçbir aktarım veya depolamanın %100 güvenli olmadığını belirtmek
            isteriz.
          </p>
        </Section>

        <Section title="6. Haklarınız ve Veri Silme">
          <p className="text-muted-foreground leading-relaxed">
            Kişisel verilerinize erişme, düzeltme ve silme hakkına sahipsiniz.
            Hesabınızı ve ilişkili tüm verilerinizi silmek isterseniz uygulama
            içindeki hesap ayarlarından veya{' '}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-primary hover:underline"
            >
              {CONTACT_EMAIL}
            </a>{' '}
            adresine yazarak talepte bulunabilirsiniz. Talebinizin ardından
            verileriniz makul bir süre içinde silinir.
          </p>
        </Section>

        <Section title="7. Çocukların Gizliliği">
          <p className="text-muted-foreground leading-relaxed">
            Uygulama 13 yaşın altındaki çocuklara yönelik değildir ve bilerek bu
            yaş grubundan kişisel veri toplamayız.
          </p>
        </Section>

        <Section title="8. Bu Politikadaki Değişiklikler">
          <p className="text-muted-foreground leading-relaxed">
            Bu gizlilik politikasını zaman zaman güncelleyebiliriz. Önemli
            değişiklikleri uygulama veya web sitesi üzerinden duyururuz.
            Güncellenmiş politika bu sayfada yayımlandığı tarihte yürürlüğe
            girer.
          </p>
        </Section>

        <Section title="9. İletişim">
          <p className="text-muted-foreground leading-relaxed">
            Gizlilik politikamız veya verileriniz hakkında sorularınız için bize
            ulaşabilirsiniz:{' '}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-primary hover:underline"
            >
              {CONTACT_EMAIL}
            </a>
          </p>
        </Section>

        <footer className="border-t border-border pt-6 text-sm text-muted-foreground">
          © {new Date().getFullYear()} kackal. Tüm hakları saklıdır.
        </footer>
      </article>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}
