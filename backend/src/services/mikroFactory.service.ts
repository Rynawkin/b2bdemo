/**
 * ERP Service Factory
 *
 * Development uses mock data. Production can use Mikro or Bayt through
 * ERP_PROVIDER while keeping the old mikroService import surface stable.
 */

import { config } from '../config';
import mikroMockService from './mikroMock.service';
import mikroRealService from './mikro.service';
import baytService from './bayt.service';

const getMikroService = (): typeof mikroRealService => {
  if (config.useMockMikro) {
    console.log('Mock ERP Service kullaniliyor');
    return mikroMockService as unknown as typeof mikroRealService;
  }

  if (config.erpProvider === 'bayt') {
    console.log('Bayt ERP Service kullaniliyor (read-only)');
    return baytService as unknown as typeof mikroRealService;
  }

  console.log('Mikro ERP Service kullaniliyor');
  return mikroRealService;
};

export default getMikroService();
