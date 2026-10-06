/**
 * PricePulse - Popup Controller: popup.js
 * Interacts with StorageUtil, Content Scripts, and background services.
 */

document.addEventListener('DOMContentLoaded', async () => {
  const productCard = document.getElementById('product-card');
  const idleCard = document.getElementById('idle-card');
  const titleEl = document.getElementById('product-title');
  const priceEl = document.getElementById('product-price');
  const changePill = document.getElementById('price-change-pill');
  const statusBadge = document.getElementById('status-badge');
  const monitoringStatus = document.getElementById('monitoring-status');
  const eventList = document.getElementById('event-list');
  const eventCount = document.getElementById('event-count');
  const clearHistoryBtn = document.getElementById('clear-history-btn');
  const trackBtn = document.getElementById('track-btn');
  const retryBtn = document.getElementById('refresh-detection-btn');
  const targetPriceInput = document.getElementById('target-price-input');
  const saveTargetBtn = document.getElementById('save-target-btn');
  const targetFeedback = document.getElementById('target-feedback');
  const platformEl = document.getElementById('product-platform');
  const idEl = document.getElementById('product-id');
  const toggleObserverBtn = document.getElementById('toggle-observer-btn');
  const manualCheckBtn = document.getElementById('manual-check-btn');

  let activeTabId = null;
  let isCurrentlyMonitoring = true;

  /**
   * Render history list from Storage
   */
  async function refreshHistoryView() {
    try {
      const history = await StorageUtil.getHistory();
      eventCount.textContent = history.length;

      if (!history || history.length === 0) {
        eventList.innerHTML = '<li class="empty-state">No price changes recorded yet.</li>';
        return;
      }

      eventList.innerHTML = '';
      history.slice(0, 10).forEach((entry) => {
        const li = document.createElement('li');
        const priceVal = entry.formattedPrice || entry.rawPrice || (entry.price ? '₹' + entry.price : 'N/A');
        const timeFormatted = entry.recordedAt
          ? new Date(entry.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          : 'Recent';

        let deltaHtml = '';
        if (entry.percentageChange) {
          const isDrop = entry.percentageChange < 0;
          const arrow = isDrop ? '&darr;' : '&uarr;';
          const sign = entry.percentageChange > 0 ? '+' : '';
          const color = isDrop ? '#34d399' : '#f87171';
          deltaHtml = `<span style="font-size: 10px; font-weight: 700; color: ${color}; margin-left: 6px;">${arrow} ${sign}${entry.percentageChange}%</span>`;
        } else if (entry.previousPrice && entry.previousPrice !== entry.price) {
          deltaHtml = `<span class="price-delta" style="margin-left: 6px;">&darr; from ${entry.previousPrice}</span>`;
        }

        li.innerHTML = `
          <div>
            <span class="event-price">${priceVal}</span>
            ${deltaHtml}
          </div>
          <span class="event-time">${timeFormatted}</span>
        `;
        eventList.appendChild(li);
      });
    } catch (err) {
      console.error('[PricePulse Popup] Error reading history:', err);
    }
  }

  /**
   * Load stored target price
   */
  async function loadTargetPrice() {
    try {
      const data = await StorageUtil.get([StorageUtil.KEYS.TARGET_PRICE]);
      if (data && data[StorageUtil.KEYS.TARGET_PRICE]) {
        targetPriceInput.value = data[StorageUtil.KEYS.TARGET_PRICE];
      }
    } catch (err) {
      console.warn('[PricePulse Popup] Could not read target price:', err);
    }
  }

  /**
   * Query the active tab and inspect DOM product
   */
  async function inspectActiveTab() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs || tabs.length === 0) {
        showIdleState();
        return;
      }

      const tab = tabs[0];
      activeTabId = tab.id;

      // Ensure tab is an inspectable HTTP or file page
      if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
        showIdleState();
        return;
      }

      chrome.tabs.sendMessage(activeTabId, { type: 'GET_PAGE_PRODUCT' }, (response) => {
        if (chrome.runtime.lastError || !response || !response.product || !response.product.rawPrice) {
          // Fallback: check storage for recently cached state
          StorageUtil.get([StorageUtil.KEYS.OBSERVED_PRODUCT]).then((res) => {
            const cached = res[StorageUtil.KEYS.OBSERVED_PRODUCT];
            if (cached && cached.rawPrice) {
              renderProduct(cached, false);
            } else {
              showIdleState();
            }
          });
        } else {
          renderProduct(response.product, response.isMonitoring);
        }
      });
    } catch (err) {
      console.error('[PricePulse Popup] Tab query failed:', err);
      showIdleState();
    }
  }

  function renderProduct(product, isLive) {
    productCard.classList.remove('hidden');
    idleCard.classList.add('hidden');

    titleEl.textContent = product.title || 'Product on Active Page';
    priceEl.textContent = product.formattedPrice || product.rawPrice || product.newPrice || product.price || '--';

    if (platformEl) {
      platformEl.textContent = (product.platform || 'LOCAL-TEST').toUpperCase();
    }
    if (idEl) {
      idEl.textContent = product.productId ? '#' + product.productId : '';
    }

    if (changePill && product.percentageChange) {
      changePill.classList.remove('hidden');
      const isDrop = product.percentageChange < 0;
      const sign = product.percentageChange > 0 ? '+' : '';
      changePill.textContent = `${sign}${product.percentageChange}%`;
      changePill.className = `change-pill ${isDrop ? 'drop' : 'rise'}`;
    } else if (changePill) {
      changePill.classList.add('hidden');
    }

    isCurrentlyMonitoring = isLive;
    if (toggleObserverBtn) {
      toggleObserverBtn.textContent = isLive ? 'Pause Observer' : 'Resume Observer';
    }

    const indicatorEl = document.querySelector('.indicator');
    if (isLive) {
      statusBadge.textContent = 'LIVE';
      statusBadge.className = 'badge live';
      monitoringStatus.textContent = 'Active DOM Observer running';
      if (indicatorEl) indicatorEl.className = 'indicator active';
    } else {
      statusBadge.textContent = 'PAUSED';
      statusBadge.className = 'badge';
      monitoringStatus.textContent = 'Observer idle / paused';
      if (indicatorEl) indicatorEl.className = 'indicator';
    }
  }

  function showIdleState() {
    productCard.classList.add('hidden');
    idleCard.classList.remove('hidden');
    statusBadge.textContent = 'READY';
    statusBadge.className = 'badge';
  }

  // Event Handlers
  if (toggleObserverBtn) {
    toggleObserverBtn.addEventListener('click', () => {
      if (!activeTabId) return;
      const actionType = isCurrentlyMonitoring ? 'STOP_TRACKING' : 'START_TRACKING';
      chrome.tabs.sendMessage(activeTabId, { type: actionType }, (res) => {
        if (!chrome.runtime.lastError && res) {
          isCurrentlyMonitoring = !!res.isMonitoring;
          if (toggleObserverBtn) {
            toggleObserverBtn.textContent = isCurrentlyMonitoring ? 'Pause Observer' : 'Resume Observer';
          }
          if (isCurrentlyMonitoring) {
            statusBadge.textContent = 'LIVE';
            statusBadge.className = 'badge live';
            monitoringStatus.textContent = 'Active DOM Observer running';
          } else {
            statusBadge.textContent = 'PAUSED';
            statusBadge.className = 'badge';
            monitoringStatus.textContent = 'Observer idle / paused';
          }
        }
      });
    });
  }

  if (manualCheckBtn) {
    manualCheckBtn.addEventListener('click', () => {
      if (!activeTabId) return;
      manualCheckBtn.textContent = 'Checking...';
      chrome.tabs.sendMessage(activeTabId, { type: 'CHECK_PRICE' }, (res) => {
        setTimeout(() => { manualCheckBtn.textContent = 'Check Price'; }, 600);
        if (!chrome.runtime.lastError && res && res.product) {
          renderProduct(res.product, isCurrentlyMonitoring);
          refreshHistoryView();
        }
      });
    });
  }
  clearHistoryBtn.addEventListener('click', async () => {
    await StorageUtil.clearHistory();
    await refreshHistoryView();
  });

  saveTargetBtn.addEventListener('click', async () => {
    const val = targetPriceInput.value.trim();
    if (!val) return;

    await StorageUtil.set({ [StorageUtil.KEYS.TARGET_PRICE]: val });
    targetFeedback.classList.remove('hidden');
    setTimeout(() => {
      targetFeedback.classList.add('hidden');
    }, 2500);
  });

  trackBtn.addEventListener('click', () => {
    trackBtn.textContent = '✓ Active in Local Watchlist';
    trackBtn.style.background = '#059669';
    setTimeout(() => {
      trackBtn.textContent = 'Track Product in Dashboard';
      trackBtn.style.background = '';
    }, 2500);
  });

  if (retryBtn) {
    retryBtn.addEventListener('click', () => {
      inspectActiveTab();
    });
  }

  // Initial load
  await refreshHistoryView();
  await loadTargetPrice();
  await inspectActiveTab();
});
