// bliz-sdk.js
(function () {
    console.log("🛡️ Bliz Shield SDK Initialized");

    // 1. Configuration: Get settings from the script tag attributes
    const scriptTag = document.currentScript;
    const captchaId = scriptTag.getAttribute('data-captcha-id'); // e.g., "kO48vw"
    const containerId = scriptTag.getAttribute('data-container'); // e.g., "captcha-box"
    
    // Base URL for the verification games
    const BASE_URL = "https://bliz.cc"; 

    if (!captchaId || !containerId) {
        console.error("Bliz Error: Missing 'data-captcha-id' or 'data-container' attributes.");
        return;
    }

    // 2. Locate DOM Elements
    const container = document.getElementById(containerId);
    if (!container) {
        console.error("Bliz Error: Container element not found.");
        return;
    }

    // Find the closest submit button inside the form, or just the first submit button on page
    let submitBtn = container.closest('form')?.querySelector('button[type="submit"]');
    
    if (!submitBtn) {
        // Fallback: try to find a button immediately following the container
        submitBtn = document.querySelector('button[type="submit"]');
    }

    // 3. LOCKDOWN: Disable the button immediately
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.style.opacity = "0.5";
        submitBtn.style.cursor = "not-allowed";
        submitBtn.title = "Please complete verification first";
    }

    // 4. Inject the Game Iframe
    const iframe = document.createElement('iframe');
    iframe.src = `${BASE_URL}/${captchaId}`; 
    
    // Styling to make it look native (Standard Bliz dimensions)
    iframe.style.width = "100%";
    iframe.style.height = "160px"; // Fixed height to prevent collapse
    iframe.style.border = "none";
    iframe.style.overflow = "hidden";
    iframe.setAttribute("scrolling", "no");
    iframe.title = "Security Verification";

    container.innerHTML = ""; // Clear loader if any
    container.appendChild(iframe);

    // 5. Create Hidden Input (to send token to backend)
    const tokenInput = document.createElement('input');
    tokenInput.type = "hidden";
    tokenInput.name = "bliz_verification_token";
    container.appendChild(tokenInput);

    // 6. Listen for Success Message
    window.addEventListener('message', function (event) {
        // Optional: strict origin check for security
        // if (event.origin !== BASE_URL) return;

        const data = event.data;

        // Check for the specific success event
        if (data && data.type === 'BLIZ_VERIFIED') {
            console.log("✅ Humanity Verified:", data);

            // A. Store the token
            tokenInput.value = data.token;

            // B. Unlock the Button
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.style.opacity = "1";
                submitBtn.style.cursor = "pointer";
                submitBtn.title = "";
                
                // Optional visual flair
                const originalText = submitBtn.innerText;
                submitBtn.innerText = "Verified - " + originalText;
            }
        }
    });
})();