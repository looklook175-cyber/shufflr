// Shufflr — Web app bridge (content script on shufflr-app.netlify.app)
// Receives SHUFFLR_SYNC_PLAYLISTS from Max via chrome.tabs.sendMessage and forwards to the page.

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'SHUFFLR_SYNC_PLAYLISTS') return;

  window.postMessage({
    type: 'SHUFFLR_SYNC_PLAYLISTS',
    source: 'shufflr-extension',
    payload: message.payload || [],
  }, '*');

  console.log('[Shufflr] bridge.js — forwarded playlist sync to web app');
  sendResponse({ ok: true });
  return true;
});
