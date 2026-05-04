export interface TenantBranding {
  companyName: string;
  legalName: string;
  shortName: string;
  customerPortalName: string;
  staffPortalName: string;
  emailFromName: string;
  supportEmail: string;
  supportPhone?: string;
  websiteUrl?: string;
  logoPath: string;
  quoteLogoPath: string;
  loginTitle: string;
  loginSubtitle: string;
  copyrightName: string;
}

export interface TenantFeatureFlags {
  vade: boolean;
  eInvoice: boolean;
  warehouse: boolean;
  supplierPriceLists: boolean;
  customerActivity: boolean;
  diverseyStock: boolean;
  ucarerReports: boolean;
}

export interface TenantWarehouseConfig {
  labels: Record<string, string>;
  includedWarehouseCodes: string[];
  defaultResponsibilityCenter?: string;
}

export interface TenantIntegrationConfig {
  erp: 'generic' | 'mikro';
  defaultCurrency: string;
  warehouse: TenantWarehouseConfig;
}

export interface TenantConfig {
  slug: string;
  status: 'active' | 'inactive';
  domains: string[];
  branding: TenantBranding;
  features: TenantFeatureFlags;
  integrations: TenantIntegrationConfig;
}

export interface TenantPublicConfig {
  slug: string;
  status: TenantConfig['status'];
  branding: TenantBranding;
  features: TenantFeatureFlags;
  integrations: TenantIntegrationConfig;
}
