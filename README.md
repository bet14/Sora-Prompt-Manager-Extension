# SoraPromptManager

A Chrome extension for automating prompt submission to Sora for video generation, featuring batch processing and status monitoring.

## Overview
SoraPromptManager automates the submission of prompts to Sora's video generation platform, supporting batch processing with a timer-based queue. It monitors the video creation process, updates statuses, and provides debugging tools for seamless integration with Sora's web interface.

## Features
- **Automated Prompt Submission**: Submits prompts to Sora automatically from a queue.
- **Batch Processing**: Manages a queue of prompts stored in `chrome.storage.local`.
- **Timer-Based Submission**: Configurable delay (default: 65 seconds) for sequential prompt submission.
- **Status Monitoring**: Tracks video generation status (e.g., "Processing", "Completed") via MutationObserver and DOM checks.
- **Dynamic Element Detection**: Identifies prompt input fields and submit buttons using multiple selectors.
- **Debug Mode**: Logs detailed information for troubleshooting, including page element analysis.
- **Background Communication**: Updates status to background script for real-time feedback.
- **Page Compatibility**: Works on Sora's library or video generation pages (e.g., `sora.com/library`, `openai.com/sora`).

## How It Works
1. **Initialization**: Checks if the current page is a Sora page and sets up a MutationObserver to monitor DOM changes.
2. **Prompt Submission**: Finds input fields and submit buttons using predefined selectors, then programmatically sets prompt text and triggers submission.
3. **Queue Management**: Retrieves prompts from `chrome.storage.local`, submits them sequentially, and updates the queue.
4. **Status Tracking**: Periodically checks for video generation status or video elements, updating the background script.
5. **Timer Control**: Uses a configurable timer to control the pace of prompt submissions, with automatic retries on failure.
6. **Debugging**: Logs actions and page elements for easy troubleshooting when debug mode is enabled.

## Installation
1. Clone the repository: `git clone https://github.com/username/SoraPromptManager.git`
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable "Developer mode" and click "Load unpacked".
4. Select the repository folder to install the extension.

## Usage
1. Ensure you're on a Sora page (e.g., `sora.com/library` or `openai.com/sora`).
2. Add prompts to the queue via the extension popup (requires popup script, not included here).
3. Enable auto-submission through the popup to start timer-based processing.
4. Monitor statuses via the extension's background updates or console logs (enable `debugMode` for details).

## Configuration
Stored in `chrome.storage.local`:
- `settings`: Object with `autoSubmit` (boolean, default: `true`) and `autoSubmitDelay` (seconds, default: `65`).
- `promptQueue`: Array of prompt objects (e.g., `{ text: "A futuristic city at night" }`).
- `checkInterval`: Interval for status checks (seconds, default: `10`).

## Code Structure
- **Initialization**: Sets up page connection and MutationObserver on load.
- **Message Handling**: Listens for commands (`sendPrompt`, `enableAutoSubmit`, `disableAutoSubmit`) from the popup.
- **Element Detection**: Uses multiple selectors to locate prompt input fields and submit buttons.
- **Status Monitoring**: Checks for status indicators or video elements to determine generation progress.
- **Timer-Based Queue**: Manages prompt submission with a configurable delay, ensuring sequential processing.
- **Debugging**: Logs actions and page elements for troubleshooting.

## Debugging
- Enable `debugMode` (`true` by default) to view console logs.
- The `debugPageElements` function runs 3 seconds after page load, listing all textareas, inputs, and buttons for selector verification.

## Limitations
- Requires specific Sora page URLs for compatibility.
- Dependent on consistent DOM structure for element detection.
- Limited to Chrome's storage and runtime APIs.

## Contributing
1. Fork the repository.
2. Create a feature branch (`git checkout -b feature-name`).
3. Commit changes (`git commit -m "Add feature"`).
4. Push to the branch (`git push origin feature-name`).
5. Open a pull request.

## License
MIT License

---

This README provides a concise yet comprehensive overview for GitHub, focusing on functionality, setup, and usage while summarizing the provided `content.js` code. Let me know if you need adjustments or additional sections!# Sora-Prompt-Manager-Extension
A Chrome extension for automating prompt submission to Sora for video generation, featuring batch processing and status monitoring.
