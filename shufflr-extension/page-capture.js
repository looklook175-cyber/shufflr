// Shufflr — MAIN-world CMS request observer (Max)
// Observe-only: never modifies requests or responses.

(function () {
  if (window.__shufflrPageCmsCapture) return;
  window.__shufflrPageCmsCapture = true;

  function urlHasShowIdParam(url) {
    try {
      return new URL(url, location.origin).searchParams.has('pf[show.id]');
    } catch {
      return false;
    }
  }

  function serializeHeaders(headers) {
    if (!headers) return null;

    const out = {};
    if (typeof Headers !== 'undefined' && headers instanceof Headers) {
      headers.forEach((value, key) => {
        out[key] = value;
      });
      return out;
    }

    if (Array.isArray(headers)) {
      for (const [key, val] of headers) {
        out[key] = val;
      }
      return out;
    }

    if (typeof headers === 'object') {
      for (const key of Object.keys(headers)) {
        out[key] = headers[key];
      }
      return out;
    }

    return null;
  }

  function reportCmsRequest(url, headers) {
    if (typeof url !== 'string') return;
    if (!url.includes('/cms/collections/') || !urlHasShowIdParam(url)) return;
    if (!/^https:\/\/default\.[^/]+\.api\.hbomax\.com\/cms\/collections\/\d+\?/.test(url)) return;

    window.postMessage(
      {
        source: 'shufflr-cms-capture',
        url,
        headers: serializeHeaders(headers),
      },
      '*'
    );
  }

  const origFetch = window.fetch;
  window.fetch = function (input, init) {
    try {
      const url = typeof input === 'string' ? input : input?.url;
      const headers = init?.headers || (input instanceof Request ? input.headers : null);
      reportCmsRequest(url, headers);
    } catch {
      /* observe-only — never block the request */
    }
    return origFetch.apply(this, arguments);
  };

  const origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url) {
    try {
      if (typeof url === 'string') reportCmsRequest(url, null);
    } catch {
      /* observe-only — never block the request */
    }
    return origOpen.apply(this, arguments);
  };
})();
