const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createDom,
  createFakeTimers,
  flushPromises,
  loadScript,
  readProjectFile,
} = require('./helpers/browser-harness');

function createSessionStub(windowObject) {
  const listeners = new Set();
  const session = {
    calls: {
      clear: 0,
      setContext: [],
      start: 0,
      updateConfig: [],
    },
    snapshot: {
      config: {},
      context: { pageType: 'catalog', path: '/', storeId: '' },
      summary: {
        recentSignals: 0,
        criticalPathFailures: 0,
        resourceFailures: 0,
        slowRequests: 0,
        uniqueFingerprints: 0,
      },
      events: [],
    },
    clear() {
      this.calls.clear += 1;
      this.snapshot.events = [];
      this.snapshot.summary = {
        recentSignals: 0,
        criticalPathFailures: 0,
        resourceFailures: 0,
        slowRequests: 0,
        uniqueFingerprints: 0,
      };
      this.notify();
    },
    getSnapshot() {
      return JSON.parse(JSON.stringify(this.snapshot));
    },
    notify() {
      const nextSnapshot = this.getSnapshot();
      listeners.forEach(function (listener) {
        listener(nextSnapshot);
      });
    },
    record(event) {
      const nextEvent = Object.assign({
        occurredAt: windowObject.Date.now(),
        pageType: this.snapshot.context.pageType || 'catalog',
        severity: event.severity || 'warning',
      }, event);

      this.snapshot.events.unshift(nextEvent);
      this.snapshot.summary.recentSignals = this.snapshot.events.length;

      if (nextEvent.type === 'critical_path_failure' || nextEvent.severity === 'critical') {
        this.snapshot.summary.criticalPathFailures += 1;
      }

      if (nextEvent.type === 'resource_error') {
        this.snapshot.summary.resourceFailures += 1;
      }

      if (nextEvent.type === 'slow_request') {
        this.snapshot.summary.slowRequests += 1;
      }

      this.notify();
    },
    setContext(context) {
      this.calls.setContext.push(context);
      this.snapshot.context = Object.assign({}, this.snapshot.context, context);
      this.notify();
    },
    start() {
      this.calls.start += 1;
    },
    subscribe(listener) {
      listeners.add(listener);
      listener(this.getSnapshot());
      return function () {
        listeners.delete(listener);
      };
    },
    updateConfig(config) {
      this.calls.updateConfig.push(config);
      this.snapshot.config = Object.assign({}, this.snapshot.config, config);
    },
  };

  return session;
}

function loadAdminApp(options) {
  const dom = createDom({
    html: readProjectFile('public/index.html'),
    url: options && options.url ? options.url : 'https://example.com/public/index.html?storeId=1003',
  });

  if (options && options.preloadedSettings) {
    Object.keys(options.preloadedSettings).forEach(function (storageKey) {
      dom.window.localStorage.setItem(storageKey, JSON.stringify(options.preloadedSettings[storageKey]));
    });
  }

  dom.timers = createFakeTimers(dom.window);
  dom.window.Date.now = function () {
    return 1710000000000;
  };

  const session = createSessionStub(dom.window);
  const previewCalls = [];

  dom.window.StorefrontErrorRadarCore = {
    defaults: {
      captureJs: true,
      captureNetwork: true,
      maxEvents: 80,
      slowRequestMs: 1500,
    },
    createSession() {
      return session;
    },
  };

  dom.window.StorefrontErrorRadarEcwidPreview = {
    mountPreview(payload) {
      previewCalls.push(payload);
      if (options && options.previewRejects) {
        if (typeof payload.onStatus === 'function') {
          payload.onStatus('Preview failed to load.', 'error');
        }
        return Promise.reject(new Error('Preview failed to load.'));
      }

      if (typeof payload.onStatus === 'function') {
        payload.onStatus('Preview live. Use the embedded store to surface runtime issues.', 'success');
      }

      return Promise.resolve();
    },
  };

  if (options && options.ecwidApp) {
    dom.window.EcwidApp = options.ecwidApp;
  }

  dom.window.URL.createObjectURL = function () {
    return 'blob:ser';
  };
  dom.window.URL.revokeObjectURL = function () {};

  let clickedDownload = null;
  dom.window.HTMLAnchorElement.prototype.click = function () {
    clickedDownload = {
      download: this.download,
      href: this.href,
    };
  };

  loadScript(dom, 'src/admin/app.js');

  return {
    clickedDownload() {
      return clickedDownload;
    },
    dom,
    previewCalls,
    session,
  };
}

test('admin app initializes in standalone mode and mounts the live preview', async function () {
  const loaded = loadAdminApp({ url: 'https://example.com/public/index.html?storeId=555' });

  await flushPromises();

  assert.equal(loaded.session.calls.start, 1);
  assert.equal(loaded.dom.window.document.getElementById('store-identity').textContent, '555');
  assert.equal(loaded.dom.window.document.getElementById('mode-value').textContent, 'Standalone preview');
  assert.equal(loaded.previewCalls[0].storeId, '555');
});

test('admin app reads Ecwid iframe payload when available', async function () {
  const loaded = loadAdminApp({
    ecwidApp: {
      init() {
        return {
          getPayload(callback) {
            callback({ store_id: 9001 });
          },
        };
      },
      setSize() {},
    },
  });

  await flushPromises();

  assert.equal(loaded.dom.window.document.getElementById('store-identity').textContent, '9001');
  assert.equal(loaded.dom.window.document.getElementById('mode-value').textContent, 'Ecwid admin iframe');
});

test('admin app loads persisted settings for the live Ecwid store context', async function () {
  const loaded = loadAdminApp({
    ecwidApp: {
      init() {
        return {
          getPayload(callback) {
            callback({ store_id: 9001 });
          },
        };
      },
    },
    preloadedSettings: {
      'storefront-error-radar:ecwid:9001:settings': {
        captureJs: false,
        captureNetwork: false,
        demoPreviewEnabled: false,
        maxEvents: 120,
        slowRequestMs: 900,
      },
    },
  });

  await flushPromises();

  assert.equal(loaded.dom.window.document.getElementById('capture-js').checked, false);
  assert.equal(loaded.dom.window.document.getElementById('capture-network').checked, false);
  assert.equal(loaded.dom.window.document.getElementById('max-events').value, '120');
  assert.equal(loaded.dom.window.document.getElementById('slow-request-ms').value, '900');
  assert.equal(loaded.previewCalls[0].storeId, '9001');
});

test('admin app saves clamped settings on the happy path', async function () {
  const loaded = loadAdminApp({ url: 'https://example.com/public/index.html?storeId=555' });

  await flushPromises();

  loaded.dom.window.document.getElementById('capture-js').checked = false;
  loaded.dom.window.document.getElementById('max-events').value = '999';
  loaded.dom.window.document.getElementById('slow-request-ms').value = '10';
  loaded.dom.window.document.getElementById('settings-form').dispatchEvent(new loaded.dom.window.Event('submit', {
    bubbles: true,
    cancelable: true,
  }));

  const saved = JSON.parse(loaded.dom.window.localStorage.getItem('storefront-error-radar:ecwid:555:settings'));

  assert.equal(saved.captureJs, false);
  assert.equal(saved.maxEvents, 200);
  assert.equal(saved.slowRequestMs, 300);
  assert.equal(loaded.session.calls.updateConfig.at(-1).maxEvents, 200);
});

test('admin app toggles demo preview and seeds fake incidents', async function () {
  const loaded = loadAdminApp({ url: 'https://example.com/public/index.html?storeId=555' });

  await flushPromises();

  loaded.dom.window.document.getElementById('fake-preview-toggle').click();
  loaded.dom.timers.runAllTimers();

  assert.ok(loaded.dom.window.document.getElementById('preview-shell').textContent.includes('Demo preview with fake merchant data'));
  assert.equal(loaded.dom.window.document.getElementById('fake-preview-toggle').textContent, 'Use Live Preview');
  assert.ok(Number(loaded.dom.window.document.getElementById('summary-total-signals').textContent) > 0);

  const saved = JSON.parse(loaded.dom.window.localStorage.getItem('storefront-error-radar:ecwid:555:settings'));
  assert.equal(saved.demoPreviewEnabled, true);
});

test('admin app switches back from demo mode to the live Ecwid preview', async function () {
  const loaded = loadAdminApp({ url: 'https://example.com/public/index.html?storeId=555' });

  await flushPromises();

  loaded.dom.window.document.getElementById('fake-preview-toggle').click();
  loaded.dom.timers.runAllTimers();
  loaded.dom.window.document.getElementById('fake-preview-toggle').click();
  await flushPromises();

  assert.equal(loaded.dom.window.document.getElementById('fake-preview-toggle').textContent, 'Use Demo Preview');
  assert.equal(loaded.previewCalls.length, 2);
  assert.equal(loaded.previewCalls[1].storeId, '555');

  const saved = JSON.parse(loaded.dom.window.localStorage.getItem('storefront-error-radar:ecwid:555:settings'));
  assert.equal(saved.demoPreviewEnabled, false);
});

test('admin app reloads the live Ecwid preview on demand', async function () {
  const loaded = loadAdminApp({ url: 'https://example.com/public/index.html?storeId=555' });

  await flushPromises();
  loaded.dom.window.document.getElementById('reload-preview').click();
  await flushPromises();

  assert.equal(loaded.previewCalls.length, 2);
  assert.equal(loaded.previewCalls[1].storeId, '555');
});

test('admin app clears seeded incidents on the happy path', async function () {
  const loaded = loadAdminApp({ url: 'https://example.com/public/index.html?storeId=555' });

  await flushPromises();
  loaded.dom.window.document.getElementById('fake-preview-toggle').click();
  loaded.dom.timers.runAllTimers();
  loaded.dom.window.document.getElementById('clear-session').click();

  assert.equal(loaded.dom.window.document.getElementById('summary-total-signals').textContent, '0');
  assert.ok(loaded.dom.window.document.getElementById('preview-status').textContent.includes('Diagnostic session cleared'));
});

test('admin app exports the session JSON with the store-specific filename', async function () {
  const loaded = loadAdminApp({ url: 'https://example.com/public/index.html?storeId=555' });

  await flushPromises();
  loaded.dom.window.document.getElementById('export-session').click();
  loaded.dom.timers.runAllTimers();

  assert.equal(loaded.clickedDownload().download, 'storefront-error-radar-555.json');
  assert.equal(loaded.clickedDownload().href, 'blob:ser');
});

test('admin app shows an unhappy-path error when no store ID is available', async function () {
  const loaded = loadAdminApp({
    ecwidApp: {
      init() {
        return {
          getPayload(callback) {
            callback({});
          },
        };
      },
    },
    url: 'https://example.com/public/index.html',
  });

  await flushPromises();

  assert.equal(loaded.previewCalls.length, 0);
  assert.ok(loaded.dom.window.document.getElementById('preview-status').textContent.includes('store ID is required'));
});

test('admin app surfaces live preview mount failures on the unhappy path', async function () {
  const loaded = loadAdminApp({
    previewRejects: true,
    url: 'https://example.com/public/index.html?storeId=555',
  });

  await flushPromises();

  assert.equal(loaded.previewCalls.length, 1);
  assert.ok(loaded.dom.window.document.getElementById('preview-status').textContent.includes('Preview failed to load'));
});