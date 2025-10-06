// content.js - following your working approach with batch processing
let currentStatus = 'Waiting';
let isProcessing = false;
let debugMode = true; // Set to true to see console logs for debugging
let autoSubmitTimer = null; // For timer-based submission

function log(message) {
  if (debugMode) {
    console.log(`[Sora Prompt Manager] ${message}`);
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'sendPrompt') {
    log('Received request to send prompt: ' + request.prompt);
    const success = submitPrompt(request.prompt);
    sendResponse({ success: success });
    return true;
  } else if (request.action === 'enableAutoSubmit') {
    // Start the timer-based auto submission
    log('Auto-submit timer enabled');
    startAutoSubmitTimer();
    sendResponse({ success: true });
    return true;
  } else if (request.action === 'disableAutoSubmit') {
    // Stop the timer-based auto submission
    log('Auto-submit timer disabled');
    stopAutoSubmitTimer();
    sendResponse({ success: true });
    return true;
  }
});

// Initialize connection to page
function initializeConnection() {
  log('Initializing connection to Sora page');
  
  // Check if we're on the right page - USING YOUR URL PATTERNS
  if (window.location.href.includes('sora.com/library') || 
      window.location.href.includes('openai.com/sora')) {
    log('On Sora page, setting up observers');
    
    // Set up a mutation observer to detect changes to the page
    const observer = new MutationObserver(function(mutations) {
      checkVideoStatus();
    });
    
    // Start observing the document body for changes
    observer.observe(document.body, { 
      childList: true, 
      subtree: true 
    });
    
    // Initial status check
    checkVideoStatus();
    
    // Send connected status to background
    chrome.runtime.sendMessage({
      action: 'updateStatus',
      status: 'Connected to Sora page',
      isProcessing: false
    });
    
    // Check if auto-submit should be enabled
    chrome.storage.local.get(['settings', 'promptQueue'], function(data) {
      const settings = data.settings || { autoSubmit: true };
      const promptQueue = data.promptQueue || [];
      
      if (settings.autoSubmit && promptQueue.length > 0) {
        log('Auto-submit enabled from settings and prompts exist in queue');
        startAutoSubmitTimer();
      }
    });
    
    return true;
  } else {
    log('Not on Sora page');
    chrome.runtime.sendMessage({
      action: 'updateStatus',
      status: 'Not on Sora page',
      isProcessing: false
    });
    return false;
  }
}

// Find the prompt input field using YOUR WORKING APPROACH
function findPromptInput() {
  // Using your selectors that work
  const possibleSelectors = [
    'textarea[placeholder*="Describe"]',
    'textarea[placeholder*="prompt"]',
    'textarea[placeholder*="video"]',
    'textarea[aria-label*="prompt"]',
    'input[placeholder*="Describe"]',
    'input[placeholder*="prompt"]',
    'div[contenteditable="true"]',
  ];
  
  for (const selector of possibleSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      log('Found prompt input with selector: ' + selector);
      return element;
    }
  }
  
  log('Could not find prompt input field');
  return null;
}

// Find the submit button using YOUR WORKING APPROACH
function findSubmitButton() {
  // Using your selectors that work
  const possibleSelectors = [
    'button[type="submit"]',
    'button:contains("Generate")',
    'button:contains("Create")',
    'button:contains("Submit")',
    'button.submit-button',
    'button[aria-label*="submit"]',
    'button[aria-label*="generate"]',
  ];
  
  // Custom contains selector from your code
  for (const selector of possibleSelectors) {
    if (selector.includes(':contains(')) {
      const textToFind = selector.match(/:contains\("(.+)"\)/)[1];
      const buttons = Array.from(document.querySelectorAll('button'));
      for (const button of buttons) {
        if (button.textContent.includes(textToFind)) {
          log('Found submit button with text: ' + textToFind);
          return button;
        }
      }
    } else {
      const element = document.querySelector(selector);
      if (element) {
        log('Found submit button with selector: ' + selector);
        return element;
      }
    }
  }
  
  log('Could not find submit button');
  return null;
}

// Check for video completion status - YOUR WORKING APPROACH
function checkVideoStatus() {
  log('Checking video status');
  
  // Try to find status indicators using your approach
  const statusIndicators = [
    document.querySelector('[aria-label*="status"]'),
    document.querySelector('[data-status]'),
    document.querySelector('.status-indicator'),
    document.querySelector('.progress-indicator'),
    // Look for text content that might indicate status
    Array.from(document.querySelectorAll('div, span, p')).find(el => 
      el.textContent && (
        el.textContent.includes('Processing') || 
        el.textContent.includes('Generating') ||
        el.textContent.includes('Completed') ||
        el.textContent.includes('Ready') ||
        el.textContent.includes('Done')
      )
    )
  ].filter(Boolean)[0]; // Get the first non-null element
  
  if (statusIndicators) {
    const statusText = statusIndicators.textContent.trim();
    log('Found status: ' + statusText);
    
    if (statusText.includes('Complet') || 
        statusText.includes('Ready') || 
        statusText.includes('Done') ||
        statusText.includes('Finish')) {
      currentStatus = 'Completed';
      isProcessing = false;
      
      // We don't use checkNextPrompt here since we're using timer-based approach
    } else if (statusText.includes('Process') || 
              statusText.includes('Generat') || 
              statusText.includes('Creating') ||
              statusText.includes('Working')) {
      currentStatus = 'Processing';
      isProcessing = true;
    } else {
      currentStatus = 'Ready for input';
      isProcessing = false;
    }
  } else {
    // Alternative way to detect if a video is present
    const videoElement = document.querySelector('video');
    if (videoElement) {
      log('Found video element, assuming generation is complete');
      currentStatus = 'Video available';
      isProcessing = false;
      
      // We don't use checkNextPrompt here since we're using timer-based approach
    } else {
      log('No status indicator or video found');
      currentStatus = 'Status unknown';
    }
  }
  
  // Send current status to background script
  chrome.runtime.sendMessage({
    action: 'updateStatus',
    status: currentStatus,
    isProcessing: isProcessing
  });
}

// Function to submit prompt to Sora - YOUR WORKING APPROACH
function submitPrompt(promptText) {
  try {
    log('Attempting to submit prompt: ' + promptText);
    // Find the prompt input field and submit button
    const promptInput = findPromptInput();
    const submitButton = findSubmitButton();
    
    if (!promptInput) {
      log('Error: No prompt input field found');
      return false;
    }
    
    if (!submitButton) {
      log('Error: No submit button found');
      return false;
    }
    
    // Set the prompt value based on element type
    if (promptInput.tagName.toLowerCase() === 'textarea' || 
        promptInput.tagName.toLowerCase() === 'input') {
      // For standard input elements
      log('Setting value for standard input element');
      
      // Use the property descriptor approach
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        promptInput.constructor.prototype, 'value'
      ).set;
      
      nativeInputValueSetter.call(promptInput, promptText);
      
      // Trigger input event
      const inputEvent = new Event('input', { bubbles: true });
      promptInput.dispatchEvent(inputEvent);
      
      // Also trigger change event
      const changeEvent = new Event('change', { bubbles: true });
      promptInput.dispatchEvent(changeEvent);
    } else if (promptInput.getAttribute('contenteditable') === 'true') {
      // For contenteditable divs
      log('Setting value for contenteditable element');
      promptInput.innerHTML = promptText;
      
      // Trigger input event
      const inputEvent = new Event('input', { bubbles: true });
      promptInput.dispatchEvent(inputEvent);
    }
    
    // Give a small delay before clicking the button
    setTimeout(() => {
      log('Clicking submit button');
      submitButton.click();
      
      // Update status
      currentStatus = 'Prompt submitted';
      isProcessing = true;
      
      chrome.runtime.sendMessage({
        action: 'updateStatus',
        status: currentStatus,
        isProcessing: isProcessing
      });
    }, 500);
    
    return true;
  } catch (error) {
    log('Error sending prompt: ' + error.message);
    console.error('Error sending prompt:', error);
    return false;
  }
}

// TIMER-BASED AUTO SUBMIT - NEW FUNCTIONALITY
function startAutoSubmitTimer() {
  // Clear any existing timer
  stopAutoSubmitTimer();
  
  // Get settings to determine the delay
  chrome.storage.local.get('settings', function(data) {
    const settings = data.settings || { autoSubmitDelay: 65 };
    // Default to 65 seconds if not specified
    const delay = (settings.autoSubmitDelay || 65) * 1000;
    
    log(`Starting auto-submit timer with ${delay}ms delay`);
    
    // Set the timer
    autoSubmitTimer = setTimeout(function() {
      submitNextPrompt();
    }, delay);
  });
}

// Stop auto-submit timer
function stopAutoSubmitTimer() {
  if (autoSubmitTimer) {
    log('Stopping auto-submit timer');
    clearTimeout(autoSubmitTimer);
    autoSubmitTimer = null;
  }
}

// Submit next prompt from queue
function submitNextPrompt() {
  log('Checking for next prompt (timer-based)');
  
  chrome.storage.local.get('promptQueue', function(data) {
    const promptQueue = data.promptQueue || [];
    
    if (promptQueue.length > 0) {
      // Get the first prompt from the queue
      const nextPrompt = promptQueue.shift();
      
      log('Auto-submitting next prompt from queue');
      
      // Update the queue
      chrome.storage.local.set({ promptQueue: promptQueue }, function() {
        // Send the next prompt
        const success = submitPrompt(nextPrompt.text);
        
        if (success) {
          log('Successfully submitted prompt from queue');
          
          // Start the timer for the next prompt if there are more in queue
          if (promptQueue.length > 0) {
            startAutoSubmitTimer();
          }
        } else {
          log('Failed to submit prompt, will retry');
          
          // Put the prompt back in the queue
          chrome.storage.local.get('promptQueue', function(data) {
            const currentQueue = data.promptQueue || [];
            currentQueue.unshift(nextPrompt);
            chrome.storage.local.set({ promptQueue: currentQueue });
            
            // Try again after some delay
            setTimeout(startAutoSubmitTimer, 10000);
          });
        }
      });
    } else {
      log('No prompts in queue');
    }
  });
}

// This function is kept for backward compatibility
function checkNextPrompt() {
  log('checkNextPrompt called - now using timer-based approach instead');
  // We now use timer-based approach, but keeping this for compatibility
}

// Set up periodic checking - YOUR WORKING APPROACH
chrome.storage.local.get('settings', function(data) {
  const settings = data.settings || { checkInterval: 10 };
  log(`Setting up status check every ${settings.checkInterval} seconds`);
  setInterval(checkVideoStatus, settings.checkInterval * 1000);
});

// Initialize on page load - YOUR WORKING APPROACH
window.addEventListener('load', function() {
  log('Page loaded, initializing connection');
  setTimeout(initializeConnection, 1500); // Wait for page to fully load
});

// Initialize immediately as well in case page is already loaded - YOUR WORKING APPROACH
initializeConnection();

// Function to help identify elements on the page - YOUR WORKING APPROACH
function debugPageElements() {
  console.log('=== SORA PROMPT MANAGER DEBUG ===');
  
  // Log all textareas
  console.log('All textareas:');
  document.querySelectorAll('textarea').forEach((el, i) => {
    console.log(`Textarea ${i}:`, {
      placeholder: el.placeholder,
      id: el.id,
      className: el.className,
      ariaLabel: el.getAttribute('aria-label')
    });
  });
  
  // Log all inputs
  console.log('All inputs:');
  document.querySelectorAll('input[type="text"]').forEach((el, i) => {
    console.log(`Input ${i}:`, {
      placeholder: el.placeholder,
      id: el.id,
      className: el.className,
      ariaLabel: el.getAttribute('aria-label')
    });
  });
  
  // Log all buttons
  console.log('All buttons:');
  document.querySelectorAll('button').forEach((el, i) => {
    console.log(`Button ${i}:`, {
      text: el.textContent.trim(),
      id: el.id,
      className: el.className,
      ariaLabel: el.getAttribute('aria-label')
    });
  });
  
  console.log('=== END DEBUG ===');
}

// Run debug automatically
setTimeout(debugPageElements, 3000);