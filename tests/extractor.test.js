import {test} from 'node:test';
import assert from 'node:assert/strict';
import {scanMaterials, safeFilename} from '../extension/extractor.js';
import {makePage, useDocument} from './dom-helper.js';

function scan(html, url) {
  const dom = makePage(html, url);
  try { return useDocument(dom.window.document, () => scanMaterials(dom.window.location.href)); }
  finally { dom.window.close(); }
}

test('CUC-style viewer decodes once and preserves signed query bytes', () => {
  const url = 'https://media.example.edu/download/file/abc?token=a%2Bb&timestamp=123&name=paper%281%29.pdf';
  const result = scan(`<iframe id="pdf-viewer" src="/note-bene/pdf-viewer?file=${encodeURIComponent(url)}&amp;upload_id=1"></iframe>`);
  assert.equal(result.items[0].url, url);
  assert.equal(result.items[0].name, 'paper(1).pdf');
  assert.equal(result.items[0].signed, true);
});
test('resolves base element and deduplicates identical URLs', () => {
  const {items} = scan('<base href="https://cdn.example.edu/docs/"><a href="paper.pdf">One</a><embed src="paper.pdf">');
  assert.equal(items.length, 1);
  assert.equal(items[0].url, 'https://cdn.example.edu/docs/paper.pdf');
});
test('filters unsupported schemes, embedded credentials and ordinary web pages', () => {
  for (const href of ['javascript:alert(1)', 'data:application/pdf,x', 'blob:https://example.edu/id', 'https://u:p@example.edu/a.pdf', '/home', 'http://[']) {
    assert.equal(scan(`<a href="${href}">slides.pdf</a>`).items.length, 0, href);
  }
});
test('ignores hidden and invisible attachments', () => {
  const {items} = scan('<a hidden href="/hidden.pdf">Hidden</a><a style="visibility:hidden" href="/invisible.pdf">Invisible</a><a href="/visible.pdf">Shown</a>');
  assert.deepEqual(items.map(item => item.name), ['visible.pdf']);
});
test('same-origin iframe uses its own document base', () => {
  const dom = makePage('<iframe></iframe>');
  try {
    const frame = dom.window.document.querySelector('iframe');
    frame.contentDocument.body.innerHTML = '<base href="https://example.edu/inner/"><a href="slides.pptx">Slides</a>';
    frame.contentWindow.Element.prototype.getClientRects = () => [{}];
    const items = useDocument(dom.window.document, () => scanMaterials()).items;
    assert.equal(items[0].url, 'https://example.edu/inner/slides.pptx');
  } finally { dom.window.close(); }
});
test('inaccessible iframe reports partial scan without throwing', () => {
  const dom = makePage('<iframe src="https://elsewhere.example/preview"></iframe>');
  try {
    const frame = dom.window.document.querySelector('iframe');
    Object.defineProperty(frame, 'contentDocument', {get() {throw new Error('Cross origin');}});
    const result = useDocument(dom.window.document, () => scanMaterials());
    assert.equal(result.items.length, 0);
    assert.ok(result.warnings.includes('unreadableFrame'));
  } finally { dom.window.close(); }
});
test('URL filename decodes unicode without decoding signed URL again', () => {
  const href = '/files/%E8%AF%BE%E4%BB%B6%2Epdf?signature=a%252Fb';
  const item = scan(`<a href="${href}">File</a>`).items[0];
  assert.equal(item.name, '课件.pdf');
  assert.ok(item.url.endsWith('?signature=a%252Fb'));
});
test('caps large result lists with explicit warning', () => {
  const result = scan(Array.from({length: 260}, (_, i) => `<a href="/${i}.pdf">${i}</a>`).join(''));
  assert.equal(result.items.length, 250);
  assert.ok(result.warnings.includes('resultLimit'));
});
test('caps total traversal work', () => {
  const result = scan('<span></span>'.repeat(20001));
  assert.ok(result.warnings.includes('nodeLimit'));
});
test('safe names remove path separators, reserved names and misleading controls', () => {
  assert.equal(safeFilename('../a:b/c.pdf'), '_a_b_c.pdf');
  assert.equal(safeFilename('...'), '课程资料');
  assert.equal(safeFilename('CON.pdf'), '_CON.pdf');
  assert.equal(safeFilename('report\u202e.pdf'), 'report_.pdf');
});
test('long unicode names fit filesystem byte limit while retaining suffix', () => {
  const result = safeFilename('课程😀'.repeat(150) + '.pptx');
  assert.ok(new TextEncoder().encode(result).length <= 220);
  assert.ok(result.endsWith('.pptx'));
  assert.ok(!/[\ud800-\udbff]$/.test(result.slice(0, -5)));
});
