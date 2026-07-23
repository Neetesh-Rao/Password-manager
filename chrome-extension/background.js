// Vault Background Service Worker
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "FETCH_PASSWORDS") {
    fetchPasswords()
      .then((data) => sendResponse({ success: true, data }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    
    // Return true to indicate we will send a response asynchronously
    return true;
  }
});

async function fetchPasswords() {
  const response = await fetch("https://passwordvert.vercel.app/api/passwords");
  
  if (response.status === 401) {
    throw new Error("Vault is locked. Please open Vault and enter your PIN.");
  }
  
  if (!response.ok) {
    throw new Error("Failed to fetch passwords from Vault.");
  }

  return await response.json();
}
