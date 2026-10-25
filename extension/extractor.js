// Self-contained: Chrome serializes this function into the active page.
// Keep helpers inside this function; do not reference imported module state.
export function scanMaterials(pageBase) {
  const found = new Map();
  const visited = new Set();
  const warnings = new Set();
  const extensionPattern = /\.(pdf|pptx?|docx?|xlsx?|zip|rar|7z|txt|csv|epub|odt|ods|odp)$/i;
  let inspectedNodes = 0;

  function decodeName(value) {
    try { return decodeURIComponent(value); } catch { return value; }
  }

  function add(raw, base, label, source, explicitDownload = false, depth = 0) {
    if (!raw) return;
    if (depth > 4) { warnings.add('nestedLimit'); return; }
    let url;
    try { url = new URL(raw, base); } catch { return; }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return;
    // Decode the wrapper once. Never decode or rebuild a signed file URL's query.
    const nested = url.searchParams.get('file');
    if (nested && /(?:pdf[-/]?viewer|viewer\.html)/i.test(url.pathname)) {
      add(nested, url.href, label, source + ' → file 参数', explicitDownload, depth + 1);
      return;
    }
    const suppliedName = url.searchParams.get('name') || url.searchParams.get('filename') || '';
    const tail = decodeName(url.pathname.split('/').pop() || '');
    const filePath = extensionPattern.test(tail);
    const namedFile = extensionPattern.test(suppliedName.trim());
    const downloadPath = /\/download\/file\//i.test(url.pathname);
    if (!filePath && !namedFile && !downloadPath && !explicitDownload) return;
    // Ordinary link text alone is not evidence of a file.
    const name = (explicitDownload && label?.trim()) || suppliedName || (filePath ? tail : '') || label?.trim() || '课程资料';
    if (found.has(url.href)) return;
    if (found.size >= 250) { warnings.add('resultLimit'); return; }
    const signed = [...url.searchParams.keys()].some(key => /^(token|signature|sig|expires|timestamp|x-amz-signature|x-goog-signature)$/i.test(key));
    found.set(url.href, {url: url.href, name, source, host: url.hostname, signed});
  }

  function visible(element) {
    if (element.hidden || element.getAttribute('aria-hidden') === 'true') return false;
    const style = element.ownerDocument?.defaultView?.getComputedStyle?.(element);
    if (typeof element.getClientRects === 'function' && !element.getClientRects().length && style?.display !== 'contents') return false;
    return !style || (style.display !== 'none' && style.visibility !== 'hidden' && style.visibility !== 'collapse');
  }

  function walk(root, fallbackBase, depth = 0) {
    if (!root || visited.has(root)) return;
    if (depth > 12) { warnings.add('nestedLimit'); return; }
    visited.add(root);
    const base = root.baseURI || fallbackBase;
    // Avoid materializing every element on a large page.
    const doc = root.ownerDocument || root;
    const walker = doc.createTreeWalker(root, 1); // NodeFilter.SHOW_ELEMENT
    let el;
    while ((el = walker.nextNode())) {
      if (++inspectedNodes > 20000) { warnings.add('nodeLimit'); return; }
      const tag = el.tagName;
      if (['A', 'IFRAME', 'EMBED', 'OBJECT'].includes(tag) && visible(el)) {
        const attr = tag === 'A' ? 'href' : tag === 'OBJECT' ? 'data' : 'src';
        const download = tag === 'A' && el.hasAttribute('download');
        const label = el.getAttribute('download') || el.getAttribute('title') || el.textContent;
        add(el.getAttribute(attr), base, label, tag.toLowerCase() + (el.id ? '#' + el.id : '') + '[' + attr + ']', download);
        if (tag === 'IFRAME') {
          try {
            if (el.contentDocument) walk(el.contentDocument, base, depth + 1);
            else warnings.add('unreadableFrame');
          } catch { warnings.add('unreadableFrame'); }
        }
      }
      if (el.shadowRoot && visible(el)) walk(el.shadowRoot, base, depth + 1);
      if (inspectedNodes > 20000) return;
    }
  }

  // Also handle a previewer opened as a normal top-level web page.
  add(pageBase || document.URL, document.baseURI || pageBase, document.title, '当前页面');
  walk(document, document.baseURI || pageBase);
  return {items: [...found.values()], title: document.title, warnings: [...warnings]};
}

export function safeFilename(name) {
  let clean = String(name || '课程资料').normalize('NFC')
    .replace(/[<>:"/\\|?*\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g, '_')
    .trim().replace(/^\.+/, '').replace(/[. ]+$/, '');
  if (!clean) clean = '课程资料';
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(clean)) clean = '_' + clean;
  const suffix = clean.match(/\.[a-z0-9]{1,10}$/i)?.[0] || '';
  const stem = suffix ? clean.slice(0, -suffix.length) : clean;
  const encoder = new TextEncoder();
  let result = '';
  let bytes = encoder.encode(suffix).length;
  for (const char of stem) {
    const size = encoder.encode(char).length;
    if (bytes + size > 220) break;
    result += char;
    bytes += size;
  }
  return (result || '资料') + suffix;
}
