'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { defaultTenant, getTenantRequestHeaders } from '@/lib/tenant/resolveTenant';
import { TenantPublicConfig } from '@/lib/tenant/types';

interface TenantContextValue {
  tenant: TenantPublicConfig;
  loading: boolean;
}

const TenantContext = createContext<TenantContextValue>({
  tenant: defaultTenant,
  loading: true,
});

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [tenant, setTenant] = useState<TenantPublicConfig>(defaultTenant);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadTenant = async () => {
      try {
        const response = await fetch('/api/tenant/context', {
          headers: getTenantRequestHeaders(),
        });

        if (!response.ok) {
          throw new Error(`Tenant request failed: ${response.status}`);
        }

        const payload = await response.json();
        if (!cancelled && payload?.tenant) {
          setTenant(payload.tenant);
        }
      } catch (error) {
        console.warn('Tenant context fallback in use:', error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadTenant();

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(
    () => ({
      tenant,
      loading,
    }),
    [tenant, loading]
  );

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export const useTenant = () => useContext(TenantContext);

export default TenantProvider;
