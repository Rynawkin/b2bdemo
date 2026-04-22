import { Router } from 'express';
import { getDefaultTenantPublicConfig, toTenantPublicConfig } from '../tenant/catalog';

const router = Router();

router.get('/context', (req, res) => {
  const tenant = req.tenant ? toTenantPublicConfig(req.tenant) : getDefaultTenantPublicConfig();

  res.json({
    tenant,
  });
});

export default router;
