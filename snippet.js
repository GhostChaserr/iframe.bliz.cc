/**
 * Bliz Tracking Script v1.3
 * Auto-initializing client-side analytics collector
 * Loads session_id from URL params and stores in localStorage
 * Extracts API key from script data-key attribute and adds as Authorization header
 * Fixed CORS handling for cross-origin requests
 * Enhanced page view tracking for Shopify stores
 */

(function () {
  "use strict";

  // Configuration object with event types and storage keys
  var CONFIG = {
    sessionIdParam: "session_id",
    storageKey: "bliz_session_id",
    events: {
      PAGE_VIEW: "PAGE_VIEW",
      LINK_CLICK: "LINK_CLICK",
      BUTTON_CLICK: "BUTTON_CLICK",
      FORM_SUBMIT: "FORM_SUBMIT",
    },
  };

  // Extract query parameter from URL using URLSearchParams API
  function getQueryParam(param) {
    var urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param) || null;
  }

  // Fallback parameter extraction for older browsers without URLSearchParams support
  function getQueryParamLegacy(param) {
    var search = window.location.search.substring(1);
    var params = search.split("&");

    for (var i = 0; i < params.length; i++) {
      var pair = params[i].split("=");
      if (decodeURIComponent(pair[0]) === param) {
        return decodeURIComponent(pair[1]);
      }
    }

    return null;
  }

  // Retrieve session ID from URL query parameters with browser compatibility fallback
  function getSessionIdFromUrl() {
    var sessionId = null;

    // Try modern URLSearchParams first
    if (window.URLSearchParams) {
      sessionId = getQueryParam(CONFIG.sessionIdParam);
    }

    // Fallback for older browsers
    if (!sessionId) {
      sessionId = getQueryParamLegacy(CONFIG.sessionIdParam);
    }

    return sessionId;
  }

  // Persist session ID to browser storage for session continuity
  function storeSessionId(sessionId) {
    try {
      if (window.localStorage) {
        window.localStorage.setItem(CONFIG.storageKey, sessionId);
        return true;
      }
    } catch (e) {
      // Storage might be blocked or full
    }

    return false;
  }

  // Retrieve previously stored session ID from browser storage
  function getStoredSessionId() {
    try {
      if (window.localStorage) {
        return window.localStorage.getItem(CONFIG.storageKey);
      }
    } catch (e) {
      // Storage access may fail
    }

    return null;
  }

  // Initialize tracking system and establish session context
  function init() {
    var sessionId = getSessionIdFromUrl();

    if (sessionId) {
      // Store new session ID from URL
      var stored = storeSessionId(sessionId);
      window.blizSessionId = sessionId;

      return {
        initialized: true,
        sessionId: sessionId,
        stored: stored,
      };
    } else {
      // Try to retrieve existing session from storage
      var storedSessionId = getStoredSessionId();
      
      if (storedSessionId) {
        window.blizSessionId = storedSessionId;
      }

      return {
        initialized: true,
        sessionId: storedSessionId,
        stored: false,
      };
    }
  }

  // API endpoint for tracking events
  var API_ENDPOINT = "https://api.bliz.cc/api/v1/page-events";

  // Extract API key from script element's data attribute
  function getApiKeyFromScript() {
    var script = document.getElementById('bliz-snippet');
    return script ? script.getAttribute('data-key') : null;
  }

  // Get current page pathname
  function getPathname() {
    return window.location.pathname;
  }

  // Get current timestamp in ISO format
  function getTimestamp() {
    return new Date().toISOString();
  }

  // Construct standardized event object with action, label, and context
  function createEvent(action, label, pathname) {
    return {
      action: action || "N/A",
      label: label || "N/A",
      pathname: pathname || getPathname(),
      timestamp: getTimestamp(),
    };
  }

  // Send event payload to API server with proper headers and error handling
  function sendEventToAPI(payload) {
    var xhr = new XMLHttpRequest();

    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        if (xhr.status >= 200 && xhr.status < 300) {
          // Event sent successfully
        } else if (xhr.status === 0) {
          // CORS error or network failure - server should enable CORS
        } else {
          // Handle non-2xx responses silently
        }
      }
    };

    xhr.onerror = function () {
      // Network error occurred
    };

    xhr.ontimeout = function () {
      // Request exceeded timeout threshold
    };

    try {
      var apiKey = getApiKeyFromScript();

      xhr.open("POST", API_ENDPOINT, true);
      xhr.setRequestHeader("accept", "*/*");
      xhr.setRequestHeader("Content-Type", "application/json");

      // Include API key in Authorization header for server validation
      if (apiKey) {
        xhr.setRequestHeader("Authorization", "Bearer " + apiKey);
      }

      xhr.timeout = 5000; // 5 second timeout
      xhr.send(JSON.stringify(payload));
    } catch (e) {
      // Request creation failed
    }
  }

  // Package event with session context and send to analytics API
  function processEvent(event) {
    var sessionId = window.blizSessionId || getStoredSessionId();

    if (!sessionId) {
      // Cannot track event without active session
      return;
    }

    var payload = {
      session_id: sessionId,
      action: event.action,
      label: event.label,
      pathname: event.pathname,
      timestamp: event.timestamp,
    };

    // Transmit event payload to remote server
    sendEventToAPI(payload);
  }

  // Attach global click listener for button and link interactions
  function setupClickListener() {
    document.addEventListener("click", function (e) {
      var target = e.target;
      var tagName = target.tagName.toLowerCase();

      // Only track clicks on buttons and links
      if (tagName !== "button" && tagName !== "a") {
        return;
      }

      var label = "N/A";
      var action =
        tagName === "button"
          ? CONFIG.events.BUTTON_CLICK
          : CONFIG.events.LINK_CLICK;

      // Extract meaningful label from element text or href
      if (tagName === "button") {
        label = target.innerText
          ? target.innerText.substring(0, 100).trim()
          : "button";
      } else if (tagName === "a") {
        label = target.innerText
          ? target.innerText.substring(0, 100).trim()
          : target.href || "link";
      }

      var event = createEvent(action, label);
      processEvent(event);
    });
  }

  // Attach global listener for form submission events
  function setupFormListener() {
    document.addEventListener("submit", function (e) {
      var event = createEvent(CONFIG.events.FORM_SUBMIT, 'form_submit');
      processEvent(event);
    });
  }

  // Track initial page view with duplicate prevention mechanism
  var pageViewTracked = false;
  
  function trackPageView() {
    // Prevent multiple page view events for same navigation
    if (pageViewTracked) {
      return;
    }
    
    var currentPathname = getPathname();
    var label =
      currentPathname.replace(/\//g, "").substring(0, 100) || "home";
    var event = createEvent(CONFIG.events.PAGE_VIEW, label);
    processEvent(event);
    
    pageViewTracked = true;
  }

  // Setup multiple fallback mechanisms to ensure page view tracking in various environments
  function setupPageViewListener() {
    // Check if DOM is already fully loaded
    if (document.readyState === "loading") {
      // DOM still loading, wait for completion
      document.addEventListener("DOMContentLoaded", trackPageView);
    } else {
      // DOM already loaded, track immediately
      trackPageView();
    }
    
    // Fallback: Track on window load event if not already tracked
    window.addEventListener("load", function() {
      if (!pageViewTracked) {
        trackPageView();
      }
    });
    
    // Handle Shopify theme custom section load events
    document.addEventListener("shopify:section:load", function() {
      if (!pageViewTracked) {
        trackPageView();
      }
    });
    
    // Handle custom page loaded events from theme scripts
    document.addEventListener("page:loaded", function() {
      if (!pageViewTracked) {
        trackPageView();
      }
    });
    
    // Final timeout fallback for late-loaded or async scripts
    setTimeout(function() {
      if (!pageViewTracked) {
        trackPageView();
      }
    }, 500);
    
    // Reset tracking on back/forward navigation to track new page views
    window.addEventListener("popstate", function() {
      pageViewTracked = false;
      setTimeout(trackPageView, 100);
    });
  }

  // Initialize all event tracking listeners
  function setupEventListeners() {
    setupClickListener();
    setupFormListener();
    setupPageViewListener();
  }

  // Public API for external interaction with tracker
  var BlizTracker = {
    getSessionId: function () {
      return window.blizSessionId || getStoredSessionId();
    },

    isActive: function () {
      return !!(window.blizSessionId || getStoredSessionId());
    },

    getApiKey: function () {
      return getApiKeyFromScript();
    },

    // Manually trigger page view tracking if needed
    trackPageView: function() {
      pageViewTracked = false;
      trackPageView();
    },
  };

  // Execute initialization sequence on script load
  init();

  // Activate all event listeners
  setupEventListeners();

  // Expose tracker API globally for external use
  window.BlizTracker = BlizTracker;
})();