import {test} from 'node:test';
import assert from 'node:assert/strict';
import {scanMaterials} from '../extension/extractor.js';
import {makePage, useDocument} from './dom-helper.js';

function scan(html, url = 'https://example.edu/course/') {
  const dom = makePage(html, url);
  try { return useDocument(dom.window.document, () => scanMaterials(url)); }
  finally {dom.window.close();}
}
test('generic file formats including OpenDocument', () => {
  for (const ext of ['pdf', 'ppt', 'pptx', 'doc', 'docx', 'xlsx', 'zip', 'txt', 'csv', 'epub', 'odt', 'ods', 'odp']) {
    assert.equal(scan(`<a href="/lesson.${ext}">Lesson</a>`).items.length, 1, ext);
  }
});
test('PDF.js wrapped source with encoded signature', () => {
  const file = 'https://cdn.example.edu/slides.pdf?signature=a%2Fb';
  assert.equal(scan(`<iframe src="/pdfjs/web/viewer.html?file=${encodeURIComponent(file)}"></iframe>`).items[0].url, file);
});
test('top-level PDF.js viewer URL is recognized', () => {
  const url = 'https://example.edu/viewer.html?file=%2Fpaper.pdf';
  assert.equal(scan('', url).items[0].url, 'https://example.edu/paper.pdf');
});
test('object and embed PDF', () => {
  assert.equal(scan('<object data="/one.pdf"></object><embed src="/two.pdf">').items.length, 2);
});
test('opaque endpoint with filename parameter', () => {
  assert.equal(scan('<a href="/get?id=123&amp;filename=slides.pptx">File</a>').items[0].name, 'slides.pptx');
});
test('opaque endpoint with download attribute is supported', () => {
  const item = scan('<a href="/get?id=123" download="slides.pdf">File</a>').items[0];
  assert.equal(item.name, 'slides.pdf');
  assert.equal(item.url, 'https://example.edu/get?id=123');
});
test('empty download attribute still identifies a download control', () => {
  assert.equal(scan('<a href="/get?id=123" download>Lecture notes</a>').items[0].name, 'Lecture notes');
});
test('ordinary link label cannot turn a page into a file', () => {
  assert.equal(scan('<a href="/course/123">slides.pdf</a>').items.length, 0);
});
test('walks nested open shadow roots', () => {
  const dom = makePage('<div id="outer"></div>');
  try {
    const first = dom.window.document.querySelector('#outer').attachShadow({mode: 'open'});
    first.innerHTML = '<div id="inner"></div>';
    first.querySelector('#inner').attachShadow({mode: 'open'}).innerHTML = '<a href="/notes.docx">Notes</a>';
    assert.equal(useDocument(dom.window.document, () => scanMaterials()).items[0].name, 'notes.docx');
  } finally {dom.window.close();}
});
test('closed shadow roots remain unsupported', () => {
  const dom = makePage('<div id="host"></div>');
  try {
    dom.window.document.querySelector('#host').attachShadow({mode: 'closed'}).innerHTML = '<a href="/secret.pdf">File</a>';
    assert.equal(useDocument(dom.window.document, () => scanMaterials()).items.length, 0);
  } finally {dom.window.close();}
});
test('JavaScript-only download button remains unsupported', () => {
  assert.equal(scan('<button type="button">Download</button>').items.length, 0);
});
test('temporary credentials from S3-style query mark the link temporary', () => {
  const item = scan('<a href="/paper.pdf?X-Amz-Signature=example&amp;X-Amz-Expires=60">File</a>').items[0];
  assert.equal(item.signed, true);
});

test('display:contents shadow host is traversed despite having no own layout box', () => {
  const dom=makePage('<div id="host" style="display:contents"></div>');
  try {
    const host=dom.window.document.querySelector('#host');
    host.getClientRects=()=>[];
    host.attachShadow({mode:'open'}).innerHTML='<a href="/contents.pdf">File</a>';
    assert.equal(useDocument(dom.window.document,()=>scanMaterials()).items[0].name,'contents.pdf');
  } finally {dom.window.close();}
});
