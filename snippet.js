/**
 * Bliz Tracking Script v1.2
 * Auto-initializing client-side analytics collector
 * Loads session_id from URL params and stores in sessionStorage
 * Extracts API key from script data-key attribute and adds as Authorization header
 * Fixed CORS handling for cross-origin requests
 */

(function () {
  "use strict";

  // Configuration
  var CONFIG = {
    sessionIdParam: "session_id",
    storageKey: "bliz_session_id",
    debug: true,
    events: {
      PAGE_VIEW: "PAGE_VIEW",
      LINK_CLICK: "LINK_CLICK",
      BUTTON_CLICK: "BUTTON_CLICK",
      FORM_SUBMIT: "FORM_SUBMIT",
    },
  };

  /**
   * Get query parameter from URL
   */
  function getQueryParam(param) {
    var urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param) || null;
  }

  /**
   * Fallback for older browsers without URLSearchParams
   */
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

  /**
   * Extract session_id from URL
   */
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

  /**
   * Store session_id in sessionStorage
   */
  function storeSessionId(sessionId) {
    try {
      if (window.sessionStorage) {
        window.localStorage.setItem(CONFIG.storageKey, sessionId);
        return true;
      }
    } catch (e) {
      // sessionStorage might be blocked or full
      if (CONFIG.debug) {
        console.warn("Bliz: Could not store session_id in sessionStorage", e);
      }
    }

    return false;
  }

  /**
   * Retrieve session_id from sessionStorage
   */
  function getStoredSessionId() {
    try {
      if (window.sessionStorage) {
        return window.localStorage.getItem(CONFIG.storageKey);
      }
    } catch (e) {
      if (CONFIG.debug) {
        console.warn(
          "Bliz: Could not retrieve session_id from sessionStorage",
          e
        );
      }
    }

    return null;
  }

  /**
   * Initialize Bliz tracking
   */
  function init() {
    var sessionId = getSessionIdFromUrl();

    if (sessionId) {
      var stored = storeSessionId(sessionId);

      if (CONFIG.debug) {
        console.log("Bliz: Script initialized");
        console.log("Bliz: Session ID detected:", sessionId);
        console.log("Bliz: Session stored in sessionStorage:", stored);
      }

      // Make session_id globally accessible
      window.blizSessionId = sessionId;

      return {
        initialized: true,
        sessionId: sessionId,
        stored: stored,
      };
    } else {
      // No session_id found, but script still loaded
      var storedSessionId = getStoredSessionId();

      if (CONFIG.debug) {
        console.log("Bliz: Script initialized");
        console.log("Bliz: No session_id in URL params");

        if (storedSessionId) {
          console.log(
            "Bliz: Found existing session_id in storage:",
            storedSessionId
          );
          window.blizSessionId = storedSessionId;
        } else {
          console.log("Bliz: No existing session_id in storage");
        }
      }

      return {
        initialized: true,
        sessionId: storedSessionId,
        stored: false,
      };
    }
  }

  /**
   * API endpoint for event tracking
   */
  var API_ENDPOINT = "https://api.bliz.cc/api/v1/page-events";

  /**
   * Extract API key from script data-key attribute
   */
  function getApiKeyFromScript() {
    var script = document.getElementById('bliz-snippet');
    return script ? script.getAttribute('data-key') : null;
  }

  /**
   * Get current pathname
   */
  function getPathname() {
    return window.location.pathname;
  }

  /**
   * Get current timestamp
   */
  function getTimestamp() {
    return new Date().toISOString();
  }

  /**
   * Create event object
   */
  function createEvent(action, label, pathname) {
    return {
      action: action || "N/A",
      label: label || "N/A",
      pathname: pathname || getPathname(),
      timestamp: getTimestamp(),
    };
  }

  /**
   * Send event to API using XMLHttpRequest (older browser compatible)
   * Handles CORS preflight requests automatically
   * Includes Authorization header with API key from data-key attribute
   */
  function sendEventToAPI(payload) {
    var xhr = new XMLHttpRequest();

    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        if (xhr.status >= 200 && xhr.status < 300) {
          if (CONFIG.debug) {
            console.log("Bliz: Event sent successfully", xhr.status);
          }
        } else if (xhr.status === 0) {
          // Status 0 typically means CORS error, network failure, or request blocked
          if (CONFIG.debug) {
            console.warn(
              "Bliz: CORS error or network failure - check server CORS configuration"
            );
            console.warn(
              "Bliz: Server should have: app.enableCors({ origin: true, methods: [GET, POST, OPTIONS] })"
            );
          }
        } else {
          if (CONFIG.debug) {
            console.warn("Bliz: API error", xhr.status, xhr.statusText);
            if (xhr.responseText) {
              try {
                console.warn("Bliz: Response:", JSON.parse(xhr.responseText));
              } catch (e) {
                console.warn("Bliz: Response:", xhr.responseText);
              }
            }
          }
        }
      }
    };

    xhr.onerror = function () {
      if (CONFIG.debug) {
        console.error(
          "Bliz: Network error - ensure server is accessible and CORS is enabled"
        );
      }
    };

    xhr.ontimeout = function () {
      if (CONFIG.debug) {
        console.warn("Bliz: Request timeout after 5 seconds");
      }
    };

    try {
      var apiKey = getApiKeyFromScript();

      xhr.open("POST", API_ENDPOINT, true);
      xhr.setRequestHeader("accept", "*/*");
      xhr.setRequestHeader("Content-Type", "application/json");

      // Add Authorization header with API key
      if (apiKey) {
        xhr.setRequestHeader("Authorization", "Bearer " + apiKey);
        if (CONFIG.debug) {
          console.log("Bliz: Authorization header set with API key");
        }
      } else {
        if (CONFIG.debug) {
          console.warn("Bliz: No API key found in script data-key attribute");
        }
      }

      xhr.timeout = 5000; // 5 second timeout
      xhr.send(JSON.stringify(payload));
    } catch (e) {
      if (CONFIG.debug) {
        console.error("Bliz: Error creating request", e.message);
      }
    }
  }

  /**
   * Process event (log and send to API)
   */
  function processEvent(event) {
    var sessionId = window.blizSessionId || getStoredSessionId();

    if (!sessionId) {
      if (CONFIG.debug) {
        console.warn("Bliz: No session_id available, skipping event");
      }
      return;
    }

    var payload = {
      session_id: sessionId,
      action: event.action,
      label: event.label,
      pathname: event.pathname,
      timestamp: event.timestamp,
    };

    if (CONFIG.debug) {
      console.log("Bliz: Event logged", event);
      console.log("Bliz: Sending to API:", API_ENDPOINT);
    }

    // Send event to API using XMLHttpRequest
    sendEventToAPI(payload);
  }

  /**
   * Listen to click events (buttons and links only)
   */
  function setupClickListener() {
    document.addEventListener("click", function (e) {
      var target = e.target;
      var tagName = target.tagName.toLowerCase();

      // Only capture clicks on buttons and links
      if (tagName !== "button" && tagName !== "a") {
        return;
      }

      var label = "N/A";
      var action =
        tagName === "button"
          ? CONFIG.events.BUTTON_CLICK
          : CONFIG.events.LINK_CLICK;

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

  /**
   * Listen to form submissions
   */
  function setupFormListener() {
    document.addEventListener("submit", function (e) {
      var formName = e.target.name || e.target.id || "form_submit";
      var event = createEvent(CONFIG.events.FORM_SUBMIT, formName);
      processEvent(event);
    });
  }

  function setupPageViewListener() {
    document.addEventListener("DOMContentLoaded", function () {
      var currentPathname = getPathname();
      var label =
        currentPathname.replace(/\//g, "").substring(0, 100) || "home";
      var event = createEvent(CONFIG.events.PAGE_VIEW, label);
      processEvent(event);
    });
  }

  /**
   * Setup all event listeners
   */
  function setupEventListeners() {
    setupClickListener();
    setupFormListener();
    setupPageViewListener();
  }

  /**
   * Public API
   */
  var BlizTracker = {
    getSessionId: function () {
      return window.blizSessionId || getStoredSessionId();
    },

    isActive: function () {
      return !!(window.blizSessionId || getStoredSessionId());
    },

    debug: function (enabled) {
      CONFIG.debug = enabled;
    },

    getApiKey: function () {
      return getApiKeyFromScript();
    },
  };

  // Auto-initialize on script load
  var initResult = init();

  // Setup event listeners
  setupEventListeners();

  // Make BlizTracker globally accessible
  window.BlizTracker = BlizTracker;

  // Log initialization result
  if (CONFIG.debug) {
    console.log("Bliz: Initialization complete", initResult);
    console.log("Bliz: Event listeners setup complete");
    console.log("Bliz: API key extracted:", getApiKeyFromScript());
  }
})();
