# Frontend Kurulum ve Başlangıç Rehberi

## 🚀 Hızlı Başlangıç

### 1. Bağımlılıkları Yükle

```bash
cd C:\b2b\frontend
npm install
```

### 2. Backend'in Çalıştığından Emin Olun

```bash
# Başka bir terminalde
cd C:\b2b\backend
npm run dev
# Backend: http://localhost:5000
```

### 3. Frontend'i Başlat

```bash
npm run dev
# Frontend: http://localhost:3000
```

### 4. Tarayıcıda Test Et

Otomatik olarak `/login` sayfasına yönlendirileceksiniz.

**Demo Hesaplar:**
- **Admin:** admin@firma.com / admin123
- **Müşteri:** musteri@firma.com / 123456

---

## 📂 Sayfa Yapısı

### 🔓 Auth
- `/login` - Giriş sayfası

### 👤 Customer (Müşteri)
- `/products` - Fazla stoklu ürünler listesi
- `/products/[id]` - Ürün detay ve sepete ekleme
- `/cart` - Sepet yönetimi ve sipariş oluşturma
- `/orders` - Sipariş geçmişi

### 👨‍💼 Admin
- `/dashboard` - Dashboard, istatistikler, hızlı işlemler
- `/settings` - Sistem ayarları (stok hesaplama, maliyet yöntemi)
- `/customers` - Müşteri yönetimi (CRUD)
- `/orders` - Bekleyen siparişleri onaylama/reddetme
- `/categories` - Kategori bazlı fiyatlandırma (kar marjları)

---

## 🎨 Özellikler

### ✅ Customer Features
- Fazla stoklu ürünleri görüntüleme
- Kategoriye göre filtreleme
- Ürün arama
- Faturalı/Beyaz fiyat seçimi
- Sepete ekleme ve miktar güncelleme
- Sipariş oluşturma (stok kontrolü ile)
- Sipariş geçmişi ve durumu takibi

### ✅ Admin Features
- Dashboard ve istatistikler
- Manuel ERP senkronizasyonu
- Yeni müşteri ekleme (ERP cari kodu ile)
- Bekleyen siparişleri onaylama (otomatik ERP'ye yazma)
- Kategori bazlı kar marjı belirleme
- Sistem ayarları yönetimi

---

## 🔐 Authentication

### Login Flow
1. Email/şifre ile giriş
2. JWT token localStorage'a kaydedilir
3. Axios interceptor her request'e token ekler
4. Rol bazlı yönlendirme:
   - Admin → `/dashboard`
   - Customer → `/products`

### Logout
Tüm sayfalarda "Çıkış" butonu var. Token temizlenir ve `/login`'e yönlendirilir.

---

## 🎯 Kullanım Senaryoları

### Senaryo 1: Müşteri Sipariş Verme

1. **Login**: musteri@firma.com / 123456
2. Ürünler sayfası açılır
3. Ürün seç → Detay sayfası
4. Faturalı/Beyaz seç, miktar belirle
5. "Sepete Ekle"
6. Sepet'e git
7. "Siparişi Oluştur"
8. Sipariş PENDING durumuna düşer
9. Admin onayını bekle

### Senaryo 2: Admin Sipariş Onaylama

1. **Login**: admin@firma.com / admin123
2. Dashboard'da "Bekleyen Siparişler"
3. Sipariş detaylarını incele
4. "Onayla ve ERP'ye Gönder"
5. Backend 2 ayrı sipariş yazar (Faturalı/Beyaz)
6. Sipariş APPROVED olur

### Senaryo 3: Admin Müşteri Ekleme

1. Dashboard → "Müşteriler"
2. "+ Yeni Müşteri"
3. Email, şifre, ad, tip, ERP cari kodu gir
4. Müşteri oluştur
5. Müşteri artık login olabilir

### Senaryo 4: Admin Fiyatlandırma

1. Dashboard → "Fiyatlandırma"
2. Kategori seç
3. Her müşteri tipi için kar marjı belirle (%)
4. Kaydet
5. Backend otomatik fiyatları yeniden hesaplar

---

## 🛠️ Development

### Build
```bash
npm run build
```

### Production
```bash
npm start
```

### Lint
```bash
npm run lint
```

---

## 🐛 Sorun Giderme

### "Network Error"
- Backend çalışıyor mu kontrol edin
- `.env.local` dosyasında API_URL doğru mu?

### "401 Unauthorized"
- Token expire olmuş olabilir
- Logout yapıp yeniden login olun

### "Insufficient Stock" Hatası
- Backend'de Mock ERP kullanıyorsanız, mock data'daki stoklar sınırlıdır
- Daha az miktar deneyin veya başka ürün seçin

### Ürünler Gözükmüyor
- Backend'de sync yapıldı mı?
- Admin → Dashboard → "Şimdi Senkronize Et"

---

## 📝 Notlar

### Önemli
- Backend olmadan frontend çalışmaz (API bağımlılığı var)
- İlk kullanımda mutlaka sync yapın (Admin → Dashboard)
- Mock ERP kullanıyorsanız, 14 ürün ve 5 kategori gelir

### Fiyatlandırma
- Beyaz fiyat formülü: `cost × (1 + vat/2)`
- Faturalı fiyat: `cost × (1 + profit margin)`
- Her müşteri tipi farklı fiyat görür

### 2 Ayrı Sipariş Mantığı
- Bir sepette hem faturalı hem beyaz varsa
- Backend ERP'ye 2 AYRI sipariş yazar
- Bu kritik bir business rule!

---

## ✅ Test Checklist

- [ ] Login sayfası çalışıyor
- [ ] Admin dashboard açılıyor
- [ ] Sync butonu çalışıyor
- [ ] Müşteri ekleme çalışıyor
- [ ] Müşteri login olabiliyor
- [ ] Ürünler listeleniyor
- [ ] Ürün detay açılıyor
- [ ] Sepete ekleme çalışıyor
- [ ] Sipariş oluşturma çalışıyor
- [ ] Admin sipariş onaylayabiliyor
- [ ] Fiyatlandırma değiştirme çalışıyor

---

## 🎉 Başarılı Kurulum!

Tüm sayfalar ve özellikler hazır. Backend + Frontend tam entegre çalışıyor!

**Sorular için:** README.md dosyasına bakın
