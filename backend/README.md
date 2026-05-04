# OtoOlgun B2B Backend

B2B sipariş sistemi backend API - ERP entegrasyonu ile

## 🚀 Kurulum

### 1. Bağımlılıkları Yükle

```bash
npm install
```

### 2. PostgreSQL Veritabanı Hazırla

```bash
# PostgreSQL'de database oluştur
createdb otoolgunb2b

# Veya psql ile:
psql -U postgres
CREATE DATABASE otoolgunb2b;
\q
```

### 3. Environment Variables

`.env` dosyasını düzenle:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/otoolgunb2b?schema=public"
JWT_SECRET=your-secret-key
USE_MOCK_ERP=true  # Development için true
```

### 4. Prisma Migration

```bash
npx prisma generate
npx prisma migrate dev --name init
```

### 5. İlk Admin Kullanıcı Oluştur

```bash
# Prisma Studio'yu aç
npx prisma studio

# Veya SQL ile:
# Password: admin123 (bcrypt hash'i)
```

## 🎯 Çalıştırma

### Development

```bash
npm run dev
```

API: `http://localhost:5000`

### Production

```bash
npm run build
npm start
```

## 📁 Proje Yapısı

```
src/
├── config/           # Yapılandırma
├── controllers/      # API controller'ları
├── middleware/       # Express middleware'ler
├── prisma/          # Prisma schema
├── routes/          # API routes
├── services/        # İş mantığı
│   ├── mikroMock.service.ts     # Mock ERP (dev)
│   ├── mikro.service.ts         # Gerçek ERP (prod)
│   ├── mikroFactory.service.ts  # Factory pattern
│   ├── pricing.service.ts       # Fiyatlandırma
│   └── sync.service.ts          # Senkronizasyon
├── types/           # TypeScript types
├── utils/           # Yardımcı fonksiyonlar
└── index.ts         # Ana giriş
```

## 🔧 Mock ERP Kullanımı

Development'ta gerçek ERP'ye bağlanmadan çalışmak için:

```env
USE_MOCK_ERP=true
```

Mock service gerçekçi test verileri sağlar:
- 5 kategori
- 14 ürün
- Depo stokları
- Satış geçmişi
- Bekleyen siparişler

## 🔌 Gerçek ERP Bağlantısı

Production'da:

```env
USE_MOCK_ERP=false
ERP_SERVER=your-server-ip
ERP_DATABASE=your-db-name
ERP_USER=your-username
ERP_PASSWORD=your-password
```

## 📊 API Endpoints

### Auth
- POST `/api/auth/login` - Giriş
- GET `/api/auth/me` - Kullanıcı bilgileri

### Admin
- GET `/api/admin/settings` - Ayarları getir
- PUT `/api/admin/settings` - Ayarları güncelle
- POST `/api/admin/sync` - Manuel senkronizasyon
- GET `/api/admin/customers` - Müşteri listesi
- POST `/api/admin/customers` - Müşteri oluştur
- GET `/api/admin/orders/pending` - Bekleyen siparişler
- POST `/api/admin/orders/:id/approve` - Sipariş onayla

### Customer
- GET `/api/products` - Ürün listesi
- GET `/api/products/:id` - Ürün detay
- GET `/api/cart` - Sepet
- POST `/api/cart` - Sepete ekle
- DELETE `/api/cart/:itemId` - Sepetten çıkar
- POST `/api/orders` - Sipariş oluştur
- GET `/api/orders` - Siparişlerim

## 🎨 Fiyatlandırma Sistemi

### Maliyet Hesaplama Yöntemleri

1. **LAST_ENTRY**: Son giriş fiyatı
2. **CURRENT_COST**: Güncel maliyet
3. **DYNAMIC**: Dinamik hesaplama (tarih ve fiyat farklarına göre)

### Fiyat Formülleri

**Faturalı:**
```
fiyat = maliyet × (1 + kar_marjı)
```

**Beyaz:**
```
fiyat = maliyet × (1 + kdv/2)
```

### 8 Farklı Fiyat

4 müşteri tipi × 2 fiyat tipi:
- BAYI (Faturalı, Beyaz)
- PERAKENDE (Faturalı, Beyaz)
- VIP (Faturalı, Beyaz)
- OZEL (Faturalı, Beyaz)

## 🔄 Senkronizasyon

### Otomatik (Cron)

```env
ENABLE_CRON=true
SYNC_CRON_SCHEDULE="0 * * * *"  # Her saat başı
```

### Manuel

```bash
POST /api/admin/sync
```

### Senkronizasyon Adımları

1. Kategorileri çek (ERP'den)
2. Ürünleri çek (ERP'den)
3. Stokları çek (ERP'den)
4. Satış geçmişini çek (son 6 ay)
5. Bekleyen siparişleri çek
6. Fazla stok hesapla
7. Tüm fiyatları hesapla
8. PostgreSQL'e kaydet

## 🛡️ Güvenlik

- JWT Authentication
- bcrypt password hashing
- Rate limiting
- Helmet.js
- CORS yapılandırması
- SQL Injection koruması (Prisma ORM)

## 📝 Lisans

Private - Internal Use Only
