import dotenv from 'dotenv';

dotenv.config();

const frontendUrls = Array.from(
  new Set(
    [process.env.FRONTEND_URL, process.env.FRONTEND_URLS]
      .filter(Boolean)
      .flatMap((value) =>
        String(value)
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      )
  )
);

export const config = {
  // Server
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),

  // Database
  databaseUrl: process.env.DATABASE_URL!,

  // Redis
  redisUrl: process.env.REDIS_URL || 'redis://127.0.0.1:6379',

  // JWT
  jwtSecret: process.env.JWT_SECRET!,
  jwtExpiresIn: '30d', // 30 gün - Uzun sync işlemleri için

  // External ERP
  erpProvider: (process.env.ERP_PROVIDER || 'mikro').toLowerCase(),
  useMockMikro: (process.env.USE_MOCK_ERP || process.env.USE_MOCK_MIKRO) === 'true',
  mikro: {
    server: process.env.ERP_SERVER || process.env.MIKRO_SERVER || '',
    database: process.env.ERP_DATABASE || process.env.MIKRO_DATABASE || '',
    user: process.env.ERP_USER || process.env.MIKRO_USER || '',
    password: process.env.ERP_PASSWORD || process.env.MIKRO_PASSWORD || '',
    port: parseInt(process.env.ERP_PORT || process.env.MIKRO_PORT || '1433', 10),
    requestTimeout: parseInt(process.env.ERP_REQUEST_TIMEOUT_MS || process.env.MIKRO_REQUEST_TIMEOUT_MS || '120000', 10),
    connectionTimeout: parseInt(process.env.ERP_CONNECTION_TIMEOUT_MS || process.env.MIKRO_CONNECTION_TIMEOUT_MS || '30000', 10),
    options: {
      encrypt: false,
      trustServerCertificate: true,
    },
  },

  // CORS
  frontendUrl: frontendUrls[0] || 'http://localhost:3000',
  frontendUrls: frontendUrls.length > 0 ? frontendUrls : ['http://localhost:3000'],

  // Cron
  enableCron: process.env.ENABLE_CRON === 'true',
  cronTimezone: process.env.CRON_TIMEZONE || 'Europe/Istanbul',
  syncCronSchedule: process.env.SYNC_CRON_SCHEDULE || '0 18 * * *', // Daily at 18:00
  priceSyncCronSchedule: process.env.PRICE_SYNC_CRON_SCHEDULE || '0 18 * * *',
  quoteSyncCronSchedule: process.env.QUOTE_SYNC_CRON_SCHEDULE || '0 18 * * *', // Her gün 18:00
  vadeSyncCronSchedule: process.env.VADE_SYNC_CRON_SCHEDULE || '0 * * * *',
  vadeReminderCronSchedule: process.env.VADE_REMINDER_CRON_SCHEDULE || '0 * * * *',
  marginReportCronSchedule: process.env.MARGIN_REPORT_CRON_SCHEDULE || '0 3 * * *',
  productComplementCronSchedule: process.env.PRODUCT_COMPLEMENT_CRON_SCHEDULE || '30 2 * * *',
  analyticsCleanupCronSchedule: process.env.ANALYTICS_CLEANUP_CRON_SCHEDULE || '45 2 * * *',
  analyticsRetentionDays: parseInt(process.env.ANALYTICS_RETENTION_DAYS || '180', 10),
  einvoiceAutoImportEnabled: process.env.EINVOICE_AUTO_IMPORT_ENABLED === 'true',
  einvoiceAutoImportCronSchedule: process.env.EINVOICE_AUTO_IMPORT_CRON_SCHEDULE || '*/20 * * * *',
  orderTrackingKioskSyncEnabled: process.env.ORDER_TRACKING_KIOSK_SYNC_ENABLED !== 'false',
  orderTrackingKioskSyncCronSchedule: process.env.ORDER_TRACKING_KIOSK_SYNC_CRON_SCHEDULE || '*/10 * * * *',

  // App
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
} as const;

// Validate required environment variables
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

export default config;
