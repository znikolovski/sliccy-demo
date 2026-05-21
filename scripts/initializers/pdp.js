import { getConfigValue, getHeaders } from '@dropins/tools/lib/aem/configs.js';
import { initializers } from '@dropins/tools/initializer.js';
import { Image, provider as UI } from '@dropins/tools/components.js';
import {
  initialize,
  setEndpoint,
  setFetchGraphQlHeaders,
  fetchProductData,
} from '@dropins/storefront-pdp/api.js';
import { isAemAssetsEnabled, tryGenerateAemAssetsOptimizedUrl } from '@dropins/tools/lib/aem/assets.js';
import { initializeDropin } from './index.js';
import {
  fetchPlaceholders,
  commerceEndpointWithQueryParams,
  getOptionsUIDsFromUrl,
  getProductSku,
  loadErrorPage,
  preloadFile,
} from '../commerce.js';
import { getMetadata } from '../aem.js';

export const IMAGES_SIZES = {
  width: 960,
  height: 1191,
};

/**
 * Extracts the main product image URL from JSON-LD or meta tags
 * @returns {string|null} The image URL or null if not found
 */
function extractMainImageUrl() {
  // Cache DOM query to avoid repeated lookups
  const jsonLdScript = document.querySelector('script[type="application/ld+json"]');

  if (!jsonLdScript?.textContent) {
    return getMetadata('og:image') || getMetadata('image');
  }

  try {
    const jsonLd = JSON.parse(jsonLdScript.textContent);

    // Verify this is product structured data before extracting image
    if (jsonLd?.['@type'] === 'Product' && jsonLd?.image) {
      return jsonLd.image;
    }

    return getMetadata('og:image') || getMetadata('image');
  } catch (error) {
    console.debug('Failed to parse JSON-LD:', error);
    return getMetadata('og:image') || getMetadata('image');
  }
}

/**
 * Preloads PDP Dropins assets for optimal performance
 */
function preloadPDPAssets() {
  // Preload PDP Dropins assets
  preloadFile('/scripts/__dropins__/storefront-pdp/api.js', 'script');
  preloadFile('/scripts/__dropins__/storefront-pdp/render.js', 'script');
  preloadFile('/scripts/__dropins__/storefront-pdp/containers/ProductHeader.js', 'script');
  preloadFile('/scripts/__dropins__/storefront-pdp/containers/ProductPrice.js', 'script');
  preloadFile('/scripts/__dropins__/storefront-pdp/containers/ProductShortDescription.js', 'script');
  preloadFile('/scripts/__dropins__/storefront-pdp/containers/ProductOptions.js', 'script');
  preloadFi