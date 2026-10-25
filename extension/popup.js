import {scanMaterials, safeFilename} from './extractor.js';
import {describeDownload} from './download-state.js';
import {messages} from './messages.js';

// Injectable dependencies make the real controller testable without browser permissions.
export function mountPopup({doc = document, browser = globalThis.chrome, clipboard = navigator.clipboard} = {}) {
  const status = doc.querySelector('#status');
  const list = doc.querySelector('#items');
  const scanButton = doc.querySelector('#scan');
  const downloads = new Map();
  const api = browser?.downloads;
  let progressTimer;
  function stopPolling() {
    if (progressTimer !== undefined) clearInterval(progressTimer);
    progressTimer = undefined;
  }

  function updateDownload(item) {
    const view = downloads.get(item.id);
    if (!view) return;
    view.textContent = describeDownload(item);
    if (item.state === 'complete' || item.state === 'interrupted') downloads.delete(item.id);
    if (!downloads.size) stopPolling();
  }

  async function refreshDownload(id) {
    const view = downloads.get(id);
    if (!view) return;
    try {
      const [item] = await api.search({id});
      if (item) updateDownload(item);
      else view.textContent = messages.statusUnknown;
    } catch { view.textContent = messages.statusUnknown; }
  }

  function onChanged(delta) {
    if (downloads.has(delta.id)) void refreshDownload(delta.id);
  }

  function render(item) {
    const article = doc.createElement('article'); article.className = 'item';
    const title = doc.createElement('div'); title.className = 'filename'; title.textContent = item.name;
    const meta = doc.createElement('div'); meta.className = 'meta';
    meta.textContent = item.host + (item.signed ? ' · ' + messages.signed : '');
    // The extraction path is available as a tooltip for debugging and handoff.
    meta.title = item.source;
    const actions = doc.createElement('div'); actions.className = 'actions';
    const result = doc.createElement('p'); result.className = 'result'; result.setAttribute('role', 'status');
    const download = doc.createElement('button'); download.type = 'button'; download.textContent = messages.download;
    download.onclick = async () => {
      download.disabled = true;
      result.textContent = messages.starting;
      let id;
      try {
        id = await api.download({url: item.url, filename: safeFilename(item.name), saveAs: true, conflictAction: 'uniquify'});
      } catch {
        result.textContent = messages.startFailed;
        download.disabled = false;
        return;
      }
      downloads.set(id, result);
      result.textContent = messages.queued;
      // Chrome onChanged does not fire for bytesReceived alone.
      if (progressTimer === undefined) {
        progressTimer = setInterval(() => {
          for (const trackedId of downloads.keys()) void refreshDownload(trackedId);
        }, 1000);
      }
      // Failure to read progress must not be reported as failure to start a download.
      await refreshDownload(id);
      download.disabled = false;
    };
    const copy = doc.createElement('button'); copy.type = 'button'; copy.textContent = messages.copy; copy.className = 'secondary';
    copy.onclick = async () => {
      try { await clipboard.writeText(item.url); result.textContent = messages.copied; }
      catch { result.textContent = messages.copyFailed; }
    };
    actions.append(download, copy); article.append(title, meta, actions, result); list.append(article);
  }

  async function scan() {
    scanButton.disabled = true;
    stopPolling();
    downloads.clear();
    list.replaceChildren();
    status.classList.remove('error');
    status.textContent = messages.scanning;
    try {
      const [tab] = await browser.tabs.query({active: true, currentWindow: true});
      if (!Number.isInteger(tab?.id) || !/^https?:\/\//i.test(tab.url || '')) {
        status.textContent = messages.restricted;
        return;
      }
      const results = await browser.scripting.executeScript({target: {tabId: tab.id}, func: scanMaterials, args: [tab.url]});
      const result = results[0]?.result;
      if (!result || !Array.isArray(result.items)) throw new Error('Missing extraction result');
      const items = result.items;
      status.textContent = items.length ? messages.found(items.length) : messages.empty;
      if (result.warnings?.includes('unreadableFrame')) status.textContent += ' ' + messages.partial;
      if (result.warnings?.some(code => code.endsWith('Limit'))) status.textContent += ' ' + messages.limited;
      items.forEach(render);
    } catch {
      status.textContent = messages.scanFailed;
      status.classList.add('error');
    } finally { scanButton.disabled = false; }
  }

  if (!api || !browser.scripting || !browser.tabs) {
    status.textContent = messages.unavailable;
    scanButton.disabled = true;
    return {ready: Promise.resolve(), dispose() {}};
  }
  api.onChanged.addListener(onChanged);
  scanButton.addEventListener('click', scan);
  return {
    ready: scan(),
    dispose() {
      api.onChanged.removeListener(onChanged);
      scanButton.removeEventListener('click', scan);
      stopPolling();
      downloads.clear();
    }
  };
}
