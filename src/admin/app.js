(function (global) {
  'use strict';

  var core = global.StorefrontErrorRadarCore;
  var preview = global.StorefrontErrorRadarEcwidPreview;

  if (!core || !preview) {
    return;
  }

  var refs = {
    settingsForm: document.getElementById('settings-form'),
    captureJs: document.getElementById('capture-js'),
    captureNetwork: document.getElementById('capture-network'),
    maxEvents: document.getElementById('max-events'),
    slowRequestMs: document.getElementById('slow-request-ms'),
    saveStatus: document.getElementById('save-status'),
    previewStatus: document.getElementById('preview-status'),
    previewShell: document.getElementById('preview-shell'),
    incidentsBody: document.getElementById('incidents-body'),
    totalSignals: document.getElementById('summary-total-signals'),
    criticalSignals: document.getElementById('summary-critical-signals'),
    resourceFailures: document.getElementById('summary-resource-failures'),
    slowRequests: document.getElementById('summary-slow-requests'),
    sessionNote: document.getElementById('session-note'),
    storeIdentity: document.getElementById('store-identity'),
    modeValue: document.getElementById('mode-value'),
    storageValue: document.getElementById('storage-value'),
    currentPageValue: document.getElementById('current-page-value'),
    fakePreviewToggle: document.getElementById('fake-preview-toggle'),
    reloadPreview: document.getElementById('reload-preview'),
    clearSession: document.getElementById('clear-session'),
    exportSession: document.getElementById('export-session')
  };

  var state = {
    context: null,
    settings: null,
    demoTimers: []
  };
  var resizeTimer = null;
  var session = core.createSession(core.defaults);

  session.subscribe(renderSnapshot);
  session.start();

  init();

  function init() {
    bindUi();
    getEcwidContext().then(function (context) {
      state.context = context;
      state.settings = loadSettings(context.storeId);
      renderContext(context);
      renderSettings(state.settings);
      session.updateConfig(state.settings);
      session.setContext({
        pageType: 'catalog',
        path: '/',
        storeId: context.storeId
      });
      mountPreview();
      showSaveStatus('Settings are stored in this browser for store ' + context.storeId + '.', 'info');
    }).catch(function (error) {
      showSaveStatus(error.message, 'error');
    });
  }

  function bindUi() {
    refs.settingsForm.addEventListener('submit', function (event) {
      event.preventDefault();
      state.settings = readSettingsFromForm();
      saveSettings(state.context.storeId, state.settings);
      session.updateConfig(state.settings);
      updateDemoToggle();
      showSaveStatus('Owner diagnostics settings updated for this browser.', 'success');
      scheduleResize();
    });

    refs.fakePreviewToggle.addEventListener('click', function () {
      toggleDemoPreview();
    });

    refs.reloadPreview.addEventListener('click', function () {
      if (state.settings && state.settings.demoPreviewEnabled) {
        session.clear();
      }

      mountPreview();
    });

    refs.clearSession.addEventListener('click', function () {
      session.clear();
      showPreviewStatus('Diagnostic session cleared. Start interacting with the preview again.', 'info');
    });

    refs.exportSession.addEventListener('click', function () {
      exportSnapshot();
    });
  }

  function getEcwidContext() {
    return new Promise(function (resolve) {
      if (!global.EcwidApp || typeof global.EcwidApp.init !== 'function') {
        resolve({
          mode: 'standalone-preview',
          storeId: getQueryValue('storeId') || '1003'
        });
        return;
      }

      var app = global.EcwidApp.init({ appId: 'storefront-error-radar' });

      if (!app || typeof app.getPayload !== 'function') {
        resolve({
          mode: 'standalone-preview',
          storeId: getQueryValue('storeId') || '1003'
        });
        return;
      }

      app.getPayload(function (payload) {
        resolve({
          mode: 'ecwid-admin',
          storeId: String(payload.store_id || getQueryValue('storeId') || '')
        });
      });
    });
  }

  function getQueryValue(name) {
    var params = new URLSearchParams(global.location.search);
    return params.get(name);
  }

  function getStorageKey(storeId) {
    return 'storefront-error-radar:ecwid:' + storeId + ':settings';
  }

  function getDefaultSettings() {
    return {
      captureJs: true,
      captureNetwork: true,
      demoPreviewEnabled: false,
      maxEvents: 80,
      slowRequestMs: 1500
    };
  }

  function loadSettings(storeId) {
    var defaults = getDefaultSettings();

    try {
      var raw = global.localStorage.getItem(getStorageKey(storeId));
      return raw ? Object.assign({}, defaults, JSON.parse(raw)) : defaults;
    } catch (error) {
      return defaults;
    }
  }

  function saveSettings(storeId, settings) {
    try {
      global.localStorage.setItem(getStorageKey(storeId), JSON.stringify(settings));
    } catch (error) {
      showSaveStatus('Could not persist settings in local storage for this browser.', 'error');
    }
  }

  function renderContext(context) {
    refs.storeIdentity.textContent = context.storeId || 'Store ID required';
    refs.modeValue.textContent = context.mode === 'ecwid-admin' ? 'Ecwid admin iframe' : 'Standalone preview';
    refs.storageValue.textContent = 'Browser local storage only';
    refs.currentPageValue.textContent = 'catalog';
    refs.sessionNote.textContent = 'This app does not watch live visitors. It only records issues while you use the embedded preview. You can switch to a built-in demo preview when you want to simulate the dashboard with fake data.';
    updateDemoToggle();
    scheduleResize();
  }

  function renderSettings(settings) {
    refs.captureJs.checked = Boolean(settings.captureJs);
    refs.captureNetwork.checked = Boolean(settings.captureNetwork);
    refs.maxEvents.value = settings.maxEvents;
    refs.slowRequestMs.value = settings.slowRequestMs;
    updateDemoToggle();
  }

  function readSettingsFromForm() {
    return {
      captureJs: refs.captureJs.checked,
      captureNetwork: refs.captureNetwork.checked,
      demoPreviewEnabled: Boolean(state.settings && state.settings.demoPreviewEnabled),
      maxEvents: clampInput(refs.maxEvents.value, 80, 10, 200),
      slowRequestMs: clampInput(refs.slowRequestMs.value, 1500, 300, 10000)
    };
  }

  function clampInput(value, fallback, minimum, maximum) {
    var numeric = Number(value);

    if (!Number.isFinite(numeric)) {
      return fallback;
    }

    return Math.max(minimum, Math.min(maximum, Math.round(numeric)));
  }

  function updateDemoToggle() {
    var isDemo = Boolean(state.settings && state.settings.demoPreviewEnabled);

    refs.fakePreviewToggle.textContent = isDemo ? 'Use Live Preview' : 'Use Demo Preview';
    refs.fakePreviewToggle.classList.toggle('ser-button-primary', isDemo);
    refs.fakePreviewToggle.classList.toggle('ser-button-secondary', !isDemo);
    refs.fakePreviewToggle.setAttribute('aria-pressed', isDemo ? 'true' : 'false');
  }

  function toggleDemoPreview() {
    state.settings = Object.assign({}, state.settings || getDefaultSettings(), {
      demoPreviewEnabled: !Boolean(state.settings && state.settings.demoPreviewEnabled)
    });

    saveSettings(state.context ? state.context.storeId : 'preview', state.settings);
    updateDemoToggle();
    session.clear();
    mountPreview();
    showSaveStatus(
      state.settings.demoPreviewEnabled
        ? 'Demo preview enabled. The dashboard is now using seeded fake data.'
        : 'Live Ecwid preview restored for this browser.',
      'success'
    );
  }

  function mountPreview() {
    clearDemoTimers();

    if (state.settings && state.settings.demoPreviewEnabled) {
      mountDemoPreview();
      scheduleResize();
      return;
    }

    refs.previewShell.onclick = null;

    if (!state.context || !state.context.storeId) {
      showPreviewStatus('A store ID is required before the preview can run.', 'error');
      return;
    }

    preview.mountPreview({
      collector: session,
      onStatus: showPreviewStatus,
      storeId: state.context.storeId,
      target: refs.previewShell
    }).then(function () {
      scheduleResize();
    }).catch(function () {
      scheduleResize();
    });
  }

  function mountDemoPreview() {
    refs.previewShell.innerHTML = [
      '<div class="ser-preview-toolbar">',
      '<span class="ser-preview-badge">Demo preview with fake merchant data</span>',
      '<span class="ser-preview-note">Use this mode when you want to show the dashboard experience without loading a real Ecwid storefront.</span>',
      '</div>',
      '<div class="ser-demo-preview">',
      '<section class="ser-demo-hero">',
      '<div>',
      '<p class="ser-demo-kicker">Simulated product launch</p>',
      '<h3 class="ser-demo-title">Aurora Bundle</h3>',
      '<p class="ser-demo-copy">A fake storefront scene for merchants who want to preview the radar UI with seeded incidents before connecting a live store.</p>',
      '</div>',
      '<div class="ser-demo-price">$89.00</div>',
      '</section>',
      '<section class="ser-demo-grid">',
      '<article class="ser-demo-card">',
      '<p class="ser-demo-card-label">Hero banner</p>',
      '<strong>Performance sample</strong>',
      '<p>Simulate a slow product payload to populate the dashboard with a warning-level signal.</p>',
      '<button type="button" class="ser-button ser-button-secondary" data-ser-demo-action="slow-request">Simulate Slow Request</button>',
      '</article>',
      '<article class="ser-demo-card">',
      '<p class="ser-demo-card-label">Checkout path</p>',
      '<strong>Revenue risk sample</strong>',
      '<p>Trigger a fake checkout request failure to show how critical-path issues appear for the owner.</p>',
      '<button type="button" class="ser-button ser-button-secondary" data-ser-demo-action="checkout-failure">Simulate Checkout Failure</button>',
      '</article>',
      '<article class="ser-demo-card">',
      '<p class="ser-demo-card-label">Assets</p>',
      '<strong>Broken resource sample</strong>',
      '<p>Drop in a stylesheet failure to preview resource-error surfacing without touching a live theme.</p>',
      '<button type="button" class="ser-button ser-button-secondary" data-ser-demo-action="resource-error">Simulate Resource Error</button>',
      '</article>',
      '</section>',
      '<section class="ser-demo-footer">',
      '<div class="ser-button-row">',
      '<button type="button" class="ser-button ser-button-primary" data-ser-demo-action="seed-session">Populate Full Demo Session</button>',
      '<button type="button" class="ser-button ser-button-secondary" data-ser-demo-action="recovery">Simulate Recovery</button>',
      '</div>',
      '<p class="ser-demo-note">The fake session includes repeated JavaScript errors so the dashboard can also surface an error burst, just like the WooCommerce version.</p>',
      '</section>',
      '</div>'
    ].join('');

    refs.previewShell.onclick = function (event) {
      var actionNode = event.target.closest('[data-ser-demo-action]');

      if (!actionNode) {
        return;
      }

      runDemoAction(actionNode.getAttribute('data-ser-demo-action'));
    };

    showPreviewStatus('Demo preview active. Fake incidents are being generated in this browser only.', 'info');
    seedDemoSession();
  }

  function clearDemoTimers() {
    state.demoTimers.forEach(function (timerId) {
      global.clearTimeout(timerId);
    });

    state.demoTimers = [];
  }

  function seedDemoSession() {
    session.setContext({
      pageType: 'product',
      path: '/products/aurora-bundle',
      storeId: state.context ? state.context.storeId : 'demo'
    });

    queueDemoEvent(0, function () {
      session.record({
        type: 'slow_request',
        severity: 'warning',
        source: 'demo-preview',
        message: 'Product payload crossed the owner slow-request threshold.',
        path: '/products/aurora-bundle',
        durationBucket: 'slow',
        statusBucket: '2xx'
      });
    });

    queueDemoEvent(250, function () {
      session.record({
        type: 'resource_error',
        severity: 'warning',
        source: 'stylesheet',
        message: 'Campaign stylesheet failed to load in the simulated preview.',
        path: '/assets/campaign-drop.css'
      });
    });

    queueDemoEvent(500, function () {
      session.setContext({
        pageType: 'checkout',
        path: '/checkout/payment'
      });

      session.record({
        type: 'api_failure',
        severity: 'critical',
        source: 'demo-checkout',
        message: 'Checkout token exchange failed in the simulated owner flow.',
        path: '/checkout/payment',
        statusBucket: '5xx'
      });
    });

    queueDemoEvent(900, function () {
      seedBurstSeries();
    });
  }

  function seedBurstSeries() {
    var index = 0;

    while (index < 5) {
      queueDemoEvent(index * 60, function () {
        session.setContext({
          pageType: 'product',
          path: '/products/aurora-bundle'
        });

        session.record({
          type: 'js_error',
          severity: 'warning',
          source: 'demo-carousel',
          message: 'Simulated hero carousel failed to mount.',
          path: '/products/aurora-bundle',
          fingerprint: 'demo-carousel-burst'
        });
      });

      index += 1;
    }
  }

  function queueDemoEvent(delay, callback) {
    var timerId = global.setTimeout(callback, delay);
    state.demoTimers.push(timerId);
  }

  function runDemoAction(action) {
    if (action === 'seed-session') {
      session.clear();
      clearDemoTimers();
      seedDemoSession();
      showPreviewStatus('A fresh fake session has been loaded into the dashboard.', 'success');
      return;
    }

    if (action === 'slow-request') {
      session.setContext({ pageType: 'product', path: '/products/aurora-bundle' });
      session.record({
        type: 'slow_request',
        severity: 'warning',
        source: 'demo-preview',
        message: 'Demo inventory lookup slowed the product view.',
        path: '/products/aurora-bundle',
        durationBucket: 'medium',
        statusBucket: '2xx'
      });
      showPreviewStatus('Added a fake slow-request incident to the session.', 'success');
      return;
    }

    if (action === 'checkout-failure') {
      session.setContext({ pageType: 'checkout', path: '/checkout/payment' });
      session.record({
        type: 'api_failure',
        severity: 'critical',
        source: 'demo-checkout',
        message: 'Demo payment step returned a simulated 502 failure.',
        path: '/checkout/payment',
        statusBucket: '5xx'
      });
      showPreviewStatus('Added a fake checkout failure to the session.', 'success');
      return;
    }

    if (action === 'resource-error') {
      session.setContext({ pageType: 'catalog', path: '/collections/spring-drop' });
      session.record({
        type: 'resource_error',
        severity: 'warning',
        source: 'image',
        message: 'Demo campaign image failed to load in the category grid.',
        path: '/assets/spring-drop-hero.webp'
      });
      showPreviewStatus('Added a fake resource failure to the session.', 'success');
      return;
    }

    if (action === 'recovery') {
      session.setContext({ pageType: 'checkout', path: '/checkout/payment' });
      session.record({
        type: 'recovery',
        severity: 'info',
        source: 'demo-preview',
        message: 'The simulated issue recovered after the owner retried checkout.',
        path: '/checkout/payment'
      });
      showPreviewStatus('Added a fake recovery event to the session.', 'success');
    }
  }

  function renderSnapshot(snapshot) {
    refs.totalSignals.textContent = String(snapshot.summary.recentSignals);
    refs.criticalSignals.textContent = String(snapshot.summary.criticalPathFailures);
    refs.resourceFailures.textContent = String(snapshot.summary.resourceFailures);
    refs.slowRequests.textContent = String(snapshot.summary.slowRequests);
    refs.currentPageValue.textContent = snapshot.context.pageType || 'catalog';

    if (!snapshot.events.length) {
      refs.incidentsBody.innerHTML = '<tr><td colspan="5" class="ser-empty">No incidents yet. Use the embedded preview to navigate products, cart, and checkout transitions.</td></tr>';
      scheduleResize();
      return;
    }

    refs.incidentsBody.innerHTML = snapshot.events.map(function (event) {
      var when = new Date(event.occurredAt).toLocaleTimeString();

      return [
        '<tr>',
        '<td>' + escapeHtml(when) + '</td>',
        '<td><span class="ser-badge ser-badge-' + escapeHtml(event.severity) + '">' + escapeHtml(event.type.replace(/_/g, ' ')) + '</span></td>',
        '<td><span class="ser-badge ser-badge-' + escapeHtml(event.severity) + '">' + escapeHtml(event.severity) + '</span></td>',
        '<td>' + escapeHtml(event.pageType || 'catalog') + '</td>',
        '<td>' + escapeHtml([event.message, event.path, event.source].filter(Boolean).join(' | ')) + '</td>',
        '</tr>'
      ].join('');
    }).join('');

    scheduleResize();
  }

  function showSaveStatus(message, type) {
    refs.saveStatus.innerHTML = '<span class="ser-status-pill ser-status-' + escapeHtml(type) + '">' + escapeHtml(message) + '</span>';
    scheduleResize();
  }

  function showPreviewStatus(message, type) {
    refs.previewStatus.innerHTML = '<span class="ser-status-pill ser-status-' + escapeHtml(type) + '">' + escapeHtml(message) + '</span>';
    scheduleResize();
  }

  function exportSnapshot() {
    var snapshot = session.getSnapshot();
    var blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');

    link.href = url;
    link.download = 'storefront-error-radar-' + (state.context ? state.context.storeId : 'preview') + '.json';
    link.click();

    global.setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  function scheduleResize() {
    if (!global.EcwidApp || typeof global.EcwidApp.setSize !== 'function') {
      return;
    }

    global.clearTimeout(resizeTimer);
    resizeTimer = global.setTimeout(function () {
      global.EcwidApp.setSize({ height: document.body.scrollHeight + 24 });
    }, 100);
  }

  function escapeHtml(value) {
    var node = document.createElement('div');
    node.textContent = String(value || '');
    return node.innerHTML;
  }
})(window);
