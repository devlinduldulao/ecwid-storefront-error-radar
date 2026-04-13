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

/* ─── Onboarding Guide ─── */

test('onboarding guide is visible by default on first load', async function () {
  const loaded = loadAdminApp({ url: 'https://example.com/public/index.html?storeId=555' });

  await flushPromises();

  const guide = loaded.dom.window.document.getElementById('onboarding-guide');
  assert.notEqual(guide.style.display, 'none');
});

test('onboarding guide can be dismissed and stays hidden', async function () {
  const loaded = loadAdminApp({ url: 'https://example.com/public/index.html?storeId=555' });

  await flushPromises();

  loaded.dom.window.document.getElementById('dismiss-onboarding').click();

  const guide = loaded.dom.window.document.getElementById('onboarding-guide');
  assert.equal(guide.style.display, 'none');
  assert.equal(loaded.dom.window.localStorage.getItem('storefront-error-radar:onboarding-dismissed'), 'true');
});

test('onboarding remains hidden when previously dismissed', async function () {
  const loaded = loadAdminApp({
    preloadedSettings: { 'storefront-error-radar:onboarding-dismissed': true },
    url: 'https://example.com/public/index.html?storeId=555',
  });

  // Need to set the raw string value, not JSON
  loaded.dom.window.localStorage.setItem('storefront-error-radar:onboarding-dismissed', 'true');

  // Reload by re-running init (the loadAdminApp already ran it, so we test pre-state)
  const guide = loaded.dom.window.document.getElementById('onboarding-guide');
  // The init checks localStorage at script load time
  assert.equal(guide.style.display, 'none');
});

test('onboarding can be re-shown via the help button', async function () {
  const loaded = loadAdminApp({ url: 'https://example.com/public/index.html?storeId=555' });

  await flushPromises();

  loaded.dom.window.document.getElementById('dismiss-onboarding').click();
  assert.equal(loaded.dom.window.document.getElementById('onboarding-guide').style.display, 'none');

  loaded.dom.window.document.getElementById('show-onboarding-btn').click();
  assert.notEqual(loaded.dom.window.document.getElementById('onboarding-guide').style.display, 'none');
  assert.equal(loaded.dom.window.localStorage.getItem('storefront-error-radar:onboarding-dismissed'), null);
});

/* ─── Mode Banner ─── */

test('mode banner shows neutral state when no events exist', async function () {
  const loaded = loadAdminApp({ url: 'https://example.com/public/index.html?storeId=555' });

  await flushPromises();

  const banner = loaded.dom.window.document.getElementById('mode-banner');
  assert.ok(banner.classList.contains('ser-mode-banner-neutral') || banner.classList.contains('ser-mode-banner-live'));
  assert.ok(loaded.dom.window.document.getElementById('mode-banner-text').textContent.length > 0);
});

test('mode banner switches to demo state when demo mode is enabled', async function () {
  const loaded = loadAdminApp({ url: 'https://example.com/public/index.html?storeId=555' });

  await flushPromises();

  loaded.dom.window.document.getElementById('fake-preview-toggle').click();
  loaded.dom.timers.runAllTimers();

  const banner = loaded.dom.window.document.getElementById('mode-banner');
  assert.ok(banner.classList.contains('ser-mode-banner-demo'));
  assert.ok(loaded.dom.window.document.getElementById('mode-banner-text').textContent.includes('DEMO'));
});

test('data source badge shows LIVE or DEMO based on mode', async function () {
  const loaded = loadAdminApp({ url: 'https://example.com/public/index.html?storeId=555' });

  await flushPromises();

  const badge = loaded.dom.window.document.getElementById('data-source-badge');
  assert.equal(badge.textContent, 'LIVE');
  assert.ok(badge.classList.contains('ser-data-badge-live'));

  loaded.dom.window.document.getElementById('fake-preview-toggle').click();
  loaded.dom.timers.runAllTimers();

  assert.equal(badge.textContent, 'DEMO');
  assert.ok(badge.classList.contains('ser-data-badge-demo'));
});

/* ─── Session History ─── */

test('session history shows empty state when no sessions are saved', async function () {
  const loaded = loadAdminApp({ url: 'https://example.com/public/index.html?storeId=555' });

  await flushPromises();

  const historyList = loaded.dom.window.document.getElementById('history-list');
  assert.ok(historyList.textContent.includes('No saved sessions yet'));
});

test('save to history persists the current session to localStorage', async function () {
  const loaded = loadAdminApp({ url: 'https://example.com/public/index.html?storeId=555' });

  await flushPromises();

  // Seed some data
  loaded.session.record({
    type: 'js_error',
    severity: 'warning',
    source: 'test',
    message: 'Test error for history',
    path: '/test',
  });

  loaded.dom.window.document.getElementById('save-to-history').click();
  loaded.dom.timers.runAllTimers();

  const raw = loaded.dom.window.localStorage.getItem('storefront-error-radar:ecwid:555:history');
  assert.ok(raw);

  const history = JSON.parse(raw);
  assert.equal(history.length, 1);
  assert.equal(history[0].storeId, '555');
  assert.equal(history[0].mode, 'live');
  assert.equal(history[0].summary.recentSignals, 1);
});

test('save to history shows info when no events exist', async function () {
  const loaded = loadAdminApp({ url: 'https://example.com/public/index.html?storeId=555' });

  await flushPromises();

  loaded.dom.window.document.getElementById('save-to-history').click();
  loaded.dom.timers.runAllTimers();

  assert.ok(loaded.dom.window.document.getElementById('preview-status').textContent.includes('No diagnostic data'));
});

test('session history renders saved entries with LIVE/DEMO labels', async function () {
  const loaded = loadAdminApp({ url: 'https://example.com/public/index.html?storeId=555' });

  await flushPromises();

  // Save a live session
  loaded.session.record({
    type: 'js_error',
    severity: 'warning',
    source: 'test',
    message: 'Live test error',
    path: '/test',
  });
  loaded.dom.window.document.getElementById('save-to-history').click();
  loaded.dom.timers.runAllTimers();

  // Switch to demo and save
  loaded.dom.window.document.getElementById('fake-preview-toggle').click();
  loaded.dom.timers.runAllTimers();
  loaded.dom.window.document.getElementById('save-to-history').click();
  loaded.dom.timers.runAllTimers();

  const historyList = loaded.dom.window.document.getElementById('history-list');
  assert.ok(historyList.textContent.includes('LIVE'));
  assert.ok(historyList.textContent.includes('DEMO'));
});

test('clear history removes all saved sessions', async function () {
  const loaded = loadAdminApp({ url: 'https://example.com/public/index.html?storeId=555' });

  await flushPromises();

  loaded.session.record({
    type: 'js_error',
    severity: 'warning',
    source: 'test',
    message: 'Test error',
    path: '/test',
  });
  loaded.dom.window.document.getElementById('save-to-history').click();
  loaded.dom.timers.runAllTimers();

  loaded.dom.window.document.getElementById('clear-history').click();
  loaded.dom.timers.runAllTimers();

  const raw = loaded.dom.window.localStorage.getItem('storefront-error-radar:ecwid:555:history');
  assert.deepEqual(JSON.parse(raw), []);
  assert.ok(loaded.dom.window.document.getElementById('history-list').textContent.includes('No saved sessions'));
});

test('individual history entries can be removed', async function () {
  const loaded = loadAdminApp({ url: 'https://example.com/public/index.html?storeId=555' });

  await flushPromises();

  // Save two sessions
  loaded.session.record({
    type: 'js_error',
    severity: 'warning',
    source: 'test',
    message: 'Error one',
    path: '/test',
  });
  loaded.dom.window.document.getElementById('save-to-history').click();
  loaded.dom.timers.runAllTimers();

  loaded.session.record({
    type: 'resource_error',
    severity: 'warning',
    source: 'test',
    message: 'Error two',
    path: '/test2',
  });
  loaded.dom.window.document.getElementById('save-to-history').click();
  loaded.dom.timers.runAllTimers();

  const raw = loaded.dom.window.localStorage.getItem('storefront-error-radar:ecwid:555:history');
  const history = JSON.parse(raw);
  assert.equal(history.length, 2);

  // Click the first Remove button
  const removeBtn = loaded.dom.window.document.querySelector('[data-ser-delete-history]');
  assert.ok(removeBtn);
  removeBtn.click();

  const afterDelete = JSON.parse(loaded.dom.window.localStorage.getItem('storefront-error-radar:ecwid:555:history'));
  assert.equal(afterDelete.length, 1);
});

test('history toggle button hides and shows the history list', async function () {
  const loaded = loadAdminApp({ url: 'https://example.com/public/index.html?storeId=555' });

  await flushPromises();

  const historyList = loaded.dom.window.document.getElementById('history-list');
  const toggleBtn = loaded.dom.window.document.getElementById('toggle-history');

  toggleBtn.click();
  assert.equal(historyList.style.display, 'none');
  assert.equal(toggleBtn.textContent, 'Show');

  toggleBtn.click();
  assert.equal(historyList.style.display, '');
  assert.equal(toggleBtn.textContent, 'Hide');
});

test('session history limits entries to 20', async function () {
  const loaded = loadAdminApp({ url: 'https://example.com/public/index.html?storeId=555' });

  await flushPromises();

  // Manually fill with 22 entries to test the cap
  const existingHistory = [];
  for (let i = 0; i < 22; i++) {
    existingHistory.push({
      id: 1000 + i,
      timestamp: new Date(1710000000000 + i * 1000).toISOString(),
      storeId: '555',
      mode: 'live',
      summary: { recentSignals: 1, criticalPathFailures: 0, resourceFailures: 0, slowRequests: 0 },
      eventCount: 1,
      topIssues: [],
    });
  }
  loaded.dom.window.localStorage.setItem('storefront-error-radar:ecwid:555:history', JSON.stringify(existingHistory));

  // Now save one more
  loaded.session.record({
    type: 'js_error',
    severity: 'warning',
    source: 'test',
    message: 'New error',
    path: '/test',
  });
  loaded.dom.window.document.getElementById('save-to-history').click();
  loaded.dom.timers.runAllTimers();

  const result = JSON.parse(loaded.dom.window.localStorage.getItem('storefront-error-radar:ecwid:555:history'));
  assert.equal(result.length, 20);
});