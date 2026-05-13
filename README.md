# 🏢 Ofis Giriş-Çıkış Takip Sistemi

> Sunucu gerektirmeyen, tamamen tarayıcı tabanlı ofis personel giriş-çıkış takip uygulaması.

---

## 📸 Özellikler

| Özellik | Açıklama |
|---------|----------|
| 📊 Canlı Panel | Anlık istatistik ve ofisteki personel listesi |
| 🟢 Giriş Kaydı | Personel seçimi veya kart okuyucu ile |
| 🔴 Çıkış Kaydı | Otomatik çalışma süresi hesaplama |
| 👥 Personel Yönetimi | Tam CRUD + arama + departman filtreleme |
| 📋 Raporlar | Tarih/departman/tip filtreli, CSV ve yazdırma |
| 💾 Yedekleme | Manuel + saatlik otomatik JSON yedek |
| 📱 PWA | Ana ekrana eklenebilir, offline çalışır |
| 📐 Responsive | Mobil (320px), tablet (768px), masaüstü |

---

## 🗂️ Proje Yapısı

```
ofis-giris-cikis/
├── index.html           # Tek sayfa uygulama (SPA)
├── css/
│   ├── style.css        # Ana stiller (tablet-first)
│   └── responsive.css   # Breakpoint'ler
├── js/
│   ├── app.js           # UI mantığı & navigasyon
│   ├── personel.js      # Personel CRUD modülü
│   ├── log.js           # Giriş/çıkış kayıt modülü
│   └── storage.js       # localStorage yardımcısı
├── data/
│   ├── personel.json    # Örnek personel verisi
│   └── log.json         # Örnek log verisi
├── assets/icons/        # SVG ikonlar
├── reports/             # Yazdırılabilir PDF şablonları
├── config/              # Uygulama konfigürasyonu
├── pwa/                 # Service Worker & manifest
├── backup/              # Otomatik yedek
└── docs/                # Kullanım kılavuzu
```

---

## 🚀 Kurulum

```bash
# Klonla
git clone https://github.com/kullanici/ofis-giris-cikis.git

# Aç (sunucu gerekmez)
start ofis-giris-cikis/index.html
```

> Lokal sunucu (PWA Service Worker için önerilir):
> ```bash
> npx serve ofis-giris-cikis
> ```

---

## 🛠️ Teknoloji Yığını

- **HTML5** — Semantik markup
- **CSS3** — Grid, Flexbox, CSS Variables, Animasyonlar
- **Vanilla JS** — Framework gerektirmez
- **localStorage** — Sunucusuz veri saklama
- **Service Worker** — PWA & offline destek

---

## 📋 Kullanım

1. `index.html`'i tarayıcıda açın
2. Personel ekleyin (`Personeller` → `Yeni Personel`)
3. Sabah giriş yapın (`Giriş Yap` sayfası)
4. Akşam çıkış yapın (`Çıkış Yap` sayfası)
5. Raporları görüntüleyin ve CSV olarak indirin

---

## ⚙️ Konfigürasyon

`config/app-config.json` dosyasını düzenleyin:

```json
{
  "appName": "Şirket Adı",
  "workingHours": { "start": "08:00", "end": "18:00" },
  "lateThreshold": 15
}
```

---

## 📄 Lisans

MIT Lisansı — Özgürce kullanabilir ve dağıtabilirsiniz.
