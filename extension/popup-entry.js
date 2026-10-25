import {mountPopup} from './popup.js';
const app = mountPopup();
window.addEventListener('unload', () => app.dispose(), {once: true});
