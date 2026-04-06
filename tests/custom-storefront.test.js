const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createDom,
  createFakeTimers,
  flushPromises,
  loadScript,
} = require('./helpers/browser-harness');

function createCollector() {
  return {
    contexts: [],
    records: [],
    setContext(context) {
      this.contexts.push(context);
    },
    record(event) {
      this.records.push(event);
    },
  };
}

function loadPreviewDom(options) {
  const dom = createDom({ html: '<!doctype html><html><body><div id="target"></div></body></html>' });

  if (options && options.useFakeTimers) {
    dom.timers = createFakeTimers(dom.window);
  }

  let apiLoadedHandler = null;
  let pageLoadedHandler = null;

  dom.window.Ecwid = {
    OnAPILoaded: {
      add(listener) {
        apiLoadedHandler = listener;
      },
    },
    OnPageLoaded: {
      add(listener) {
        pageLoadedHandler = listener;
      },
    },
  };

  loadScript(dom, 'src/storefront/custom-storefront.js');

  return {
    apiLoadedHandler: function () {
      return apiLoadedHandler;
    },
    dom,
    pageLoadedHandler: function () {
      return pageLoadedHandler;
    },
    preview: dom.window.StorefrontErrorRadarEcwidPreview,
  };
}

test('storefront preview rejects missing mount requirements', async function () {
  const loaded = loadPreviewDom();

  await assert.rejects(function () {
    return loaded.preview.mountPreview({});
  }, /target, store ID, and collector/);
});

test('storefront preview mounts successfully on the happy path', async function () {
  const loaded = loadPreviewDom();
  const target = loaded.dom.window.document.getElementById('target');
  const collector = createCollector();
  const statuses = [];
  let productBrowserArgs = null;

  const mountPromise = loaded.preview.mountPreview({
    collector,
    onStatus(message, type) {
      statuses.push({ message, type });
    },
    storeId: '1003',
    target,
  });

  const script = loaded.dom.window.document.getElementById('storefront-error-radar-ecwid-script');
  loaded.dom.window.xProductBrowser = function () {
    productBrowserArgs = Array.from(arguments);
  };
  script.onload();
  await mountPromise;

  assert.equal(collector.contexts[0].storeId, '1003');
  assert.ok(target.innerHTML.includes('Owner-only preview session'));
  assert.equal(productBrowserArgs[4], 'id=storefront-error-radar-preview-1003');

  loaded.apiLoadedHandler()();
  assert.equal(statuses[statuses.length - 1].type, 'success');

  loaded.pageLoadedHandler()({ type: 'PRODUCT', productId: 77 });
  assert.equal(collector.contexts[collector.contexts.length - 1].pageType, 'product');
  assert.equal(collector.contexts[collector.contexts.length - 1].path, '/products/77');
});

test('storefront preview reuses the existing Ecwid browser when the same store stays live', async function () {
  const loaded = loadPreviewDom();
  const target = loaded.dom.window.document.getElementById('target');
  const collector = createCollector();
  let productBrowserArgs = null;

  loaded.dom.window.xProductBrowser = function () {
    productBrowserArgs = Array.from(arguments);
  };

  // First mount — fire onload BEFORE awaiting to avoid a circular dependency.
  const firstMount = loaded.preview.mountPreview({
    collector,
    storeId: '1003',
    target,
  });
  loaded.dom.window.document.getElementById('storefront-error-radar-ecwid-script').onload();
  await firstMount;

  // Second mount — same store ID, so ensureScript resolves immediately without
  // needing onload to fire again (xProductBrowser exists, currentScriptStoreId matches).
  productBrowserArgs = null;
  await loaded.preview.mountPreview({
    collector,
    storeId: '1003',
    target,
  });

  assert.equal(loaded.dom.window.document.querySelectorAll('#storefront-error-radar-ecwid-script').length, 1);
  assert.equal(productBrowserArgs[4], 'id=storefront-error-radar-preview-1003');
});

test('storefront preview replaces the Ecwid script when the store context changes', async function () {
  const loaded = loadPreviewDom();
  const target = loaded.dom.window.document.getElementById('target');
  const collector = createCollector();

  const firstMount = loaded.preview.mountPreview({
    collector,
    storeId: '1003',
    target,
  });
  loaded.dom.window.xProductBrowser = function () {};
  loaded.dom.window.document.getElementById('storefront-error-radar-ecwid-script').onload();
  await firstMount;

  const secondMount = loaded.preview.mountPreview({
    collector,
    storeId: '9001',
    target,
  });
  const replacementScript = loaded.dom.window.document.getElementById('storefront-error-radar-ecwid-script');

  assert.ok(replacementScript.src.includes('9001'));

  replacementScript.onload();
  await secondMount;
});

test('storefront preview maps cart and order confirmation pages from live Ecwid events', async function () {
  const loaded = loadPreviewDom();
  const target = loaded.dom.window.document.getElementById('target');
  const collector = createCollector();

  const mountPromise = loaded.preview.mountPreview({
    collector,
    storeId: '1003',
    target,
  });

  loaded.dom.window.xProductBrowser = function () {};
  loaded.dom.window.document.getElementById('storefront-error-radar-ecwid-script').onload();
  await mountPromise;

  loaded.pageLoadedHandler()({ type: 'CART' });
  assert.equal(collector.contexts[collector.contexts.length - 1].pageType, 'cart');
  assert.equal(collector.contexts[collector.contexts.length - 1].path, '/cart');

  loaded.pageLoadedHandler()({ type: 'ORDER_CONFIRMATION' });
  assert.equal(collector.contexts[collector.contexts.length - 1].pageType, 'checkout');
  assert.equal(collector.contexts[collector.contexts.length - 1].path, '/checkout');
});

test('storefront preview records script load failures on the unhappy path', async function () {
  const loaded = loadPreviewDom();
  const target = loaded.dom.window.document.getElementById('target');
  const collector = createCollector();
  const statuses = [];

  const mountPromise = loaded.preview.mountPreview({
    collector,
    onStatus(message, type) {
      statuses.push({ message, type });
    },
    storeId: '1003',
    target,
  });

  const script = loaded.dom.window.document.getElementById('storefront-error-radar-ecwid-script');
  script.onerror();

  await assert.rejects(function () {
    return mountPromise;
  }, /could not be loaded/);

  assert.equal(collector.records[0].type, 'resource_error');
  assert.equal(statuses[statuses.length - 1].type, 'error');
});

test('storefront preview records bootstrap timeouts on the unhappy path', function () {
  const loaded = loadPreviewDom({ useFakeTimers: true });
  const target = loaded.dom.window.document.getElementById('target');
  const collector = createCollector();
  const statuses = [];

  loaded.preview.mountPreview({
    collector,
    onStatus(message, type) {
      statuses.push({ message, type });
    },
    storeId: '1003',
    target,
  });

  loaded.dom.timers.runAllTimers();

  assert.equal(collector.records[0].type, 'page_bootstrap_failure');
  assert.equal(statuses[statuses.length - 1].type, 'error');
});

test('storefront preview rejects if Ecwid script loads without xProductBrowser', async function () {
  const loaded = loadPreviewDom();
  const target = loaded.dom.window.document.getElementById('target');
  const collector = createCollector();
  const statuses = [];

  const mountPromise = loaded.preview.mountPreview({
    collector,
    onStatus(message, type) {
      statuses.push({ message, type });
    },
    storeId: '1003',
    target,
  });

  loaded.dom.window.document.getElementById('storefront-error-radar-ecwid-script').onload();

  await assert.rejects(function () {
    return mountPromise;
  }, /xProductBrowser/);

  assert.equal(statuses[0].type, 'info');
});