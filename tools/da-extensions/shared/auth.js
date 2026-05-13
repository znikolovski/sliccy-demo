/**
 * AuthManager — IMS token management and authenticated API request helper
 *
 * Stores the Adobe IMS bearer token received from DA and provides a
 * fetch() wrapper that automatically injects the Authorization header.
 *
 * The IMS token grants access to Adobe enterprise APIs including:
 *   - AEM Assets / Content Hub
 *   - Adobe Commerce (Catalog Service, Cart, etc.)
 *   - Workfront REST API
 *   - Adobe Stock Enterprise
 *   - Adobe Experience Platform
 *   - Any other IMS-protected Adobe service
 *
 * @example
 *   const auth = new AuthManager(token);
 *
 *   // Make an authenticated API call
 *   const res = await auth.fetch('https://stock.adobe.com/Rest/Media/1/Search/Files?search_parameters[words]=sunset');
 *   const data = await res.json();
 */
export default class AuthManager {
  /**
   * @param {string} token - Adobe IMS bearer token from DA handshake
   */
  constructor(token) {
    if (!token) throw new Error('AuthManager: token is required');
    /** @type {string} */
    this._token = token;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Returns the raw IMS bearer token string.
   * @returns {string}
   */
  getToken() {
    return this._token;
  }

  /**
   * Returns true if a non-empty token is stored.
   * Does NOT validate token expiry — the token lifetime is managed by DA.
   * @returns {boolean}
   */
  isAuthenticated() {
    return typeof this._token === 'string' && this._token.length > 0;
  }

  /**
   * Authenticated fetch — wraps the native fetch() API and injects:
   *   Authorization: Bearer <token>
   *   Content-Type: application/json  (only when body is present and no Content-Type set)
   *
   * All other options are passed through unchanged.
   *
   * @param {string | URL | Request} url
   * @param {RequestInit} [opts]
   * @returns {Promise<Response>}
   */
  async fetch(url, opts = {}) {
    const headers = new Headers(opts.headers ?? {});

    if (!headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${this._token}`);
    }

    // Auto-set Content-Type for JSON bodies
    if (opts.body && !headers.has('Content-Type')) {
      if (typeof opts.body === 'string' || opts.body instanceof Object) {
        headers.set('Content-Type', 'application/json');
      }
    }

    return fetch(url, { ...opts, headers });
  }

  /**
   * Convenience helper: POST JSON body with auth headers.
   *
   * @param {string} url
   * @param {object} body - Will be JSON.stringify'd
   * @param {RequestInit} [opts] - Additional fetch options
   * @returns {Promise<Response>}
   */
  async postJSON(url, body, opts = {}) {
    return this.fetch(url, {
      method: 'POST',
      body: JSON.stringify(body),
      ...opts,
    });
  }

  /**
   * Convenience helper: GraphQL query with auth headers.
   *
   * @param {string} endpoint - GraphQL endpoint URL
   * @param {string} query    - GraphQL query string
   * @param {object} [variables]
   * @returns {Promise<{ data: object, errors?: object[] }>}
   */
  async graphql(endpoint, query, variables = {}) {
    const res = await this.postJSON(endpoint, { query, variables });
    if (!res.ok) {
      throw new Error(`GraphQL request failed: ${res.status} ${res.statusText}`);
    }
    return res.json();
  }
}
