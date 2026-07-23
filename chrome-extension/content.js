const DASHBOARD_HOSTS = ['passwordvert.vercel.app', 'localhost'];
let autofillCompleted = false;

function injectIcons() {
  if (autofillCompleted || document.querySelector('.vault-autofill-floating-btn')) return;

  const passwordFields = document.querySelectorAll('input[type="password"]');
  let targetInput = null;

  if (passwordFields.length > 0) {
    targetInput = passwordFields[0];
  } else {
    const textInputs = document.querySelectorAll('input[type="text"], input[type="email"]');
    for (const input of textInputs) {
      const name = (input.name || "").toLowerCase();
      const id = (input.id || "").toLowerCase();
      if (name.includes("user") || name.includes("email") || name.includes("login") || id.includes("user") || id.includes("email")) {
        targetInput = input;
        break;
      }
    }
  }

  if (targetInput) {
    const style = document.createElement('style');
    style.textContent = `
    .vault-autofill-floating-btn {
      position: fixed;
      bottom: 32px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(10, 10, 10, 0.9);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #fff;
      padding: 10px 20px;
      border-radius: 9999px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 14px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      z-index: 2147483647;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.2);
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .vault-autofill-floating-btn:hover {
      background: rgba(0, 0, 0, 1);
      transform: translateX(-50%) translateY(-2px) scale(1.02);
      border-color: rgba(255, 255, 255, 0.3);
      box-shadow: 0 15px 30px -5px rgba(0, 0, 0, 0.6);
    }

    .vault-autofill-floating-btn img {
      width: 20px;
      height: 20px;
      border-radius: 4px;
    }`;
    document.head.appendChild(style);

    const btn = document.createElement("div");
    btn.className = "vault-autofill-floating-btn";
    btn.title = "Autofill all fields with Vault";
    
    const imgUrl = chrome.runtime.getURL("icons/icon-192.png");
    btn.innerHTML = `<img src="${imgUrl}" alt="Vault" /> <span>Vault Autofill</span>`;
    
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const originalText = btn.innerHTML;
      btn.innerHTML = `<span>Autofilling...</span>`;
      
      const success = await triggerAutofill();
      if (success) {
        autofillCompleted = true;
        btn.remove();
        // Clear the active intent so it doesn't show up again on reloads or direct visits
        chrome.storage.local.remove(['vaultActiveHostname', 'vaultActiveTime', 'vaultActiveEntryId']);
      } else {
        btn.innerHTML = originalText;
      }
    });
    
    document.body.appendChild(btn);
  }
}

async function triggerAutofill() {
  try {
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "FETCH_PASSWORDS" }, resolve);
    });

    if (!response.success) {
      alert("Vault error: " + response.error);
      return;
    }

    const passwords = response.data;
    const currentHost = window.location.hostname;
    
    // Retrieve the specific entry ID
    const { vaultActiveEntryId } = await new Promise(resolve => chrome.storage.local.get(['vaultActiveEntryId'], resolve));
    console.log("Vault Autofill: Active Entry ID from storage is", vaultActiveEntryId);
    
    let match = null;
    if (vaultActiveEntryId) {
      match = passwords.find(p => p.id == vaultActiveEntryId || p._id == vaultActiveEntryId);
      console.log("Vault Autofill: Match found using Entry ID:", !!match);
    }
    
    // Fallback: Find the best match for this domain
    if (!match) {
      match = passwords.find(p => p.url && currentHost.includes(p.url.replace(/https?:\/\//, '').split('/')[0]));
      console.log("Vault Autofill: Fallback match found using URL:", !!match);
    }

    if (!match) {
      alert("Vault: No saved credentials found for this website.");
      return false;
    }

    fillForm(match);
    return true;
  } catch (error) {
    console.error("Vault Autofill Error:", error);
    return false;
  }
}

function fillForm(entry) {
  const inputs = document.querySelectorAll('input');
  
  const setInputValue = (input, value) => {
    input.value = value;
    // Bulletproof method for React/Vue overrides
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(input, value);
    }
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  };
  
  inputs.forEach(input => {
    const name = (input.name || "").toLowerCase();
    const id = (input.id || "").toLowerCase();
    const placeholder = (input.placeholder || "").toLowerCase();
    const type = input.type;

    // Extract the visible label text associated with this input
    let labelText = "";
    if (input.labels && input.labels.length > 0) {
      labelText = input.labels[0].innerText.toLowerCase();
    } else if (input.id) {
      const lbl = document.querySelector(`label[for="${input.id}"]`);
      if (lbl) labelText = lbl.innerText.toLowerCase();
    }

    let matchedCustom = false;
    // 1. PRIORITY: Fill Dynamic Custom Fields first
    if (entry.customFields && entry.customFields.length > 0) {
      for (const field of entry.customFields) {
        const label = field.label.toLowerCase();
        // Match label against input name, id, placeholder, or actual HTML label text
        if (
          (name && name.includes(label)) || 
          (id && id.includes(label)) || 
          (placeholder && placeholder.includes(label)) || 
          (labelText && labelText.includes(label)) ||
          (label.includes(name) && name.length > 2) ||
          (labelText && label.includes(labelText) && labelText.length > 2)
        ) {
          setInputValue(input, field.value);
          matchedCustom = true;
          break;
        }
      }
    }
    
    if (matchedCustom) return;

    // 2. Fill Password
    if (type === "password" && entry.password) {
      setInputValue(input, entry.password);
      return;
    }
  });
}

// Setup Dashboard Clicks vs External Injection
if (DASHBOARD_HOSTS.includes(window.location.hostname)) {
  // 1. If on dashboard, listen for clicks on external links
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (link && link.href && !link.href.includes(window.location.hostname)) {
      try {
        const urlObj = new URL(link.href);
        const entryId = link.getAttribute('data-vault-entry-id') || null;
        console.log("Vault Dashboard: Link clicked! Saving Entry ID:", entryId, "for Host:", urlObj.hostname);
        chrome.storage.local.set({ 
          vaultActiveHostname: urlObj.hostname,
          vaultActiveTime: Date.now(),
          vaultActiveEntryId: entryId,
          vaultActiveDashboardUrl: window.location.origin
        });
      } catch(err) {}
    }
  }, true); // capture phase
} else {
  // 2. If on other sites, verify intent before activating
  chrome.storage.local.get(['vaultActiveHostname', 'vaultActiveTime'], (data) => {
    if (!data.vaultActiveHostname || !data.vaultActiveTime) return;

    const timeElapsed = Date.now() - data.vaultActiveTime;
    const isRecent = timeElapsed < 2 * 60 * 1000; // 2 minute window

    const currentHost = window.location.hostname;
    const isMatch = currentHost.includes(data.vaultActiveHostname) || data.vaultActiveHostname.includes(currentHost);

    if (isRecent && isMatch) {
      // Observe DOM changes to inject icons into React/SPA rendered forms
      const observer = new MutationObserver((mutations) => {
        injectIcons();
      });
      observer.observe(document.body, { childList: true, subtree: true });
      injectIcons();
    }
  });
}
