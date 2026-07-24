// Vault Background Service Worker
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "FETCH_PASSWORDS") {
    chrome.storage.local.get(['vaultActiveDashboardUrl'], (data) => {
      const baseUrl = data.vaultActiveDashboardUrl || "https://passwordvert.vercel.app";
      fetchPasswords(baseUrl)
        .then((resData) => sendResponse({ success: true, data: resData }))
        .catch((error) => sendResponse({ success: false, error: error.message }));
    });
    
    // Return true to indicate we will send a response asynchronously
    return true;
  }

  if (request.type === "OPEN_TAB_WITH_INTENT") {
    chrome.tabs.create({ url: request.url }, (tab) => {
      if (tab && tab.id) {
        try {
          const urlObj = new URL(request.url);
          const intentKey = `tabIntent_${tab.id}`;
          chrome.storage.local.set({
            [intentKey]: {
              entryId: request.entryId,
              hostname: urlObj.hostname,
              time: Date.now()
            },
            vaultActiveDashboardUrl: request.dashboardUrl
          });
        } catch (err) {
          console.error("Invalid URL passed to OPEN_TAB_WITH_INTENT");
        }
      }
    });
  }

  if (request.type === "GET_TAB_INTENT") {
    if (sender && sender.tab && sender.tab.id) {
      const intentKey = `tabIntent_${sender.tab.id}`;
      chrome.storage.local.get([intentKey], (data) => {
        sendResponse(data[intentKey] || null);
      });
      return true;
    } else {
      sendResponse(null);
    }
  }

  if (request.type === "CLEAR_TAB_INTENT") {
    if (sender && sender.tab && sender.tab.id) {
      chrome.storage.local.remove([`tabIntent_${sender.tab.id}`]);
    }
  }
});

// Clean up intents when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.local.remove([`tabIntent_${tabId}`]);
});

async function fetchPasswords(baseUrl) {
  const response = await fetch(`${baseUrl}/api/passwords`);
  
  if (response.status === 401) {
    throw new Error("Vault is locked. Please open Vault and enter your PIN.");
  }
  
  if (!response.ok) {
    throw new Error("Failed to fetch passwords from Vault.");
  }

  return await response.json();
}
