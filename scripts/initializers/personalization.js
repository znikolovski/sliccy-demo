import { getConfigValue, getHeaders } from '@dropins/tools/lib/aem/configs.js';
import { initializers } from '@dropins/tools/initializer.js';
import { initialize, setEndpoint, setFetchGraphQlHeaders } from '@dropins/storefront-personalization/api.js';
import { initializeDropin } from './index.js';

await initializeDropin(async () => {
  setEndpoint(getConfigValue('commerce-endpoint'));
  setFetchGraphQlHeaders((prev) => ({ ...prev, ...getHeaders('cart') }));
  return initializers.mountImmediately(initialize, {});
})();
