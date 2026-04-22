export const tenantScopedOrNull = (tenantId?: string) => {
  if (!tenantId) {
    return {};
  }

  return {
    OR: [
      { tenantId },
      { tenantId: null },
    ],
  };
};

export const exactTenantScope = (tenantId?: string) => {
  if (!tenantId) {
    return {};
  }

  return { tenantId };
};
