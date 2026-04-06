(function (global) {
  'use strict';

  var DEFAULTS = {
    captureJs: true,
    captureNetwork: true,
    maxEvents: 80,
    slowRequestMs: 1500,
  };

  function clampNumber(value, fallback, minimum, maximum) {
    var parsed = Number(value);

    if (!Number.isFinite(parsed)) {
      return fallback;
    }

    return Math.max(minimum, Math.min(maximum, Math.round(parsed)));
  }

  function sanitizeText(value, maxLength) {
    return String(value || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, maxLength);
  }

  function sanitizePath(value) {
    if (!value) {
      return '/';
    }

    try {
      var url = new URL(String(value), global.location && global.location.href ? global.location.href : 'https://example.com');
      return sanitizeText(url.pathname || '/', 160) || '/';
    } catch (error) {
      return sanitizeText(value, 160) || '/';
    }
  }

  function bucketStatus(status) {
    if (!status) {
      return '0';
    }

    if (status >= 500) {
      return '5xx';
    }

    if (status >= 400) {
      return '4xx';
    }

    if (status >= 300) {
      return '3xx';
    }

    if (status >= 200) {
      return '2xx';
    }

    return '0';
  }

  function bucketDuration(duration) {
    if (duration >= 8000) {
      return 'severe';
    }

    if (duration >= 3000) {
      return 'slow';
    }

    if (duration >= 1500) {
      return 'medium';
    }

    return 'fast';
  }

  function safeJsonClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function createSession(userConfig) {
    var config = Object.assign({}, DEFAULTS, userConfig || {});
    config.maxEvents = clampNumber(config.maxEvents, DEFAULTS.maxEvents, 10, 200);
    config.slowRequestMs = clampNumber(config.slowRequestMs, DEFAULTS.slowRequestMs, 300, 10000);

    var events = [];
    var recentFingerprints = new Map();
    var listeners = new Set();
    var started = false;
    var context = {
      pageType: 'catalog',
      path: '/',
      storeId: '',
    };
    var originalFetch = typeof global.fetch === 'function' ? global.fetch.bind(global) : null;
    var originalXhrOpen = global.XMLHttpRequest ? global.XMLHttpRequest.prototype.open : null;
    var originalXhrSend = global.XMLHttpRequest ? global.XMLHttpRequest.prototype.send : null;

    function notify() {
      var snapshot = getSnapshot();
      listeners.forEach(function (listener) {
        listener(snapshot);
      });
    }

    function shouldSkip(fingerprint) {
      var lastSeen = recentFingerprints.get(fingerprint) || 0;
      var now = Date.now();

      recentFingerprints.set(fingerprint, now);

      return now - lastSeen < 2500;
    }

    function appendEvent(event) {
      events.push(event);

      while (events.length > config.maxEvents) {
        events.shift();
      }
    }

    function buildDerivedEvents(event) {
      var derived = [];
      var now = event.occurredAt;
      var fingerprint = event.fingerprint;
      var burstMatches = events.filter(function (existingEvent) {
        return existingEvent.fingerprint === fingerprint && now - existingEvent.occurredAt <= 60000;
      }).length;

      if (event.isCritical && event.type !== 'critical_path_failure') {
        var criticalFingerprint = fingerprint + ':critical';

        if (!shouldSkip(criticalFingerprint)) {
          derived.push({
            type: 'critical_path_failure',
            severity: 'critical',
            source: event.source,
            message: 'Revenue-sensitive flow failed during the owner preview session.',
            path: event.path,
            pageType: event.pageType,
            statusBucket: event.statusBucket,
            durationBucket: event.durationBucket,
            fingerprint: criticalFingerprint,
            occurredAt: now,
            isCritical: true,
          });
        }
      }

      if (burstMatches >= 5) {
        var burstFingerprint = fingerprint + ':burst';

        if (!shouldSkip(burstFingerprint)) {
          derived.push({
            type: 'error_burst',
            severity: 'warning',
            source: event.source,
            message: 'The same issue repeated at least five times during this session.',
            path: event.path,
            pageType: event.pageType,
            statusBucket: event.statusBucket,
            durationBucket: event.durationBucket,
            fingerprint: burstFingerprint,
            occurredAt: now,
            isCritical: false,
          });
        }
      }

      return derived;
    }

    function normalizeEvent(input) {
      var event = Object.assign({}, input || {});
      var path = sanitizePath(event.path || context.path || '/');
      var pageType = sanitizeText(event.pageType || context.pageType || 'catalog', 32) || 'catalog';
      var source = sanitizeText(event.source || 'browser', 80) || 'browser';
      var message = sanitizeText(event.message || 'Unknown issue', 180) || 'Unknown issue';
      var type = sanitizeText(event.type || 'js_error', 40) || 'js_error';
      var severity = sanitizeText(event.severity || 'warning', 16) || 'warning';
      var statusBucket = sanitizeText(event.statusBucket || '', 8);
      var durationBucket = sanitizeText(event.durationBucket || '', 16);
      var fingerprint = sanitizeText(
        event.fingerprint || [type, severity, source, pageType, path, statusBucket, durationBucket, message].join('|'),
        180
      );
      var isCritical = Boolean(event.isCritical)
        || type === 'critical_path_failure'
        || type === 'page_bootstrap_failure'
        || (type === 'api_failure' && /cart|checkout/i.test(path))
        || (type === 'slow_request' && /cart|checkout/i.test(path) && durationBucket !== 'fast')
        || (type === 'resource_error' && /checkout|cart/i.test(path));

      return {
        type: type,
        severity: isCritical ? 'critical' : severity,
        source: source,
        message: message,
        path: path,
        pageType: pageType,
        statusBucket: statusBucket,
        durationBucket: durationBucket,
        fingerprint: fingerprint,
        occurredAt: Date.now(),
        isCritical: isCritical,
        storeId: sanitizeText(context.storeId || '', 40),
      };
    }

    function record(input) {
      var event = normalizeEvent(input);

      if (!event.type) {
        return;
      }

      if (shouldSkip(event.fingerprint)) {
        return;
      }

      appendEvent(event);
      buildDerivedEvents(event).forEach(appendEvent);
      notify();
    }

    function onWindowError(domEvent) {
      if (domEvent.target && domEvent.target !== global) {
        var tagName = sanitizeText(domEvent.target.tagName || 'asset', 20).toLowerCase();
        var assetSource = domEvent.target.currentSrc || domEvent.target.src || domEvent.target.href || context.path;

        record({
          type: 'resource_error',
          severity: 'warning',
          source: tagName,
          message: tagName + ' failed to load in the preview session.',
          path: assetSource,
        });

        return;
      }

      record({
        type: 'js_error',
        severity: 'warning',
        source: domEvent.filename || 'window.error',
        message: domEvent.message || 'JavaScript runtime error',
        path: domEvent.filename || context.path,
      });
    }

    function onUnhandledRejection(domEvent) {
      var reason = domEvent.reason;
      var message = typeof reason === 'string'
        ? reason
        : reason && reason.message
          ? reason.message
          : 'Unhandled promise rejection';

      record({
        type: 'promise_rejection',
        severity: 'warning',
        source: 'promise',
        message: message,
        path: context.path,
      });
    }

    function patchFetch() {
      if (!config.captureNetwork || !originalFetch || global.fetch === wrappedFetch) {
        return;
      }

      global.fetch = wrappedFetch;
    }

    async function wrappedFetch() {
      var args = Array.prototype.slice.call(arguments);
      var request = args[0];
      var requestUrl = typeof request === 'string' ? request : request && request.url ? request.url : context.path;
      var startedAt = Date.now();

      try {
        var response = await originalFetch.apply(global, args);
        var elapsed = Date.now() - startedAt;

        if (!response.ok) {
          record({
            type: 'api_failure',
            severity: 'warning',
            source: 'fetch',
            message: 'Request failed with status ' + response.status,
            path: requestUrl,
            statusBucket: bucketStatus(response.status),
          });
        } else if (elapsed >= config.slowRequestMs) {
          record({
            type: 'slow_request',
            severity: elapsed >= 3000 ? 'warning' : 'info',
            source: 'fetch',
            message: 'Slow request detected (' + elapsed + 'ms)',
            path: requestUrl,
            statusBucket: bucketStatus(response.status),
            durationBucket: bucketDuration(elapsed),
          });
        }

        return response;
      } catch (error) {
        record({
          type: 'api_failure',
          severity: 'critical',
          source: 'fetch',
          message: error && error.message ? error.message : 'Fetch request failed',
          path: requestUrl,
          statusBucket: '0',
        });

        throw error;
      }
    }

    function patchXmlHttpRequest() {
      if (!config.captureNetwork || !global.XMLHttpRequest || global.XMLHttpRequest.prototype.open === wrappedOpen) {
        return;
      }

      global.XMLHttpRequest.prototype.open = wrappedOpen;
      global.XMLHttpRequest.prototype.send = wrappedSend;
    }

    function wrappedOpen(method, url) {
      this.__storefrontErrorRadar = {
        method: method,
        url: url,
      };

      return originalXhrOpen.apply(this, arguments);
    }

    function wrappedSend() {
      var xhr = this;
      var meta = xhr.__storefrontErrorRadar || { url: context.path };
      var startedAt = Date.now();

      function finalize(status) {
        var elapsed = Date.now() - startedAt;

        if (status >= 400 || status === 0) {
          record({
            type: 'api_failure',
            severity: status >= 500 || status === 0 ? 'critical' : 'warning',
            source: 'xhr',
            message: 'XMLHttpRequest failed with status ' + status,
            path: meta.url,
            statusBucket: bucketStatus(status),
          });
        } else if (elapsed >= config.slowRequestMs) {
          record({
            type: 'slow_request',
            severity: elapsed >= 3000 ? 'warning' : 'info',
            source: 'xhr',
            message: 'Slow XMLHttpRequest detected (' + elapsed + 'ms)',
            path: meta.url,
            statusBucket: bucketStatus(status),
            durationBucket: bucketDuration(elapsed),
          });
        }
      }

      xhr.addEventListener('loadend', function () {
        finalize(xhr.status);
      }, { once: true });

      xhr.addEventListener('error', function () {
        finalize(0);
      }, { once: true });

      return originalXhrSend.apply(xhr, arguments);
    }

    function start() {
      if (started) {
        return;
      }

      if (config.captureJs) {
        global.addEventListener('error', onWindowError, true);
        global.addEventListener('unhandledrejection', onUnhandledRejection);
      }

      patchFetch();
      patchXmlHttpRequest();
      started = true;
    }

    function stop() {
      if (!started) {
        return;
      }

      global.removeEventListener('error', onWindowError, true);
      global.removeEventListener('unhandledrejection', onUnhandledRejection);

      if (originalFetch) {
        global.fetch = originalFetch;
      }

      if (global.XMLHttpRequest && originalXhrOpen && originalXhrSend) {
        global.XMLHttpRequest.prototype.open = originalXhrOpen;
        global.XMLHttpRequest.prototype.send = originalXhrSend;
      }

      started = false;
    }

    function clear() {
      events.splice(0, events.length);
      recentFingerprints.clear();
      notify();
    }

    function updateConfig(nextConfig) {
      config = Object.assign({}, config, nextConfig || {});
      config.maxEvents = clampNumber(config.maxEvents, DEFAULTS.maxEvents, 10, 200);
      config.slowRequestMs = clampNumber(config.slowRequestMs, DEFAULTS.slowRequestMs, 300, 10000);

      if (started) {
        stop();
        start();
      }
    }

    function subscribe(listener) {
      listeners.add(listener);
      listener(getSnapshot());

      return function unsubscribe() {
        listeners.delete(listener);
      };
    }

    function setContext(nextContext) {
      context = Object.assign({}, context, nextContext || {});
    }

    function getSnapshot() {
      var summary = {
        recentSignals: events.length,
        criticalPathFailures: 0,
        resourceFailures: 0,
        slowRequests: 0,
        uniqueFingerprints: 0,
      };
      var fingerprints = [];

      events.forEach(function (event) {
        if (event.type === 'critical_path_failure' || event.isCritical) {
          summary.criticalPathFailures += 1;
        }

        if (event.type === 'resource_error') {
          summary.resourceFailures += 1;
        }

        if (event.type === 'slow_request') {
          summary.slowRequests += 1;
        }

        if (event.fingerprint) {
          fingerprints.push(event.fingerprint);
        }
      });

      summary.uniqueFingerprints = new Set(fingerprints).size;

      return {
        config: Object.assign({}, config),
        context: Object.assign({}, context),
        summary: summary,
        events: safeJsonClone(events).reverse(),
      };
    }

    return {
      clear: clear,
      getSnapshot: getSnapshot,
      record: record,
      setContext: setContext,
      start: start,
      stop: stop,
      subscribe: subscribe,
      updateConfig: updateConfig,
    };
  }

  global.StorefrontErrorRadarCore = {
    createSession: createSession,
    defaults: Object.assign({}, DEFAULTS),
  };
})(window);