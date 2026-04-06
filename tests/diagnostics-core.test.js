const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createDom,
  loadScript,
} = require('./helpers/browser-harness');

function loadCoreWithWindow(windowObject) {
  const dom = createDom({ url: 'https://example.com/public/index.html?storeId=1003' });

  if (windowObject) {
    Object.keys(windowObject).forEach(function (key) {
      dom.window[key] = windowObject[key];
    });
  }

  loadScript(dom, 'src/shared/diagnostics-core.js');

  return {
    core: dom.window.StorefrontErrorRadarCore,
    window: dom.window,
  };
}

test('diagnostics core clamps configuration updates and clears sessions', function () {
  const loaded = loadCoreWithWindow();
  const session = loaded.core.createSession({ maxEvents: 999, slowRequestMs: 10 });

  assert.equal(session.getSnapshot().config.maxEvents, 200);
  assert.equal(session.getSnapshot().config.slowRequestMs, 300);

  session.updateConfig({ maxEvents: 5, slowRequestMs: 40000 });

  assert.equal(session.getSnapshot().config.maxEvents, 10);
  assert.equal(session.getSnapshot().config.slowRequestMs, 10000);

  session.record({ type: 'js_error', message: 'demo' });
  assert.equal(session.getSnapshot().summary.recentSignals, 1);

  session.clear();
  assert.equal(session.getSnapshot().summary.recentSignals, 0);
});

test('diagnostics core derives critical path failures for checkout incidents', function () {
  const loaded = loadCoreWithWindow();
  const session = loaded.core.createSession();

  session.setContext({ pageType: 'checkout', path: '/checkout/payment', storeId: '1003' });
  session.record({
    type: 'api_failure',
    severity: 'warning',
    source: 'fetch',
    message: 'Gateway down',
    path: '/checkout/payment',
    statusBucket: '5xx',
  });

  const snapshot = session.getSnapshot();
  const types = snapshot.events.map(function (event) {
    return event.type;
  });

  assert.equal(types.slice(0, 2).join(','), 'critical_path_failure,api_failure');
  assert.equal(snapshot.summary.criticalPathFailures, 2);
});

test('diagnostics core emits an error burst after repeated matching incidents', function () {
  const loaded = loadCoreWithWindow();
  let now = 0;

  loaded.window.Date.now = function () {
    return now;
  };

  const session = loaded.core.createSession();
  session.setContext({ pageType: 'product', path: '/products/aurora' });

  for (let index = 0; index < 5; index += 1) {
    now = (index + 1) * 3000;
    session.record({
      type: 'js_error',
      severity: 'warning',
      source: 'demo-carousel',
      message: 'Repeated failure',
      fingerprint: 'same-problem',
    });
  }

  const snapshot = session.getSnapshot();
  const types = snapshot.events.map(function (event) {
    return event.type;
  });

  assert.ok(types.includes('error_burst'));
});

test('diagnostics core records slow fetch requests on the happy path', async function () {
  let now = 0;
  const loaded = loadCoreWithWindow({
    fetch: function () {
      return Promise.resolve({ ok: true, status: 200 });
    },
  });

  loaded.window.Date.now = function () {
    return now;
  };

  const session = loaded.core.createSession({ slowRequestMs: 1500 });
  session.start();

  now = 1000;
  const pending = loaded.window.fetch('/api/products');
  now = 4000;
  await pending;

  const snapshot = session.getSnapshot();

  assert.equal(snapshot.events[0].type, 'slow_request');
  assert.equal(snapshot.summary.slowRequests, 1);

  session.stop();
});

test('diagnostics core ignores fast successful fetch requests on the happy path', async function () {
  let now = 0;
  const loaded = loadCoreWithWindow({
    fetch: function () {
      return Promise.resolve({ ok: true, status: 200 });
    },
  });

  loaded.window.Date.now = function () {
    return now;
  };

  const session = loaded.core.createSession({ slowRequestMs: 1500 });
  session.start();

  now = 1000;
  const pending = loaded.window.fetch('/api/products');
  now = 1200;
  await pending;

  assert.equal(session.getSnapshot().events.length, 0);
  session.stop();
});

test('diagnostics core derives critical failures from failed checkout fetch responses', async function () {
  const loaded = loadCoreWithWindow({
    fetch: function () {
      return Promise.resolve({ ok: false, status: 502 });
    },
  });

  const session = loaded.core.createSession();
  session.setContext({ pageType: 'checkout', path: '/checkout/payment', storeId: '1003' });
  session.start();

  await loaded.window.fetch('/checkout/payment');

  const snapshot = session.getSnapshot();
  assert.equal(snapshot.events[0].type, 'critical_path_failure');
  assert.equal(snapshot.events[1].type, 'api_failure');

  session.stop();
});

test('diagnostics core records failed fetch requests on the unhappy path', async function () {
  const loaded = loadCoreWithWindow({
    fetch: function () {
      return Promise.reject(new Error('network offline'));
    },
  });

  const session = loaded.core.createSession();
  session.start();

  await assert.rejects(function () {
    return loaded.window.fetch('/api/cart');
  }, /network offline/);

  const snapshot = session.getSnapshot();

  assert.equal(snapshot.events[0].type, 'critical_path_failure');
  assert.equal(snapshot.events[1].type, 'api_failure');

  session.stop();
});

test('diagnostics core records failing XMLHttpRequests on the unhappy path', function () {
  function FakeXMLHttpRequest() {
    this.listeners = {};
    this.status = 0;
  }

  FakeXMLHttpRequest.prototype.addEventListener = function (name, listener) {
    this.listeners[name] = listener;
  };

  FakeXMLHttpRequest.prototype.open = function () {};

  FakeXMLHttpRequest.prototype.send = function () {
    this.status = 503;
    this.listeners.loadend();
  };

  const loaded = loadCoreWithWindow({ XMLHttpRequest: FakeXMLHttpRequest });
  const session = loaded.core.createSession();
  session.setContext({ pageType: 'checkout', path: '/checkout/payment' });
  session.start();

  const xhr = new loaded.window.XMLHttpRequest();
  xhr.open('GET', '/checkout/payment');
  xhr.send();

  const snapshot = session.getSnapshot();

  assert.equal(snapshot.events[0].type, 'critical_path_failure');
  assert.equal(snapshot.events[1].type, 'api_failure');

  session.stop();
});

test('diagnostics core records asset load failures on the unhappy path', function () {
  const loaded = loadCoreWithWindow();
  const session = loaded.core.createSession();
  session.start();

  // Element must be in the DOM so the error event propagates through the
  // capture-phase window listener that diagnostics-core registers.
  const image = loaded.window.document.createElement('img');
  image.src = 'https://cdn.example.com/broken-image.webp';
  loaded.window.document.body.appendChild(image);
  image.dispatchEvent(new loaded.window.Event('error', { bubbles: true }));

  const snapshot = session.getSnapshot();

  assert.equal(snapshot.events[0].type, 'resource_error');
  assert.equal(snapshot.events[0].source, 'img');
  session.stop();
});

test('diagnostics core records unhandled promise rejections on the unhappy path', function () {
  const loaded = loadCoreWithWindow();
  const session = loaded.core.createSession();
  session.start();

  const rejectionEvent = new loaded.window.Event('unhandledrejection');
  rejectionEvent.reason = new Error('payment token missing');
  loaded.window.dispatchEvent(rejectionEvent);

  const snapshot = session.getSnapshot();

  assert.equal(snapshot.events[0].type, 'promise_rejection');
  assert.match(snapshot.events[0].message, /payment token missing/);
  session.stop();
});

test('diagnostics core does not patch network instrumentation when captureNetwork is disabled', async function () {
  let now = 0;
  const loaded = loadCoreWithWindow({
    fetch: function () {
      return Promise.resolve({ ok: true, status: 200 });
    },
  });

  loaded.window.Date.now = function () {
    return now;
  };

  const originalFetch = loaded.window.fetch;
  const session = loaded.core.createSession({ captureNetwork: false, slowRequestMs: 300 });
  session.start();

  now = 1000;
  await loaded.window.fetch('/checkout/payment');
  now = 5000;

  assert.equal(loaded.window.fetch, originalFetch);
  assert.equal(session.getSnapshot().events.length, 0);
  session.stop();
});