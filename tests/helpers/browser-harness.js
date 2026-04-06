const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { JSDOM } = require('jsdom');

const rootDir = path.join(__dirname, '..', '..');

function createDom(options) {
  const settings = Object.assign({
    html: '<!doctype html><html><body></body></html>',
    url: 'https://example.com/public/index.html',
  }, options || {});

  const dom = new JSDOM(settings.html, {
    pretendToBeVisual: true,
    runScripts: 'outside-only',
    url: settings.url,
  });

  dom.window.console = console;

  return dom;
}

function loadScript(dom, relativePath) {
  const code = fs.readFileSync(path.join(rootDir, relativePath), 'utf8');
  const script = new vm.Script(code, { filename: relativePath });

  script.runInContext(dom.getInternalVMContext());
}

function readProjectFile(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), 'utf8');
}

function createFakeTimers(windowObject) {
  let nextId = 1;
  const timers = new Map();

  windowObject.setTimeout = function (callback, delay) {
    const id = nextId;
    nextId += 1;
    timers.set(id, {
      callback,
      delay: Number(delay) || 0,
    });
    return id;
  };

  windowObject.clearTimeout = function (id) {
    timers.delete(id);
  };

  function runNextTimer() {
    if (!timers.size) {
      return false;
    }

    const nextEntry = Array.from(timers.entries()).sort(function (left, right) {
      return left[1].delay - right[1].delay || left[0] - right[0];
    })[0];

    timers.delete(nextEntry[0]);
    nextEntry[1].callback();
    return true;
  }

  function runAllTimers(limit) {
    let remaining = typeof limit === 'number' ? limit : 100;

    while (remaining > 0 && runNextTimer()) {
      remaining -= 1;
    }

    if (timers.size) {
      throw new Error('Timer queue did not drain.');
    }
  }

  return {
    runAllTimers,
    runNextTimer,
  };
}

function flushPromises() {
  return new Promise(function (resolve) {
    setImmediate(resolve);
  });
}

module.exports = {
  createDom,
  createFakeTimers,
  flushPromises,
  loadScript,
  readProjectFile,
};