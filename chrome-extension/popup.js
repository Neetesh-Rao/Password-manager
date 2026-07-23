document.addEventListener("DOMContentLoaded", async () => {
  const statusMsg = document.getElementById("status-msg");
  
  chrome.runtime.sendMessage({ type: "FETCH_PASSWORDS" }, (response) => {
    if (!response || !response.success) {
      statusMsg.innerHTML = "Vault is locked.<br><br>Please open the Vault Dashboard and enter your PIN to enable Autofill.";
      statusMsg.style.color = "#ef4444";
    } else {
      statusMsg.innerHTML = `Connected securely to Vault.<br><br>Ready to autofill on websites!`;
      statusMsg.style.color = "#22c55e";
    }
  });
});
