import {messages} from './messages.js';

export function describeDownload(item) {
  if (item.state === 'interrupted') return item.error === 'USER_CANCELED' ? messages.cancelled : messages.interrupted;
  const danger = item.danger;
  if (danger && !['safe', 'accepted', 'allowlistedByPolicy', 'deepScannedSafe'].includes(danger)) return messages.blocked;
  if (item.state === 'complete') {
    if (/^(text\/html|application\/(xhtml\+xml|json|problem\+json))(;|$)/i.test(item.mime || '')) return messages.unexpectedContent;
    if (item.fileSize === 0 || item.totalBytes === 0) return messages.emptyFile;
    return messages.complete;
  }
  if (item.paused) return messages.paused;
  if (item.totalBytes > 0 && item.bytesReceived >= 0) return messages.progress(Math.min(99, Math.floor(100 * item.bytesReceived / item.totalBytes)));
  return messages.queued;
}
