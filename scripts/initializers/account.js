import { getConfigValue, getHeaders } from '@dropins/tools/lib/aem/configs.js';
import { initializers } from '@dropins/tools/initializer.js';
import { initialize, setEndpoint, setFetchGraphQlHeaders } from '@dropins/storefront-account/api.js';
import { initializeDropin } from './index.js';
import { fetchPlaceholders } from '../commerce.js';

await initializeDropin(async () => {
  setEndpoint(getConfigValue('commerce-endpoint'));
  setFetchGraphQlHeaders((prev) => ({ ...prev, ...getHeaders('account') }));

  const labels = await fetchPlaceholders('placeholders/account.json');
  const langDefinitions = {
    default: {
      ...labels,
    },
  };

  return initializers.mountImmediately(initialize, { langDefinitions });
})();
