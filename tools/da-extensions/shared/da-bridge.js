/**
 * DaBridge — DA postMessage protocol handler
 *
 * Wraps the MessageChannel port that DA provides during the Library handshake
 * and exposes a clean async API for all supported DA→plugin actions.
 *
 * Supported outbound actions (plugin → DA):
 *   sendText(text)       — insert plain text at cursor
 *   sendHTML(html)       — insert HTML markup at cursor
 *   getSelection()       — returns Promise<string> of current selection HTML
 *   closeLibrary()       — dismiss the Library panel
 *   setHash(path)        — update the DA URL hash
 *   setHref(url)         — navigate DA to a new URL
 *
 * DA → plugin inbound messages are handled in handleMessage().
 * index.js routes all port messages to bridge.handleMessage() after the
 * initial handshake is complete.
 *
 * @example
 *   const bridge = new DaBridge(port);
 *
 *   // Insert a product-details block
 *   bridge.sendHTML('<table><tr><th>product-details</th></tr><tr><td>SKU123</td></tr></table>');
 *
 *   // Read the current selection
 *   const sel = await bridge.getSelection();
 */
export default class DaBridge {
  /**
   * @param {MessagePort} port - The MessageChannel port from the DA handshake
   */
  constructor(port) {
    if (!port) throw new Error('DaBridge: port is required');

    /** @type {MessagePort} */
    this._port = port;

    /**
     * Pending getSelection promises.
     * Each entry: { resolve, reject, timeoutId }
     * We keep an array in case multiple getSelection calls are in flight.
     * @type {Array<{ resolve: Function, reject: Function, timeoutId: number }>}
     */
    this._selectionQueue = [];

    // index.js calls handleMessage for every port message received after
    // the initial token handshake. We do NOT call port.onmessage here to
    // avoid competing with the shell's own listener.
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Insert plain text at the current cursor position in the DA editor.
   * @param {string} text
   */
  sendText(text) {
    this._post({ action: 'sendText', details: text });
  }

  /**
   * Insert HTML markup at the current cursor position in the DA editor.
   * @param {string} html
   */
  sendHTML(html) {
    this._post({ action: 'sendHTML', details: html });
  }

  /**
   * Request the currently selected HTML from the DA editor.
   * Resolves with the selection HTML string.
   * Rejects after 5 s if DA does not respond.
   *
   * @returns {Promise<string>}
   */
  getSelection() {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        // Remove this entry from the queue
        this._selectionQueue = this._selectionQueue.filter((e) => e.resolve !== resolve);
        reject(new Error('DaBridge.getSelection timed out after 5 s'));
      }, 5000);

      this._selectionQueue.push({ resolve, reject, timeoutId });
      this._post({ action: 'getSelection' });
    });
  }

  /**
   * Dismiss the DA Library panel.
   */
  closeLibrary() {
    this._post({ action: 'closeLibrary' });
  }

  /**
   * Update the DA URL hash fragment.
   * @param {string} path - Hash path, e.g. '/my-tool'
   */
  setHash(path) {
    this._post({ action: 'setHash', details: path });
  }

  /**
   * Navigate the DA application to a new URL.
   * @param {string} url - Full URL
   */
  setHref(url) {
    this._post({ action: 'setHref', details: url });
  }

  // ---------------------------------------------------------------------------
  // Internal — called by index.js for every port message after handshake
  // ---------------------------------------------------------------------------

  /**
   * Route inbound port messages to the appropriate handler.
   * Called by index.js on every `port.onmessage` event.
   *
   * @param {MessageEvent} event
   */
  handleMessage(event) {
    const data = event?.data;
    if (!data) return;

    switch (data.action) {
      case 'sendSelection':
        this._resolveSelection(data.details ?? '');
        break;

      default:
        // Future DA actions can be handled here
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * @param {object} message
   */
  _post(message) {
    try {
      this._port.postMessage(message);
    } catch (err) {
      console.error('[DaBridge] postMessage failed:', err, message);
    }
  }

  /**
   * Resolve the oldest pending getSelection promise.
   * @param {string} html
   */
  _resolveSelection(html) {
    const entry = this._selectionQueue.shift();
    if (!entry) {
      console.warn('[DaBridge] Received sendSelection but no pending getSelection call.');
      return;
    }
    clearTimeout(entry.timeoutId);
    entry.resolve(html);
  }
}
