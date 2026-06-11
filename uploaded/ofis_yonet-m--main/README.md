# Mustafa Mimarlık Ofisi - Bulut Tabanlı Cari, Personel ve Finansal Ortaklık Yönetim Sistemi

Bu proje; mimarlık ve şantiye koordinasyon süreçlerini yönetirken firmaların cari hesap ekstrelerini, şantiyelerdeki personellerin giriş-çıkış takibini ve Mustafa & Hasan ortaklık yapısının dinamik kâr/gider dağılımını tek bir ekrandan, entegre ve hatasız şekilde yönetmek üzere geliştirilmiş **Full-Stack** bir yönetim panelidir.

---

## 1. Projenin Amacı ve Vizyonu

**Mustafa Mimarlık Ofisi Finans ve Takip Portalı**, işletmenin tüm operasyonel ve finansal süreçlerini dijital bir çatı altında birleştirir:
- **Operasyonel Verimlilik:** Personel giriş-çıkış hareketleri ile şantiye operasyonları anlık olarak eşlenir.
- **Güvenilir Finansal Akış:** Geleneksel Excel tablolarındaki formül hatalarının önüne geçecek şekilde tasarlanmış, hatasız bir kur çevrim ve cari bakiye motoru barındırır.
- **Şeffaf Ortaklık:** Şirket ortaklarının (Mustafa & Hasan) ofis giderlerindeki %50-%50 eşit paylaşımları ve kasadan çektikleri şahsi nakitlerin birbirlerine borç/alacak olarak yansıması otomatik olarak hesaplanır.

---

## 2. Para Birimi ve Kur Çevrim Felsefesi (Kritik Alan)

Sistemde finansal bütünlüğü korumak amacıyla **kesin hesaplama motoru kuralları** uygulanmıştır:

### Ana Para Birimi (Baz): GBP (£)
*   Sistemin ana muhasebe ve raporlama para birimi her zaman **İngiliz Sterlini (GBP)** olarak kabul edilir.
*   Müşteri borçlandırmaları (Teklif Kabulleri, Proje Bedelleri vb.) doğrudan **GBP** üzerinden yazılır.

### TRY Tahsilat Çevrim Mantığı
Müşterilerden Türk Lirası (TRY) cinsinden tahsilat (Nakit veya Havale) alınması mümkündür. Ancak finansal karmaşıklığı önlemek adına sisteme işlenen her bir TRY tahsilat hareketi, **kendi satırına ait "ORAN/KUR" değerine anında bölünerek** anlık GBP karşılığına çevrilir.
$$\text{GBP Karşılığı} = \frac{\text{TRY Tutarı}}{\text{İlgili Satırdaki Kur (Exchange Rate)}}$$

*Hesaplamalar virgülden sonra 2 basamağa yuvarlanarak (IEEE 754 kayan noktalı sayı uyumsuzlukları giderilerek) sisteme yazılır.*

### Güncel Net Cari Bakiye (Outstanding Balance) Formülü
Müşterinin faturaya esas güncel borç bakiyesi hesaplanırken:
1.  **Toplam GBP Borç** değeri hesaplanır.
2.  Bu borçtan, doğrudan yapılan **GBP cinsinden tahsilatlar** düşülür.
3.  Ardından, TRY cinsinden yapılan her bir tahsilat hareketi **kendi kurundan çevrilen GBP Karşılığı bazında teker teker düşülür**.

**Örnek Senaryo:**
- **Toplam Borç (Debits):** 27.000,00 GBP
- **GBP Tahsilat (Credit):** 2.000,00 GBP
- **1. TRY Tahsilat (Credit):** 5.000,00 TRY / Kur: 61.00 $\rightarrow$ **81,97 GBP**
- **2. TRY Tahsilat (Credit):** 2.000,00 TRY / Kur: 63.00 $\rightarrow$ **31,75 GBP**
- **Net Güncel Bakiye Hesaplama:**
  $$27.000,00 \text{ GBP} - [2.000,00 \text{ GBP} + 81,97 \text{ GBP} + 31,75 \text{ GBP}] = 24.886,28 \text{ GBP}$$

Pano üzerinde ve PDF raporunda firmanın güncel net cari bakiyesi net olarak **24.886,28 GBP** şeklinde görünür ve müşteriye "Firma Borçlu" olarak raporlanır.

---

## 3. Sistem Modülleri ve İşleyişleri

### A. Firma Yönetimi (Client Registry)
*   Dinamik firma ekleme kartı ile her firmaya özel Yetkili Yönetici, Sektör, İletişim Numarası ve Adres bilgileri kaydedilir.
*   Seçilen firmanın üzerine tıklanarak "Cari Ekstre & Tahsilat Girişi" paneli açılır.
*   Her firmaya ait geçmişe dönük tüm borç/alacak hareketleri tarih sırasıyla tablo şeklinde listelenir ve tek tıkla PDF Hesap Ekstresi oluşturulur.

### B. Personel Yönetimi (HR & Site Operations)
*   Ofis içi ve şantiyede aktif çalışan personellerin ünvan, iletişim ve aktiflik takibi yapılır.
*   Personel listesi, Giriş-Çıkış Takip modülündeki çalışan seçim dropdown yapısıyla tam entegre çalışır.

### C. Şantiye Giriş-Çıkış Takip Modülü (Time Clock Ledger)
*   Personellerin şantiyeye giriş ve çıkış saatleri **aynı satırda yan yana** listelenerek takibi kolaylaştırır.
*   **Çalışma Süresi Hesaplama Fonksiyonu:**
    - Sisteme girilen giriş ve çıkış zaman damgaları (Timestamp) arasındaki fark milisaniye cinsinden alınır.
    - Süre, salt saat veya dakika yerine, şantiye takibine uygun olarak **"X Gün, Y Saat"** formatına dönüştürülür.
    - Algoritma, 24 saatlik periyotları "Gün" olarak ayırır, geriye kalan artıkları ise "Saat" cinsinden hesaplar:
      $$\text{Toplam Saat} = \frac{\Delta\text{ Zaman (ms)}}{3.600.000}$$
      $$\text{Gün Sayısı} = \lfloor \frac{\text{Toplam Saat}}{24} \rfloor \quad , \quad \text{Kalan Saat} = \lfloor \text{Toplam Saat} \pmod{24} \rfloor$$

---

## 4. Ortaklık ve Kâr Dağıtım Motoru (Hasan & Mustafa)

Ofis içi finansman ve adil kar paylaşımı için geliştirilmiş özel bir matematiksel modelleme uygulanmaktadır.

```
       [ Toplam Ofis Gelirleri (Ortak Kasa) ]
                         │
        ┌────────────────┴────────────────┐
        ▼                                 ▼
[ Hasan Hisse (%50) ]            [ Mustafa Hisse (%50) ]
        │                                 │
     Giderlerin %50'si                 Giderlerin %50'si
  (Kira, Maaş, Fatura vb.)          (Kira, Maaş, Fatura vb.)
        │                                 │
        ▼                                 ▼
   [ Net Bireysel Hakediş ]          [ Net Bireysel Hakediş ]
        │                                 │
   Hasan Kazanç Çekimi               Mustafa Kazanç Çekimi
        │                                 │
        └────────────────┬────────────────┘
                         ▼
        [ Dinamik Ortaklar Cari Bakiyesi ]
             (Kimin Kime Borcu Var?)
```

### A. Altyapı ve Genel Gider Bölüşümü
*   Ofisin kira, elektrik, şantiye aracı yakıtı, personel maaşları ve ofis genel giderleri sisteme işlendiğinde bu tutar otomatik olarak **%50 - %50** olarak bölünür.
*   Her iki ortağın net hakedişinden (bireysel kar hanesinden) bu gider payları otomatik olarak düşürülür.

### B. Dinamik Kazanç Çekimi ve Bakiye Devri
*   Ortaklar, projenin nakit durumuna göre kasadan farklı miktarlarda bireysel para çekişi (Mahsup/Çekim) yapabilir.
*   Sistem, iki ortağın kümülatif hakedişlerinden çektikleri toplam nakitleri karşılaştırarak **kimin kime borçlu olduğunu** dinamik olarak hesaplar.
*   **Örnek:** Eğer hakedişler eşitken Hasan kasadan 2.000 GBP, Mustafa ise 18.000 GBP nakit çekmişse; sistem aradaki 16.000 GBP farkın yarısını (8.000 GBP) baz alarak **"Mustafa, Hasan'a 8.000 GBP borçludur"** uyarısını ve bakiye devrini üretir. Bu tutar sonraki aya devreden bakiye olarak finansal geçmişe işlenebilir.

---

## 5. Teknik Altyapı ve Raporlama

### Yazılım İstifi (Tech Stack)
*   **Frontend (Önyüz):** React 19, TypeScript, Tailwind CSS v4 (Sistem arayüzü modern, sade, gözü yormayan Slate ve Indigo tonlarında tasarlanmıştır).
*   **Backend (Arkayüz):** Node.js tabanlı Express API (server.ts) motoru ile tsx çalıştırma katmanı.
*   **Veritabanı Dosyası:** persistent veri yönetimi için yapılandırılmış `db.json` şeması.

### PDF Raporlarında Türkçe Karakter (UTF-8) Desteği
`jsPDF` kütüphanesi varsayılan font olarak UTF-8 desteklemeyen Helvetia kullanır; bu durum Türkçe raporlamalarda `ı, ş, ğ, İ, Ş, Ğ` gibi karakterlerin bozulmasına yol açar. Bu sorunun önüne geçebilmek için sistemde şu dökümantasyon kuralları uygulanır:
- Rapor çıktıları hazırlanırken, Türkçe Unicode harf karşılıklarını uygun yazı tipi gliflerine eşleyen (`char-map`) entegre bir biçimlendirici mevcuttur.
- Çıktı metinleri doğrudan yazılmak yerine `pText()` (Parse Text) yardımcı süzgecinden geçirilir. Bu süzgeç, Türkçe karakterleri jsPDF'in standart şemasıyla uyumlu unicode karakter formatına dinamik olarak transliterate eder.

---

## 6. Proje Kurulumu ve Çalıştırma

### Bağımlılıkların Yüklenmesi
```bash
npm install
```

### Geliştirici Modunda Çalıştırma (Dev Mode)
```bash
npm run dev
```
Uygulama yerel makinenizde `http://localhost:3000` adresinde Express sunucusu ve entegre Vite middleware'iyle ayağa kalkacaktır.

### Üretim Derlemesi ve Yayına Alma (Production Build & Start)
```bash
npm run build
npm start
```

---
*Mustafa Mimarlık Ofisi Finansal Takip Sistemi, şirket anayasasına ve ortaklık ilkelerine bağlı kalınarak yüksek performans ve sıfır hata toleransıyla tasarlanmıştır.*
