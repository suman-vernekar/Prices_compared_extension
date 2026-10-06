/**
 * PricePulse - Background Service Worker (Manifest V3)
 * Orchestrates extension lifecycle, event routing, toolbar badge updates,
 * and storage synchronization.
 */

// Import storage and API utilities in Service Worker scope
importScripts('/utils/storage.js', '/utils/api.js');

console.log('[PricePulse SW] Service Worker started.');

// Lifecycle: Install & Update
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[PricePulse SW] Extension installed/updated. Reason:', details.reason);
  try {
    const existing = await StorageUtil.get([StorageUtil.KEYS.TRACKING_ENABLED]);
    if (existing[StorageUtil.KEYS.TRACKING_ENABLED] === undefined) {
      await StorageUtil.set({
        [StorageUtil.KEYS.TRACKING_ENABLED]: true,
        [StorageUtil.KEYS.HISTORY_LOG]: [],
        [StorageUtil.KEYS.OBSERVED_PRODUCT]: null
      });
    }
  } catch (err) {
    console.error('[PricePulse SW] Failed to initialize storage:', err);
  }
});

// Central Runtime Message Router
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender.tab ? sender.tab.id : null;
  console.log(`[PricePulse SW] Handling action [${message.type}] from tab ${tabId || 'popup'}`);

  switch (message.type) {
    case 'PING':
      sendResponse({ status: 'PONG', timestamp: Date.now() });
      return false;

    case 'PRODUCT_DETECTED':
      handleProductDetected(message.payload, tabId)
        .then((res) => sendResponse({ success: true, ...res }))
        .catch((err) => sendResponse({ success: false, error: err.message }));
      return true; // Keep message channel open for async response

    case 'PRICE_CHANGED':
      handlePriceChange(message.payload, tabId)
        .then((res) => sendResponse({ success: true, ...res }))
        .catch((err) => sendResponse({ success: false, error: err.message }));
      return true;

    case 'GET_STATE':
      StorageUtil.get(null)
        .then((data) => sendResponse({ success: true, data }))
        .catch((err) => sendResponse({ success: false, error: err.message }));
      return true;

    case 'CLEAR_HISTORY':
      StorageUtil.clearHistory()
        .then(() => {
          chrome.action.setBadgeText({ text: '' });
          sendResponse({ success: true });
        })
        .catch((err) => sendResponse({ success: false, error: err.message }));
      return true;

    default:
      console.warn('[PricePulse SW] Unknown message type received:', message.type);
      sendResponse({ success: false, error: 'Unknown message action' });
      return false;
  }
});

/**
 * Handle initial product detection on active page
 */
async function handleProductDetected(payload, tabId) {
  if (!payload) return;
  await StorageUtil.set({
    [StorageUtil.KEYS.OBSERVED_PRODUCT]: payload
  });

  if (tabId) {
    chrome.action.setBadgeBackgroundColor({ tabId, color: '#3b82f6' });
    chrome.action.setBadgeText({ tabId, text: 'LIVE' });
  }

  // Discretely sync with Node.js Express backend if reachable
  self.PricePulse?.ApiClient?.syncProduct(payload).catch(() => {});

  return { status: 'registered' };
}

/**
 * Handle real-time price change reported by Content Script
 */
async function handlePriceChange(payload, tabId) {
  if (!payload || !payload.price) return;

  const history = await StorageUtil.addObservation(payload);

  // Update extension badge to visually alert the user of a price drop
  if (tabId) {
    chrome.action.setBadgeBackgroundColor({ tabId, color: '#10b981' });
    chrome.action.setBadgeText({ tabId, text: 'DROP' });
  }

  // Sync price observation with Node.js Express backend
  self.PricePulse?.ApiClient?.syncPriceObservation(payload).catch(() => {});

  console.log(`[PricePulse SW] Stored price transition. New history size: ${history.length}`);
  return { historySize: history.length, latest: payload };
}
