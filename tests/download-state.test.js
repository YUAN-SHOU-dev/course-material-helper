import {test} from 'node:test';
import assert from 'node:assert/strict';
import {describeDownload} from '../extension/download-state.js';
import {messages} from '../extension/messages.js';

test('completion, zero bytes and login/error response are distinct', () => {
  assert.equal(describeDownload({state:'complete', mime:'application/pdf', fileSize:1024}), messages.complete);
  assert.equal(describeDownload({state:'complete', mime:'application/pdf', fileSize:0}), messages.emptyFile);
  for (const mime of ['text/html', 'application/xhtml+xml', 'application/json; charset=utf-8']) {
    assert.equal(describeDownload({state:'complete', mime, fileSize:1024}), messages.unexpectedContent);
  }
});
test('does not claim completion at 100% bytes before completion event', () => {
  assert.equal(describeDownload({state:'in_progress',totalBytes:10,bytesReceived:10}), messages.progress(99));
});
test('cancellation, pause, interruption and safety review are distinct', () => {
  assert.equal(describeDownload({state:'interrupted', error:'USER_CANCELED'}), messages.cancelled);
  assert.equal(describeDownload({state:'interrupted', error:'NETWORK_FAILED'}), messages.interrupted);
  assert.equal(describeDownload({state:'in_progress', paused:true}), messages.paused);
  assert.equal(describeDownload({state:'complete', danger:'uncommon'}), messages.blocked);
});
