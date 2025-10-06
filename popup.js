// popup.js with batch processing support, countdown timers, and sent tracking
document.addEventListener('DOMContentLoaded', function() {
  // Tab navigation
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active class from all tabs and content
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      
      // Add active class to clicked tab
      tab.classList.add('active');
      
      // Show corresponding content
      const tabName = tab.getAttribute('data-tab');
      document.getElementById(`${tabName}-tab`).classList.add('active');
    });
  });

  // Load prompts from storage
  loadPromptQueue();
  
  // Load settings
  loadSettings();
  
  // Add event listeners
  document.getElementById('add-prompt').addEventListener('click', addPromptToQueue);
  document.getElementById('send-prompt').addEventListener('click', sendPromptNow);
  document.getElementById('clear-queue').addEventListener('click', clearPromptQueue);
  document.getElementById('save-settings').addEventListener('click', saveSettings);
  
  // Check status from background
  checkStatus();
  
  // Start countdown timers
  initializeCountdownTimers();
  
  // Initial status check interval
  setInterval(checkStatus, 2000);
});

// Global variables for countdown timers
let statusIntervalCountdown = 0;
let autoSubmitCountdown = 0;
let countdownIntervalId = null;

// Function to initialize countdown timers
function initializeCountdownTimers() {
  chrome.storage.local.get('settings', function(data) {
    const settings = data.settings || {
      checkInterval: 10,
      autoSubmit: true,
      autoSubmitDelay: 65
    };
    
    // Initialize countdown values
    statusIntervalCountdown = settings.checkInterval;
    autoSubmitCountdown = settings.autoSubmitDelay;
    
    // Update countdown displays
    updateCountdownDisplays();
    
    // Clear any existing interval
    if (countdownIntervalId) {
      clearInterval(countdownIntervalId);
    }
    
    // Start interval for countdown updates
    countdownIntervalId = setInterval(updateCountdowns, 1000);
  });
}

// Function to update countdown values each second
function updateCountdowns() {
  // Update status interval countdown
  if (statusIntervalCountdown > 0) {
    statusIntervalCountdown--;
  } else {
    // Reset to initial value when it reaches zero
    chrome.storage.local.get('settings', function(data) {
      const settings = data.settings || { checkInterval: 10 };
      statusIntervalCountdown = settings.checkInterval;
    });
  }
  
  // Update auto-submit countdown if auto-submit is enabled
  chrome.storage.local.get(['settings', 'promptQueue'], function(data) {
    const settings = data.settings || { autoSubmit: true };
    const promptQueue = data.promptQueue || [];
    
    if (settings.autoSubmit && promptQueue.length > 0) {
      if (autoSubmitCountdown > 0) {
        autoSubmitCountdown--;
      } else {
        // Reset to initial value when it reaches zero
        autoSubmitCountdown = settings.autoSubmitDelay || 65;
      }
    }
    
    // Update the displays
    updateCountdownDisplays();
  });
}

// Function to update countdown displays in the UI
function updateCountdownDisplays() {
  // Elements to update in all tabs
  const countdownElements = {
    status: [
      document.getElementById('status-interval-countdown'),
      document.getElementById('status-interval-countdown-queue'),
      document.getElementById('status-interval-countdown-settings')
    ],
    autoSubmit: [
      document.getElementById('auto-submit-countdown'),
      document.getElementById('auto-submit-countdown-queue'),
      document.getElementById('auto-submit-countdown-settings')
    ]
  };
  
  // Update status interval countdown displays
  countdownElements.status.forEach(element => {
    if (element) {
      element.textContent = statusIntervalCountdown;
      
      // Add warning class if less than 3 seconds
      if (statusIntervalCountdown <= 3) {
        element.classList.add('warning');
      } else {
        element.classList.remove('warning');
      }
      
      // Add danger class if less than 1 second
      if (statusIntervalCountdown <= 1) {
        element.classList.add('danger');
      } else {
        element.classList.remove('danger');
      }
    }
  });
  
  // Update auto-submit countdown displays
  countdownElements.autoSubmit.forEach(element => {
    if (element) {
      element.textContent = autoSubmitCountdown;
      
      // Add warning class if less than 10 seconds
      if (autoSubmitCountdown <= 10) {
        element.classList.add('warning');
      } else {
        element.classList.remove('warning');
      }
      
      // Add danger class if less than 3 seconds
      if (autoSubmitCountdown <= 3) {
        element.classList.add('danger');
      } else {
        element.classList.remove('danger');
      }
    }
  });
}

// Function to parse multiple prompts from input text
function parseMultiplePrompts(inputText) {
  // Try to identify patterns that indicate multiple prompts
  // This regex matches patterns like:
  // **1. Title**
  // *"Prompt text here"*
  // or
  // **2. Another title**
  // "Prompt text here"
  const promptsArray = [];
  
  // Regular expression to match patterns
  const promptRegex = /(?:\*\*)?(\d+\.\s+[^\*\n]+)(?:\*\*)?[\s\n]*(?:\*|")([\s\S]+?)(?:\*|")/g;
  
  let match;
  while ((match = promptRegex.exec(inputText)) !== null) {
    // match[1] contains the title/header, match[2] contains the prompt text
    const title = match[1].trim();
    const promptText = match[2].trim();
    
    promptsArray.push({
      title: title,
      text: promptText,
      sentCount: 0,  // Số lần đã gửi
      isSent: false  // Trạng thái đã gửi
    });
  }
  
  // If we couldn't parse any structured prompts, treat the whole thing as one prompt
  if (promptsArray.length === 0) {
    promptsArray.push({
      title: "Prompt",
      text: inputText.trim(),
      sentCount: 0,  // Số lần đã gửi
      isSent: false  // Trạng thái đã gửi
    });
  }
  
  return promptsArray;
}

function addPromptToQueue() {
  // Check if we're in edit mode
  const addButton = document.getElementById('add-prompt');
  const editingIndex = addButton.getAttribute('data-editing-index');
  
  // If we're in edit mode, the button's onclick handler has been replaced
  // so we don't need to do anything here
  if (editingIndex !== null && editingIndex !== undefined) {
    return;
  }
  
  const inputText = document.getElementById('prompt-input').value.trim();
  if (inputText === '') return;
  
  // Parse for multiple prompts
  const prompts = parseMultiplePrompts(inputText);
  
  chrome.storage.local.get('promptQueue', function(data) {
    const promptQueue = data.promptQueue || [];
    
    // Add each parsed prompt to the queue
    prompts.forEach(prompt => {
      promptQueue.push({
        text: prompt.text,
        title: prompt.title || "Prompt",
        timestamp: Date.now(),
        sentCount: 0,
        isSent: false
      });
    });
    
    chrome.storage.local.set({ promptQueue: promptQueue }, function() {
      document.getElementById('prompt-input').value = '';
      loadPromptQueue();
      updateStatus(`Added ${prompts.length} prompt${prompts.length > 1 ? 's' : ''} to queue`);
      
      // Enable auto-submit timer if it's turned on
      chrome.storage.local.get('settings', function(data) {
        const settings = data.settings || { autoSubmit: true };
        
        if (settings.autoSubmit) {
          // Send message to content script to enable timer
          chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {
              action: 'enableAutoSubmit'
            });
          });
          
          // Reset auto-submit countdown
          chrome.storage.local.get('settings', function(data) {
            const settings = data.settings || { autoSubmitDelay: 65 };
            autoSubmitCountdown = settings.autoSubmitDelay;
            updateCountdownDisplays();
          });
        }
      });
    });
  });
}

function sendPromptNow() {
  const promptText = document.getElementById('prompt-input').value.trim();
  if (promptText === '') return;
  
  // Parse for multiple prompts - CẬP NHẬT
  const prompts = parseMultiplePrompts(promptText);
  const textToSend = prompts[0].text;
  
  // Kiểm tra nếu có nhiều hơn một prompt - CHỨC NĂNG MỚI
  const hasBatchPrompts = prompts.length > 1;
  
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {
      action: 'sendPrompt',
      prompt: textToSend
    }, function(response) {
      if (response && response.success) {
        // Nếu có multiple prompts, xử lý batch prompts - CHỨC NĂNG MỚI
        if (hasBatchPrompts) {
          // Lấy tất cả các prompts còn lại (trừ cái đầu tiên đã gửi)
          const remainingPrompts = prompts.slice(1);
          
          // Thêm các prompts còn lại vào queue
          chrome.storage.local.get('promptQueue', function(data) {
            const promptQueue = data.promptQueue || [];
            
            // Thêm các prompts còn lại vào queue
            remainingPrompts.forEach(prompt => {
              promptQueue.push({
                text: prompt.text,
                title: prompt.title || "Prompt",
                timestamp: Date.now(),
                sentCount: 0,
                isSent: false
              });
            });
            
            // Lưu queue đã cập nhật
            chrome.storage.local.set({ promptQueue: promptQueue }, function() {
              // Cập nhật hiển thị queue
              loadPromptQueue();
              
              // Xóa nội dung input và cập nhật status
              document.getElementById('prompt-input').value = '';
              updateStatus(`Đã gửi prompt đầu tiên và thêm ${remainingPrompts.length} prompt khác vào hàng đợi`);
              
              // Bật timer auto-submit nếu cần
              chrome.storage.local.get('settings', function(data) {
                const settings = data.settings || { autoSubmit: true };
                
                if (settings.autoSubmit) {
                  // Gửi message để bật auto-submit
                  chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'enableAutoSubmit'
                  });
                  
                  // Reset auto-submit countdown
                  autoSubmitCountdown = settings.autoSubmitDelay || 65;
                  updateCountdownDisplays();
                }
              });
            });
          });
        } else {
          // Nếu chỉ có một prompt, xử lý như bình thường
          document.getElementById('prompt-input').value = '';
          updateStatus('Prompt sent successfully');
          
          // Reset auto-submit countdown
          chrome.storage.local.get('settings', function(data) {
            const settings = data.settings || { autoSubmitDelay: 65 };
            autoSubmitCountdown = settings.autoSubmitDelay;
            updateCountdownDisplays();
          });
        }
      } else {
        updateStatus('Could not send prompt. Make sure you are on the Sora page.');
      }
    });
  });
}

function loadPromptQueue() {
  chrome.storage.local.get('promptQueue', function(data) {
    const promptQueue = data.promptQueue || [];
    const queueElement = document.getElementById('prompt-queue');
    
    queueElement.innerHTML = '';
    
    // Add clear queue button at the top
    if (promptQueue.length > 0) {
      const topClearButton = document.createElement('button');
      topClearButton.id = 'clear-queue-top';
      topClearButton.className = 'remove-prompt';
      topClearButton.textContent = 'Clear Queue';
      topClearButton.addEventListener('click', clearPromptQueue);
      queueElement.appendChild(topClearButton);
      
      // Add some spacing
      const spacer = document.createElement('div');
      spacer.style.marginBottom = '10px';
      queueElement.appendChild(spacer);
    }
    
    if (promptQueue.length === 0) {
      queueElement.innerHTML = '<p>No prompts in queue</p>';
      return;
    }
    
    promptQueue.forEach((item, index) => {
      const promptElement = document.createElement('div');
      promptElement.className = 'prompt-item';
      
      // Nếu prompt đã được gửi, thêm class sent
      if (item.isSent) {
        promptElement.classList.add('sent');
      }
      
      const date = new Date(item.timestamp);
      
      // Use title if available or default
      const title = item.title || `Prompt ${index + 1}`;
      
      // Create preview of text (first 50 chars)
      const textPreview = item.text.length > 50 ? item.text.substring(0, 50) + '...' : item.text;
      
      // Create sent count badge if prompt has been sent
      const sentBadge = item.sentCount > 0 ? 
        `<span class="sent-badge">Sent: ${item.sentCount}</span>` : '';
      
      promptElement.innerHTML = `
        <h3>${title} ${sentBadge}</h3>
        <p>${textPreview}</p>
        <small>${date.toLocaleString()}</small>
        <div class="prompt-controls">
          <button class="view-prompt" data-index="${index}">View</button>
          <button class="edit-prompt" data-index="${index}">Edit</button>
          <button class="send-now-prompt" data-index="${index}">Send Now</button>
          <button class="remove-prompt" data-index="${index}">Remove</button>
        </div>
      `;
      
      queueElement.appendChild(promptElement);
    });
    
    // Add event listeners for buttons
    document.querySelectorAll('.remove-prompt').forEach(button => {
      button.addEventListener('click', function() {
        const index = parseInt(this.getAttribute('data-index'));
        removePromptFromQueue(index);
      });
    });
    
    document.querySelectorAll('.view-prompt').forEach(button => {
      button.addEventListener('click', function() {
        const index = parseInt(this.getAttribute('data-index'));
        viewPromptDetails(index);
      });
    });
    
    document.querySelectorAll('.edit-prompt').forEach(button => {
      button.addEventListener('click', function() {
        const index = parseInt(this.getAttribute('data-index'));
        editPromptInQueue(index);
      });
    });
    
    document.querySelectorAll('.send-now-prompt').forEach(button => {
      button.addEventListener('click', function() {
        const index = parseInt(this.getAttribute('data-index'));
        sendPromptFromQueue(index);
      });
    });
  });
}

// Function to view prompt details
function viewPromptDetails(index) {
  chrome.storage.local.get('promptQueue', function(data) {
    if (Array.isArray(data.promptQueue) && data.promptQueue[index]) {
      const prompt = data.promptQueue[index];
      alert(`${prompt.title || 'Prompt'}\n\n${prompt.text}`);
    }
  });
}

// Function to edit prompt in queue
function editPromptInQueue(index) {
  chrome.storage.local.get('promptQueue', function(data) {
    if (Array.isArray(data.promptQueue) && data.promptQueue[index]) {
      const prompt = data.promptQueue[index];
      
      // Switch to the create tab
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      
      // Activate create tab
      document.querySelector('.tab[data-tab="create"]').classList.add('active');
      document.getElementById('create-tab').classList.add('active');
      
      // Set the prompt text in the input field
      document.getElementById('prompt-input').value = prompt.text;
      
      // Change the "Add to Queue" button temporarily
      const addButton = document.getElementById('add-prompt');
      const originalText = addButton.textContent;
      addButton.textContent = "Update Prompt";
      
      // Store the index being edited
      addButton.setAttribute('data-editing-index', index);
      
      // Change the button color to indicate editing mode
      addButton.style.backgroundColor = '#ff9800'; // Orange color
      
      // Create a cancel button if it doesn't exist
      let cancelButton = document.getElementById('cancel-edit');
      if (!cancelButton) {
        cancelButton = document.createElement('button');
        cancelButton.id = 'cancel-edit';
        cancelButton.textContent = 'Cancel';
        cancelButton.style.backgroundColor = '#9e9e9e'; // Gray color
        document.querySelector('.controls').appendChild(cancelButton);
      }
      
      // Add cancel event listener
      cancelButton.onclick = function() {
        // Restore original state
        addButton.textContent = originalText;
        addButton.removeAttribute('data-editing-index');
        addButton.style.backgroundColor = '';
        document.getElementById('prompt-input').value = '';
        cancelButton.remove();
      };
      
      // Override the add button click event temporarily
      const originalAddEvent = addButton.onclick;
      addButton.onclick = function() {
        const newText = document.getElementById('prompt-input').value.trim();
        if (newText === '') return;
        
        // Update the prompt in the queue
        chrome.storage.local.get('promptQueue', function(latestData) {
          const promptQueue = latestData.promptQueue;
          promptQueue[index].text = newText;
          
          // Preserve the sentCount and isSent status
          const sentCount = promptQueue[index].sentCount || 0;
          const isSent = promptQueue[index].isSent || false;
          
          // Make sure these properties exist
          promptQueue[index].sentCount = sentCount;
          promptQueue[index].isSent = isSent;
          
          chrome.storage.local.set({ promptQueue: promptQueue }, function() {
            // Restore original state
            addButton.textContent = originalText;
            addButton.onclick = originalAddEvent;
            addButton.removeAttribute('data-editing-index');
            addButton.style.backgroundColor = '';
            document.getElementById('prompt-input').value = '';
            if (cancelButton) cancelButton.remove();
            
            // Switch back to queue tab
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            document.querySelector('.tab[data-tab="queue"]').classList.add('active');
            document.getElementById('queue-tab').classList.add('active');
            
            // Refresh the queue display
            loadPromptQueue();
            updateStatus('Prompt updated successfully');
          });
        });
      };
    }
  });
}

// Function to send a specific prompt from the queue
function sendPromptFromQueue(index) {
  chrome.storage.local.get('promptQueue', function(data) {
    if (Array.isArray(data.promptQueue) && data.promptQueue[index]) {
      const prompt = data.promptQueue[index];
      
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'sendPrompt',
          prompt: prompt.text
        }, function(response) {
          if (response && response.success) {
            // Tăng sentCount và đánh dấu đã gửi
            const promptQueue = data.promptQueue;
            promptQueue[index].sentCount = (promptQueue[index].sentCount || 0) + 1;
            promptQueue[index].isSent = true;
            
            chrome.storage.local.set({ promptQueue: promptQueue }, function() {
              loadPromptQueue();
              updateStatus('Prompt sent successfully');
              
              // Reset auto-submit countdown
              chrome.storage.local.get('settings', function(data) {
                const settings = data.settings || { autoSubmitDelay: 65 };
                autoSubmitCountdown = settings.autoSubmitDelay;
                updateCountdownDisplays();
              });
            });
          } else {
            updateStatus('Could not send prompt. Make sure you are on the Sora page.');
          }
        });
      });
    }
  });
}

function removePromptFromQueue(index) {
  chrome.storage.local.get('promptQueue', function(data) {
    const promptQueue = data.promptQueue || [];
    promptQueue.splice(index, 1);
    
    chrome.storage.local.set({ promptQueue: promptQueue }, function() {
      loadPromptQueue();
    });
  });
}

function clearPromptQueue() {
  chrome.storage.local.set({ promptQueue: [] }, function() {
    loadPromptQueue();
    updateStatus('All prompts cleared from queue');
    
    // Disable auto-submit when queue is cleared
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'disableAutoSubmit'
      });
    });
  });
}

function loadSettings() {
  chrome.storage.local.get('settings', function(data) {
    const settings = data.settings || {
      checkInterval: 10,
      autoSubmit: true,
      autoSubmitDelay: 65
    };
    
    document.getElementById('check-interval').value = settings.checkInterval;
    document.getElementById('auto-submit').checked = settings.autoSubmit;
    
    // Add auto-submit delay field if it exists in the popup
    const autoSubmitDelayElement = document.getElementById('auto-submit-delay');
    if (autoSubmitDelayElement) {
      autoSubmitDelayElement.value = settings.autoSubmitDelay || 65;
    }
  });
}

function saveSettings() {
  const settings = {
    checkInterval: parseInt(document.getElementById('check-interval').value) || 10,
    autoSubmit: document.getElementById('auto-submit').checked
  };
  
  // Get auto-submit delay if the field exists
  const autoSubmitDelayElement = document.getElementById('auto-submit-delay');
  if (autoSubmitDelayElement) {
    settings.autoSubmitDelay = parseInt(autoSubmitDelayElement.value) || 65;
  } else {
    // Keep existing value if field doesn't exist
    chrome.storage.local.get('settings', function(data) {
      if (data.settings && data.settings.autoSubmitDelay) {
        settings.autoSubmitDelay = data.settings.autoSubmitDelay;
      } else {
        settings.autoSubmitDelay = 65; // Default
      }
    });
  }
  
  chrome.storage.local.set({ settings: settings }, function() {
    updateStatus('Settings saved');
    
    // Update auto-submit state based on new settings
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: settings.autoSubmit ? 'enableAutoSubmit' : 'disableAutoSubmit'
      });
    });
    
    // Reinitialize countdown timers with new values
    initializeCountdownTimers();
  });
}

function checkStatus() {
  chrome.runtime.sendMessage({ action: 'getStatus' }, function(response) {
    if (response) {
      updateStatus(`Status: ${response.status}`);
    }
  });
}

function updateStatus(message) {
  document.getElementById('status-display').textContent = message;
}