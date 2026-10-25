import {JSDOM} from 'jsdom';

export function makePage(html = '', url = 'https://example.edu/course/1') {
  const dom = new JSDOM(`<!doctype html><title>课程资料测试</title><body>${html}</body>`, {url});
  // jsdom has no layout; visibility geometry is the only mocked DOM behavior.
  dom.window.Element.prototype.getClientRects = function () {
    if (this.closest('[hidden]')) return [];
    return [{}];
  };
  return dom;
}

export function useDocument(doc, fn) {
  const old = globalThis.document;
  globalThis.document = doc;
  try { return fn(); } finally {
    if (old === undefined) delete globalThis.document;
    else globalThis.document = old;
  }
}
