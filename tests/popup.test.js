import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {mountPopup} from '../extension/popup.js';
import {messages} from '../extension/messages.js';

const html = readFileSync(new URL('../extension/popup.html', import.meta.url), 'utf8');
const item = {name:'<img src=x onerror=alert(1)>.pdf', url:'https://cdn.example.edu/a.pdf?token=a%2Bb', host:'cdn.example.edu', source:'iframe[src] → file 参数', signed:true};
function fixture(overrides = {}) {
  const dom = new JSDOM(html, {url:'https://preview.example/'});
  let listener; const calls = {download:[],copy:[],search:[],injection:[]};
  const browser = {
    tabs:{query: async () => [{id:1,url:'https://example.edu/course/'}]},
    scripting:{executeScript: async args => {calls.injection.push(args); return [{result:{items:[item],warnings:[]}}];}},
    downloads:{
      download: async args => {calls.download.push(args); return 5;},
      search: async args => {calls.search.push(args);return [{id:5,state:'in_progress',totalBytes:100,bytesReceived:10}];},
      onChanged:{addListener(fn){listener = fn;},removeListener(){listener = undefined;}}
    }
  };
  overrides(browser);
  const clipboard = {writeText: async value => {calls.copy.push(value);}};
  const app = mountPopup({doc:dom.window.document,browser,clipboard});
  return {doc:dom.window.document,app,browser,calls,clipboard,emit:delta=>listener?.(delta),close(){app.dispose();dom.window.close();}};
}
const setup = (override = () => {}) => fixture(override);

test('renders untrusted filename as text and copies exact signed URL', async () => {
  const f = setup();
  try {
    await f.app.ready;
    assert.equal(f.doc.querySelector('.filename').textContent,item.name);
    assert.equal(f.doc.querySelector('#items img'),null);
    await f.doc.querySelectorAll('.actions button')[1].onclick();
    assert.deepEqual(f.calls.copy,[item.url]);
    assert.equal(f.doc.querySelector('.result').textContent,messages.copied);
    assert.equal(f.calls.injection[0].args[0],'https://example.edu/course/');
  } finally {f.close();}
});
test('download receives exact URL, safe name and native save-dialog option', async () => {
  const f = setup();
  try {
    await f.app.ready;
    await f.doc.querySelector('.actions button').onclick();
    assert.equal(f.calls.download[0].url,item.url);
    assert.equal(f.calls.download[0].saveAs,true);
    assert.equal(f.calls.download[0].conflictAction,'uniquify');
    assert.ok(!/[<>/]/.test(f.calls.download[0].filename));
    assert.equal(f.doc.querySelector('.result').textContent,messages.progress(10));
  } finally {f.close();}
});
test('progress lookup failure does not falsely claim download failed', async () => {
  const f = setup(b => {b.downloads.search = async () => {throw Error('query failed');};});
  try {
    await f.app.ready;await f.doc.querySelector('.actions button').onclick();
    assert.equal(f.doc.querySelector('.result').textContent,messages.statusUnknown);
    f.emit({id:5,state:{current:'complete'}});
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(f.doc.querySelector('.result').textContent,messages.statusUnknown);
  } finally {f.close();}
});
test('completed and interrupted download events update UI', async () => {
  for (const state of ['complete','interrupted']) {
    const f = setup();
    try {
      await f.app.ready;await f.doc.querySelector('.actions button').onclick();
      f.browser.downloads.search = async () => [{id:5,state,mime:'application/pdf',fileSize:1024}];
      f.emit({id:5,state:{current:state}});
      await new Promise(resolve => setImmediate(resolve));
      assert.equal(f.doc.querySelector('.result').textContent,state==='complete'?messages.complete:messages.interrupted);
    } finally {f.close();}
  }
});
test('canceled or rejected start reenables button', async () => {
  const f = setup(b => {b.downloads.download=async()=>{throw Error('canceled');};});
  try {
    await f.app.ready;const button=f.doc.querySelector('.actions button');await button.onclick();
    assert.equal(button.disabled,false);assert.equal(f.doc.querySelector('.result').textContent,messages.startFailed);
  } finally {f.close();}
});
test('clipboard errors are reported', async () => {
  const f = setup();
  try {
    await f.app.ready;f.clipboard.writeText=async()=>{throw Error('denied');};
    await f.doc.querySelectorAll('.actions button')[1].onclick();
    assert.equal(f.doc.querySelector('.result').textContent,messages.copyFailed);
  } finally {f.close();}
});
test('restricted tabs and denied injection have useful errors', async () => {
  const restricted=setup(b=>{b.tabs.query=async()=>[{id:1,url:'chrome://settings'}];});
  try {await restricted.app.ready;assert.equal(restricted.doc.querySelector('#status').textContent,messages.restricted);} finally {restricted.close();}
  const denied=setup(b=>{b.scripting.executeScript=async()=>{throw Error('permission denied');};});
  try {await denied.app.ready;assert.equal(denied.doc.querySelector('#status').textContent,messages.scanFailed);} finally {denied.close();}
});
test('empty scan, partial results and rescan update current UI', async () => {
  const f=setup(b=>{b.scripting.executeScript=async()=>[{result:{items:[],warnings:['unreadableFrame','resultLimit']}}];});
  try {
    await f.app.ready;assert.ok(f.doc.querySelector('#status').textContent.includes(messages.empty));
    assert.ok(f.doc.querySelector('#status').textContent.includes(messages.limited));
    f.browser.scripting.executeScript=async()=>[{result:{items:[item],warnings:[]}}];
    f.doc.querySelector('#scan').click();await new Promise(resolve=>setImmediate(resolve));
    assert.equal(f.doc.querySelectorAll('.item').length,1);
  } finally {f.close();}
});

test('polls byte progress while popup is open even without onChanged events', async () => {
  const f=setup();
  try {
    await f.app.ready;await f.doc.querySelector('.actions button').onclick();
    f.browser.downloads.search=async()=>[{id:5,state:'in_progress',bytesReceived:70,totalBytes:100}];
    await new Promise(resolve=>setTimeout(resolve,1100));
    assert.equal(f.doc.querySelector('.result').textContent,messages.progress(70));
  } finally {f.close();}
});
