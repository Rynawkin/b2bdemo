import { TenantConfig, TenantPublicConfig } from './types';

const splitCsv = (value?: string): string[] =>
  String(value || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

const unique = (values: string[]): string[] => Array.from(new Set(values.map((item) => item.toLowerCase())));

const DEFAULT_TENANT_SLUG = process.env.DEFAULT_TENANT_SLUG || 'otoolgun';

const platformTenant: TenantConfig = {
  slug: 'platform',
  status: 'active',
  domains: unique([
    ...splitCsv(process.env.TENANT_PLATFORM_DOMAINS),
    'localhost',
    '127.0.0.1',
  ]),
  branding: {
    companyName: 'B2B Platform',
    legalName: 'B2B Platform',
    shortName: 'B2B Platform',
    customerPortalName: 'B2B Musteri Portali',
    staffPortalName: 'B2B Yonetim Portali',
    emailFromName: 'B2B Platform',
    supportEmail: process.env.DEFAULT_SUPPORT_EMAIL || 'support@example.com',
    supportPhone: process.env.DEFAULT_SUPPORT_PHONE || '',
    websiteUrl: process.env.DEFAULT_WEBSITE_URL || '',
    logoPath: '/logo.png',
    quoteLogoPath: '/quote-logo.png',
    loginTitle: 'B2B Platform',
    loginSubtitle: 'Siparis ve operasyon yonetimi',
    copyrightName: 'B2B Platform',
  },
  features: {
    vade: true,
    eInvoice: true,
    warehouse: true,
    supplierPriceLists: true,
    customerActivity: true,
    diverseyStock: false,
    ucarerReports: false,
  },
  integrations: {
    erp: 'generic',
    defaultCurrency: 'TRY',
    warehouse: {
      labels: {
        '1': 'Merkez',
      },
      includedWarehouseCodes: ['1'],
      defaultResponsibilityCenter: process.env.ERP_SORMERK || process.env.MIKRO_SORMERK || '',
    },
  },
};

const otoOlgunTenant: TenantConfig = {
  slug: 'otoolgun',
  status: 'active',
  domains: unique([
    ...splitCsv(process.env.TENANT_OTOOLGUN_DOMAINS),
    'otoolgun.com',
    'www.otoolgun.com',
  ]),
  branding: {
    companyName: 'OtoOlgun',
    legalName: 'OTOOLGUN',
    shortName: 'OtoOlgun',
    customerPortalName: 'OtoOlgun B2B',
    staffPortalName: 'OtoOlgun Portal',
    emailFromName: 'OtoOlgun B2B',
    supportEmail: process.env.BREVO_SENDER_EMAIL || 'noreply@otoolgun.com',
    supportPhone: '',
    websiteUrl: 'https://www.otoolgun.com',
    logoPath: '/logo.png',
    quoteLogoPath: '/quote-logo.png',
    loginTitle: 'OtoOlgun',
    loginSubtitle: 'B2B Siparis Sistemi',
    copyrightName: 'OtoOlgun',
  },
  features: {
    vade: true,
    eInvoice: true,
    warehouse: false,
    supplierPriceLists: true,
    customerActivity: true,
    diverseyStock: false,
    ucarerReports: false,
  },
  integrations: {
    erp: 'generic',
    defaultCurrency: 'TRY',
    warehouse: {
      labels: {
        '1': 'Merkez',
      },
      includedWarehouseCodes: ['1'],
      defaultResponsibilityCenter: process.env.ERP_SORMERK || process.env.MIKRO_SORMERK || '',
    },
  },
};

const tenantCatalog: Record<string, TenantConfig> = {
  [platformTenant.slug]: platformTenant,
  [otoOlgunTenant.slug]: otoOlgunTenant,
};

export const getTenantCatalog = (): Record<string, TenantConfig> => tenantCatalog;

export const getDefaultTenantSlug = (): string =>
  tenantCatalog[DEFAULT_TENANT_SLUG] ? DEFAULT_TENANT_SLUG : platformTenant.slug;

export const getTenantConfigBySlug = (slug?: string | null): TenantConfig => {
  const normalizedSlug = String(slug || '').trim().toLowerCase();
  if (normalizedSlug && tenantCatalog[normalizedSlug]) {
    return tenantCatalog[normalizedSlug];
  }

  return tenantCatalog[getDefaultTenantSlug()];
};

export const getTenantConfigByHost = (host?: string | null): TenantConfig => {
  const normalizedHost = String(host || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/:\d+$/, '');

  if (!normalizedHost) {
    return getTenantConfigBySlug();
  }

  const found = Object.values(tenantCatalog).find((tenant) =>
    tenant.domains.some((domain) => domain === normalizedHost)
  );

  return found || getTenantConfigBySlug();
};

export const toTenantPublicConfig = (tenant: TenantConfig): TenantPublicConfig => ({
  slug: tenant.slug,
  status: tenant.status,
  branding: tenant.branding,
  features: tenant.features,
  integrations: tenant.integrations,
});

export const getDefaultTenantPublicConfig = (): TenantPublicConfig =>
  toTenantPublicConfig(getTenantConfigBySlug(getDefaultTenantSlug()));
