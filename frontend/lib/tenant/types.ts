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

export interface TenantIntegrationConfig {
  erp: 'mikro';
  defaultCurrency: string;
  warehouse: {
    labels: Record<string, string>;
    includedWarehouseCodes: string[];
    defaultResponsibilityCenter?: string;
  };
}

export interface TenantPublicConfig {
  slug: string;
  status: 'active' | 'inactive';
  branding: TenantBranding;
  features: TenantFeatureFlags;
  integrations: TenantIntegrationConfig;
}
