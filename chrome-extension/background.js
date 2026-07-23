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
