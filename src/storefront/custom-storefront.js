(function (global) {
  'use strict';

  var currentScriptStoreId = '';
  var lifecycleBound = false;
  var bootTimeout = null;
  var statusHandler = function () {};
  var collector = null;

  function mapPageType(page) {
    var type = page && page.type ? String(page.type).toUpperCase() : 'CATEGORY';

    if (type === 'PRODUCT') {
      return 'product';
    }

    if (type === 'CART') {
      return 'cart';
    }

    if (type === 'SEARCH') {
      return 'search';
    }

    if (type === 'ORDER_CONFIRMATION') {
      return 'checkout';
    }

    return 'catalog';
  }

  function mapPagePath(page) {
    var type = page && page.type ? String(page.type).toUpperCase() : 'CATEGORY';

    if (type === 'PRODUCT' && page.productId) {
      return '/products/' + page.productId;
    }

    if (type === 'CATEGORY' && page.categoryId) {
      return '/categories/' + page.categoryId;
    }

    if (type === 'CART') {
      return '/cart';
    }

    if (type === 'ORDER_CONFIRMATION') {
      return '/checkout';
    }

    return '/';
  }

  function clearBootTimeout() {
    if (bootTimeout) {
      global.clearTimeout(bootTimeout);
      bootTimeout = null;
    }
  }

  function ensureLifecycle() {
    if (lifecycleBound || !global.Ecwid) {
      return;
    }

    if (global.Ecwid.OnAPILoaded && typeof global.Ecwid.OnAPILoaded.add === 'function') {
      global.Ecwid.OnAPILoaded.add(function () {
        clearBootTimeout();
        statusHandler('Preview live. Use the embedded store to surface runtime issues.', 'success');
      });
    }

    if (global.Ecwid.OnPageLoaded && typeof global.Ecwid.OnPageLoaded.add === 'function') {
      global.Ecwid.OnPageLoaded.add(function (page) {
        if (collector) {
          collector.setContext({
            pageType: mapPageType(page),
            path: mapPagePath(page),
          });
        }
      });
    }

    lifecycleBound = true;
  }

  function ensureScript(storeId) {
    return new Promise(function (resolve, reject) {
      if (global.xProductBrowser && currentScriptStoreId === storeId) {
        ensureLifecycle();
        resolve();
        return;
      }

      var existing = document.getElementById('storefront-error-radar-ecwid-script');

      if (existing) {
        existing.remove();
      }

      var script = document.createElement('script');
      script.id = 'storefront-error-radar-ecwid-script';
      script.src = 'https://app.ecwid.com/script.js?' + encodeURIComponent(storeId);
      script.charset = 'utf-8';
      script.async = true;
      script.onload = function () {
        currentScriptStoreId = storeId;
        ensureLifecycle();
        resolve();
      };
      script.onerror = function () {
        reject(new Error('Ecwid storefront script could not be loaded.'));
      };
      document.body.appendChild(script);
    });
  }

  function renderBrowser(targetId) {
    global.xProductBrowser(
      'categoriesPerRow=3',
      'views=grid(18,3) list(36)',
      'categoryView=grid',
      'searchView=list',
      'id=' + targetId
    );
  }

  function mountPreview(options) {
    var target = options && options.target;
    var storeId = options && options.storeId ? String(options.storeId) : '';
    var previewCollector = options && options.collector;

    if (!target || !storeId || !previewCollector) {
      return Promise.reject(new Error('Preview mount requires a target, store ID, and collector.'));
    }

    collector = previewCollector;
    statusHandler = typeof options.onStatus === 'function' ? options.onStatus : function () {};

    target.innerHTML = [
      '<div class="ser-preview-toolbar">',
      '<span class="ser-preview-badge">Owner-only preview session</span>',
      '<span class="ser-preview-note">Nothing here runs for live customers. Diagnostics exist only while this dashboard is open.</span>',
      '</div>',
      '<div class="ser-preview-stage" id="storefront-error-radar-preview-' + storeId + '"></div>'
    ].join('');

    collector.setContext({
      pageType: 'catalog',
      path: '/',
      storeId: storeId,
    });

    statusHandler('Loading your Ecwid storefront preview.', 'info');
    clearBootTimeout();
    bootTimeout = global.setTimeout(function () {
      collector.record({
        type: 'page_bootstrap_failure',
        severity: 'critical',
        source: 'ecwid-preview',
        message: 'The storefront preview did not boot within 12 seconds.',
        path: '/',
      });
      statusHandler('Preview timed out. Check the store ID or network access to Ecwid.', 'error');
    }, 12000);

    return ensureScript(storeId).then(function () {
      renderBrowser('storefront-error-radar-preview-' + storeId);
    }).catch(function (error) {
      clearBootTimeout();
      collector.record({
        type: 'resource_error',
        severity: 'critical',
        source: 'ecwid-preview',
        message: error.message,
        path: 'https://app.ecwid.com/script.js',
      });
      statusHandler(error.message, 'error');
      throw error;
    });
  }

  global.StorefrontErrorRadarEcwidPreview = {
    mountPreview: mountPreview,
  };
})(window);
