// background.js with batch support
let currentStatus = 'Not connected';
let isProcessing = false;
let debugMode = true; // Set to true to see console logs for debugging

function log(message) {
  if (debugMode) {
    console.log(`[Sora Prompt Manager BG] ${message}`);
  }
}

// Store status when received from content script
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'updateStatus') {
    log(`Status update received: ${request.status}`);
    currentStatus = request.status;
    isProcessing = request.isProcessing;
  } else if (request.action === 'getStatus') {
    log(`Status requested, sending: ${currentStatus}`);
    sendResponse({
      status: currentStatus,
      isProcessing: isProcessing
    });
    return true;
  }
});

// When the extension is installed or updated
chrome.runtime.onInstalled.addListener(function() {
  log('Extension installed or updated');
  
  // Initialize default settings
  chrome.storage.local.get('settings', function(data) {
    if (!data.settings) {
      log('Initializing default settings');
      chrome.storage.local.set({
        settings: {
          checkInterval: 10,
          autoSubmit: true,
          autoSubmitDelay: 65  // Default 65 seconds
        }
      });
    } else if (!data.settings.autoSubmitDelay) {
      // Add autoSubmitDelay if it doesn't exist
      const updatedSettings = {
        ...data.settings,
        autoSubmitDelay: 65
      };
      chrome.storage.local.set({ settings: updatedSettings });
    }
  });
  
  // Initialize prompt queue if it doesn't exist
  chrome.storage.local.get('promptQueue', function(data) {
    if (!data.promptQueue) {
      log('Initializing empty prompt queue');
      chrome.storage.local.set({ promptQueue: [] });
    }
  });
});

// Listen for tab updates to detect when a user navigates to Sora
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (changeInfo.status === 'complete' && 
     (tab.url.includes('sora.com') || tab.url.includes('openai.com/sora'))) {
    log(`Detected navigation to Sora page: ${tab.url}`);
    
    // Reset status
    currentStatus = 'Connecting to Sora page...';
    isProcessing = false;
  }
});