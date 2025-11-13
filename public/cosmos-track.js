/**
 * CosMos AI - Client-Side Tracking Script
 * Version: 4.7.0
 *
 * Key Features:
 * - Tracks ALL visitors (with or without UTM parameters)
 * - Direct visits marked as utm_source: '(direct)', utm_medium: '(none)'
 * - 30-minute visit window (refreshes within window don't increment visit_count)
 * - Page count per session
 * - Google Analytics-style exit tracking (one exit per session)
 * - Page refreshes count as pageviews
 * - Proper landing page tracking across multiple sessions
 * - Client-side navigation tracking (SPA/Next.js router support)
 *
 * New in v4.7.0:
 * - Google Analytics-style UTM persistence: UTMs locked at session start
 * - UTM parameters stored in localStorage and NEVER change during session
 * - New UTM parameters mid-session are ignored (GA behavior)
 * - Ensures consistent attribution across entire session
 *
 * Previous Updates (v4.6.0):
 * - Google Analytics approach: Exit events only sent when session expires
 * - Tab closes during active session do NOT trigger exit events
 * - One session = one landing page + one exit page
 * - Delayed exit event sent retrospectively when session timeout detected
 * - Exit candidate stored in localStorage for accurate exit tracking
 */

(function() {
  'use strict';

  // Global initialization guard - prevent multiple script instances
  if (window.__cosmos_tracker_initialized) {
    console.log('[CosMos] Already initialized, skipping duplicate initialization');
    return;
  }
  window.__cosmos_tracker_initialized = true;

  const CONFIG = {
    allowedDomains: [
      'aptdecor.uz',
      'www.aptdecor.uz',
      'jcg.asia',
      'www.jcg.asia',
      'localhost:3001',
    ],

    apiEndpoint: 'https://dev.cosmosai.co.kr/api/track',
    apiEndpointInternal: 'https://dev.cosmosai.co.kr/api/track-internal',

    requireUTMParams: false, // Now tracks ALL visitors, not just UTM ones
    enableDomainValidation: true,

    cookieDomain: window.location.hostname,
    visitorCookieName: 'cosmos_visitor_id',
    sessionCookieName: 'cosmos_session_id',
    visitCountCookieName: 'cosmos_visit_count',
    firstVisitCookieName: 'cosmos_first_visit',
    lastVisitCookieName: 'cosmos_last_visit',
    lastActivityCookieName: 'cosmos_last_activity',
    cookieExpireDays: 730,
    sessionTimeoutMinutes: 2,
    visitTimeoutMinutes: 0.5,
    pageViewDebounceMs: 500,
  };

  // ============================================================
  // DOMAIN VALIDATION
  // ============================================================
  const currentDomain = window.location.hostname + (window.location.port ? ':' + window.location.port : '');
  const isAllowedDomain = CONFIG.allowedDomains.some(domain =>
    currentDomain === domain || currentDomain.endsWith('.' + domain)
  );

  const isInternalDomain =
    currentDomain.includes('localhost:3000') ||
    currentDomain.includes('cosmos') ||
    currentDomain.includes('vercel.app');

  if (CONFIG.enableDomainValidation && !isAllowedDomain && !isInternalDomain) {
    console.log('[CosMos] Tracking disabled - unauthorized domain:', currentDomain);
    return;
  }

  if (isInternalDomain) {
    CONFIG.apiEndpoint = CONFIG.apiEndpointInternal;
    console.log('[CosMos] Using internal testing endpoint:', CONFIG.apiEndpoint);
  } else {
    console.log('[CosMos] Using production endpoint:', CONFIG.apiEndpoint);
  }

  // ============================================================
  // UTILITY FUNCTIONS
  // ============================================================
  const utils = {
    generateUUID: function() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    },
    setCookie: function(name, value, days) {
      const expires = new Date();
      expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
      document.cookie = name + '=' + value + ';expires=' + expires.toUTCString() + ';path=/;SameSite=Lax';
    },
    getCookie: function(name) {
      const nameEQ = name + '=';
      const ca = document.cookie.split(';');
      for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length);
      }
      return null;
    },
    deleteCosmosCookies: function() {
      const cookies = document.cookie.split(';');
      cookies.forEach(c => {
        const cookieName = c.split('=')[0].trim();
        if (cookieName.startsWith('cosmos_')) {
          document.cookie = cookieName + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
        }
      });
    },
    getUrlParams: function() {
      const params = {};
      const queryString = window.location.search.substring(1);
      const pairs = queryString.split('&');
      for (let i = 0; i < pairs.length; i++) {
        const pair = pairs[i].split('=');
        if (pair[0]) params[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || '');
      }
      return params;
    },
    getReferrerDomain: function() {
      if (!document.referrer) return '';
      try {
        const url = new URL(document.referrer);
        return url.hostname;
      } catch {
        return '';
      }
    },
    getDeviceType: function() {
      const ua = navigator.userAgent.toLowerCase();
      if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return 'tablet';
      if (/mobile|iphone|ipod|android|blackberry|iemobile|kindle|silk-accelerated|(hpw|web)os|opera m(obi|ini)/i.test(ua)) return 'mobile';
      return 'desktop';
    },
    getScreenResolution: function() {
      return window.screen.width + 'x' + window.screen.height;
    },
    getBrowser: function() {
      const ua = navigator.userAgent;
      if (ua.indexOf('YaBrowser') > -1 || ua.indexOf('Yandex') > -1) return 'Yandex';
      if (ua.indexOf('Edg/') > -1 || ua.indexOf('Edge/') > -1) return 'Edge';
      if (ua.indexOf('OPR') > -1 || ua.indexOf('Opera') > -1) return 'Opera';
      if (ua.indexOf('Firefox') > -1) return 'Firefox';
      if (ua.indexOf('Safari') > -1 && ua.indexOf('Chrome') === -1) return 'Safari';
      if (ua.indexOf('Chrome') > -1) return 'Chrome';
      if (ua.indexOf('MSIE') > -1 || ua.indexOf('Trident/') > -1) return 'Internet Explorer';
      return 'Unknown';
    },
    getOS: function() {
      const ua = navigator.userAgent;
      if (ua.indexOf('Win') > -1) return 'Windows';
      if (ua.indexOf('Mac') > -1 && ua.indexOf('Mobile') === -1) return 'macOS';
      if (ua.indexOf('Linux') > -1 && ua.indexOf('Android') === -1) return 'Linux';
      if (ua.indexOf('Android') > -1) return 'Android';
      if (ua.indexOf('iPhone') > -1 || ua.indexOf('iPad') > -1) return 'iOS';
      return 'Unknown';
    },
    getTimestamp: () => Math.floor(Date.now() / 1000),
  };

  // ============================================================
  // TRACKING CLASS
  // ============================================================
  const CosmosTracker = {
    visitorId: null,
    sessionId: null,
    visitCount: 0,
    isNewVisitor: false,
    firstVisitTime: null,
    lastVisitTime: null,
    lastActivityTime: null,
    isTrackingEnabled: false,
    pageLoadTime: null,
    lastPageviewSent: 0,
    pageSequence: 0,
    sessionPageCount: 0,
    lastTrackedPath: null,
    lastTrackedTimestamp: 0,
    hasInitialized: false,
    
    // Store current page data for accurate exit tracking
    currentPageData: {
      url: '',
      path: '',
      title: '',
      loadTime: 0
    },

    init: function() {
      if (this.hasInitialized) return; // Prevent double initialization
      this.hasInitialized = true;
      this.pageLoadTime = Date.now();
      
      console.log('[CosMos] Initializing tracker v4.7.0...');
      
      // Check for expired session and send delayed exit event if needed
      this.checkAndSendDelayedExitEvent();
      
      // Track initial pageview immediately (including refreshes)
      this.trackPageview();
      
      // Setup client-side navigation tracking (for SPA/Next.js)
      this.setupClientSideNavigation();
      
      // Setup beforeunload to update exit candidate (NOT send exit event)
      this.setupBeforeUnload();
      
      // AFTER pageview is tracked, clear navigation flags
      setTimeout(function() {
        sessionStorage.removeItem('cosmos_is_navigating');
        sessionStorage.removeItem('cosmos_navigation_time');
        console.log('[CosMos] 🧹 Navigation flags cleared');
      }, 100);
    },
    
    // Check for expired previous session and send delayed exit event
    checkAndSendDelayedExitEvent: function() {
      const now = utils.getTimestamp();
      const sessionTimeoutSeconds = CONFIG.sessionTimeoutMinutes * 60;
      
      // Get exit candidate from localStorage
      const storedExitCandidate = localStorage.getItem('cosmos_exit_candidate');
      if (!storedExitCandidate) {
        console.log('[CosMos] No exit candidate found');
        return;
      }
      
      let exitCandidate = null;
      try {
        exitCandidate = JSON.parse(storedExitCandidate);
      } catch (e) {
        console.log('[CosMos] Failed to parse exit candidate');
        localStorage.removeItem('cosmos_exit_candidate');
        return;
      }
      
      // Check if the session has expired
      const timeSinceLastActivity = now - (exitCandidate.last_activity || 0);
      
      if (timeSinceLastActivity >= sessionTimeoutSeconds) {
        // Session expired - send delayed exit event
        console.log('[CosMos] 📤 Sending delayed exit event for expired session:', exitCandidate.session_id.substring(0, 8) + '...');
        
        const eventData = {
          timestamp: exitCandidate.last_activity + 1, // 1 second after last activity
          session_id: exitCandidate.session_id,
          user_id: exitCandidate.user_id,
          visit_count: exitCandidate.visit_count,
          is_new_visitor: exitCandidate.is_new_visitor,
          
          page_url: exitCandidate.page_url,
          page_title: exitCandidate.page_title,
          page_path: exitCandidate.page_path,
          
          page_sequence: exitCandidate.page_sequence,
          is_landing_page: exitCandidate.is_landing_page,
          previous_page_url: exitCandidate.previous_page_url,
          session_page_count: exitCandidate.session_page_count,
          is_exit_page: 1,
          
          referrer: exitCandidate.referrer,
          referrer_domain: exitCandidate.referrer_domain,
          
          tracking_code: exitCandidate.tracking_code || '',
          utm_source: exitCandidate.utm_source,
          utm_medium: exitCandidate.utm_medium,
          utm_campaign: exitCandidate.utm_campaign,
          utm_term: exitCandidate.utm_term,
          utm_content: exitCandidate.utm_content,
          
          user_agent: exitCandidate.user_agent,
          device_type: exitCandidate.device_type,
          screen_resolution: exitCandidate.screen_resolution,
          browser: exitCandidate.browser,
          os: exitCandidate.os,
          language: exitCandidate.language,
          
          event_type: 'page_exit',
          time_on_page: exitCandidate.time_on_page || 0
        };
        
        // Send the delayed exit event
        this.sendEvent(eventData);
        
        console.log('[CosMos] ✅ Delayed exit event sent for:', exitCandidate.page_path);
      } else {
        console.log('[CosMos] ⏳ Session still active, no exit event needed');
      }
      
      // Always clear the exit candidate after checking
      localStorage.removeItem('cosmos_exit_candidate');
    },
    
    // Setup client-side navigation tracking for SPA frameworks
    setupClientSideNavigation: function() {
      const self = this;
      let lastUrl = window.location.href;
      
      // Function to handle URL changes
      const handleUrlChange = function() {
        const currentUrl = window.location.href;
        const currentPath = window.location.pathname;
        
        // Only track if URL actually changed and it's a different path (not just hash)
        if (currentUrl !== lastUrl && currentPath !== new URL(lastUrl).pathname) {
          lastUrl = currentUrl;
          console.log('[CosMos] 🧭 Route change detected:', currentPath);
          
          // Reset page load time for new route
          self.pageLoadTime = Date.now();
          
          // Track the new pageview
          setTimeout(function() {
            self.trackPageview();
          }, 100); // Small delay to let DOM update
        }
      };
      
      // Listen to popstate (browser back/forward)
      window.addEventListener('popstate', handleUrlChange);
      
      // Intercept pushState and replaceState (Next.js router.push, router.replace)
      const originalPushState = history.pushState;
      const originalReplaceState = history.replaceState;
      
      history.pushState = function() {
        originalPushState.apply(this, arguments);
        handleUrlChange();
      };
      
      history.replaceState = function() {
        originalReplaceState.apply(this, arguments);
        handleUrlChange();
      };
      
      console.log('[CosMos] 🔄 Client-side navigation tracking enabled');
    },

    // Setup visitor tracking (persistent UUID) - ONLY called after UTM validation
    setupVisitorTracking: function() {
      this.visitorId = utils.getCookie(CONFIG.visitorCookieName);
      const now = utils.getTimestamp();
      
      if (!this.visitorId) {
        // Brand new visitor
        this.visitorId = utils.generateUUID();
        this.isNewVisitor = true;
        this.visitCount = 1;
        this.firstVisitTime = now;
        this.lastActivityTime = now;
        
        utils.setCookie(CONFIG.visitorCookieName, this.visitorId, CONFIG.cookieExpireDays);
        utils.setCookie(CONFIG.visitCountCookieName, '1', CONFIG.cookieExpireDays);
        utils.setCookie(CONFIG.firstVisitCookieName, this.firstVisitTime.toString(), CONFIG.cookieExpireDays);
        utils.setCookie(CONFIG.lastActivityCookieName, this.lastActivityTime.toString(), CONFIG.cookieExpireDays);
      } else {
        // Returning visitor - check if it's a new visit or same visit
        this.visitCount = parseInt(utils.getCookie(CONFIG.visitCountCookieName) || '1');
        this.firstVisitTime = parseInt(utils.getCookie(CONFIG.firstVisitCookieName) || now.toString());
        this.lastActivityTime = parseInt(utils.getCookie(CONFIG.lastActivityCookieName) || '0');
        
        // Check if last activity was more than the visit timeout
        const minutesSinceLastActivity = (now - this.lastActivityTime) / 60;
        
        if (minutesSinceLastActivity > CONFIG.visitTimeoutMinutes) {
          // New visit - increment visit count
          this.visitCount++;
          this.isNewVisitor = false;
          utils.setCookie(CONFIG.visitCountCookieName, this.visitCount.toString(), CONFIG.cookieExpireDays);
        } else {
          // Same visit - don't increment
          this.isNewVisitor = false;
        }
        
        // Update last activity time
        this.lastActivityTime = now;
        utils.setCookie(CONFIG.lastActivityCookieName, this.lastActivityTime.toString(), CONFIG.cookieExpireDays);
      }
      
      // Update last visit time
      this.lastVisitTime = now;
      utils.setCookie(CONFIG.lastVisitCookieName, this.lastVisitTime.toString(), CONFIG.cookieExpireDays);
    },

    // Setup session tracking - ONLY called after UTM validation
    setupSessionTracking: function(urlParams) {
      const now = utils.getTimestamp();
      const sessionTimeoutSeconds = CONFIG.sessionTimeoutMinutes * 60;
      
      // Get session state from localStorage
      const storedSessionData = localStorage.getItem('cosmos_session_data');
      let sessionData = null;
      
      if (storedSessionData) {
        try {
          sessionData = JSON.parse(storedSessionData);
        } catch (e) {
          console.log('[CosMos] Failed to parse session data, creating new session');
        }
      }
      
      // Check if stored session is still valid
      const isStoredSessionValid = sessionData && 
                                   sessionData.session_id && 
                                   sessionData.last_activity &&
                                   (now - sessionData.last_activity) < sessionTimeoutSeconds;
      
      const isNewSession = !isStoredSessionValid;
      
      if (isStoredSessionValid) {
        // Continue existing session
        this.sessionId = sessionData.session_id;
        console.log('[CosMos] 🔄 Continuing existing session:', this.sessionId.substring(0, 8) + '...');
      } else {
        // Create new session (either no session or expired)
        this.sessionId = utils.generateUUID();
        console.log('[CosMos] 🆕 Creating new session:', this.sessionId.substring(0, 8) + '...');
        
        // Clear old session data from localStorage
        localStorage.removeItem('cosmos_page_sequence_data');
        localStorage.removeItem('cosmos_page_flow_data');
        localStorage.removeItem('cosmos_session_utm_data'); // Clear old UTM data
      }
      
      // ============================================================
      // GOOGLE ANALYTICS-STYLE UTM PERSISTENCE
      // ============================================================
      // UTMs are LOCKED at session start and NEVER change during the session
      // This ensures consistent attribution even if user arrives via UTM link mid-session
      
      if (isNewSession) {
        // NEW SESSION: Set UTM parameters from current URL or mark as direct
        const hasUTMParams = urlParams.utm_campaign || urlParams.utm_source || urlParams.utm_medium;
        
        // Extract tracking_code from referrer if user came from /t/{code}
        let trackingCode = '';
        try {
          const referrer = document.referrer;
          if (referrer) {
            const referrerUrl = new URL(referrer);
            const referrerPath = referrerUrl.pathname;
            // Check if referrer is our tracking redirect: /t/{code}
            const trackMatch = referrerPath.match(/^\/t\/([a-zA-Z0-9]+)$/);
            if (trackMatch) {
              trackingCode = trackMatch[1];
              console.log('[CosMos] 🔗 Tracking code captured from referrer:', trackingCode);
            }
          }
        } catch (e) {
          // Ignore errors in referrer parsing
        }
        
        const sessionUTMData = {
          tracking_code: trackingCode,
          utm_source: hasUTMParams ? (urlParams.utm_source || '') : '(direct)',
          utm_medium: hasUTMParams ? (urlParams.utm_medium || '') : '(none)',
          utm_campaign: urlParams.utm_campaign || '',
          utm_term: urlParams.utm_term || '',
          utm_content: urlParams.utm_content || '',
          is_direct: hasUTMParams ? 0 : 1
        };
        
        // Store UTM data in localStorage for this session
        localStorage.setItem('cosmos_session_utm_data', JSON.stringify(sessionUTMData));
        console.log('[CosMos] 🎯 Session UTMs locked:', hasUTMParams ? urlParams.utm_source : '(direct)');
      } else {
        // EXISTING SESSION: UTMs already locked, ignore any new UTM parameters
        const storedUTMData = localStorage.getItem('cosmos_session_utm_data');
        if (storedUTMData) {
          console.log('[CosMos] 🔒 Using locked session UTMs (new UTMs ignored)');
        }
      }
      
      // Update session cookie
      utils.setCookie(CONFIG.sessionCookieName, this.sessionId, CONFIG.sessionTimeoutMinutes / (24 * 60));
      
      // Update session data in localStorage
      localStorage.setItem('cosmos_session_data', JSON.stringify({
        session_id: this.sessionId,
        last_activity: now,
        created_at: isStoredSessionValid ? sessionData.created_at : now
      }));
      
      // Get session page count from localStorage (persists across tab closes)
      const storedFlowData = localStorage.getItem('cosmos_page_flow_data');
      let flowData = null;
      
      if (storedFlowData) {
        try {
          flowData = JSON.parse(storedFlowData);
        } catch (e) {
          console.log('[CosMos] Failed to parse flow data');
        }
      }
      
      // Check if flow data belongs to current session
      if (flowData && flowData.session_id === this.sessionId) {
        this.sessionPageCount = flowData.session_page_count || 0;
        console.log('[CosMos] 📊 Restored session page count:', this.sessionPageCount);
      } else {
        this.sessionPageCount = 0;
      }
      
      // Also sync to sessionStorage for backward compatibility
      sessionStorage.setItem('cosmos_session_page_count', this.sessionPageCount.toString());
    },
    
    // Setup page sequence tracking (for page flow analysis)
    setupPageSequenceTracking: function() {
      const now = utils.getTimestamp();
      
      // Get page sequence data from localStorage (persists across tab closes)
      const storedSequenceData = localStorage.getItem('cosmos_page_sequence_data');
      let sequenceData = null;
      
      if (storedSequenceData) {
        try {
          sequenceData = JSON.parse(storedSequenceData);
        } catch (e) {
          console.log('[CosMos] Failed to parse sequence data');
        }
      }
      
      // Check if stored sequence belongs to current session
      const isSequenceValid = sequenceData && 
                             sequenceData.session_id === this.sessionId;
      
      if (isSequenceValid) {
        // Continue sequence from where we left off
        this.pageSequence = sequenceData.page_sequence + 1;
        console.log('[CosMos] 📈 Continuing page sequence:', this.pageSequence, '(from localStorage)');
      } else {
        // Start new sequence
        this.pageSequence = 1;
        console.log('[CosMos] 🆕 Starting new page sequence:', this.pageSequence);
      }
      
      // Store updated sequence in localStorage
      localStorage.setItem('cosmos_page_sequence_data', JSON.stringify({
        session_id: this.sessionId,
        page_sequence: this.pageSequence,
        last_update: now
      }));
      
      // Also keep in sessionStorage for backward compatibility
      sessionStorage.setItem('cosmos_page_seq', this.pageSequence.toString());
      sessionStorage.setItem('cosmos_session_tracker_id', this.sessionId);
    },

    // Track pageview
    trackPageview: function() {
      const urlParams = utils.getUrlParams();
      const currentLocation = new URL(window.location.href);
      const fullPageUrl = currentLocation.toString();
      currentLocation.search = '';
      currentLocation.hash = '';
      const cleanPageUrl = currentLocation.toString();
      const cleanPagePath = currentLocation.pathname;
      const now = Date.now();

      // Simple duplicate prevention - only block rapid-fire duplicates within 500ms
      // This allows F5 refreshes (which take >500ms) to count as pageviews
      const timeSinceLastTrack = now - this.lastTrackedTimestamp;
      if (this.lastTrackedPath === cleanPagePath && timeSinceLastTrack < 500) {
        console.log('[CosMos] ⚠️ Duplicate pageview suppressed (< 500ms):', cleanPagePath);
        return;
      }
      
      // ============================================================
      // UTM PARAMETER HANDLING - GOOGLE ANALYTICS STYLE
      // ============================================================
      // IMPORTANT: UTMs are LOCKED at session start and retrieved from localStorage
      // Any new UTM parameters in the URL mid-session are completely ignored
      // This ensures consistent attribution throughout the entire session
      //
      // Example Flow:
      // 1. User visits aptdecor.uz directly → UTMs: (direct)/(none) [LOCKED]
      // 2. User clicks link with ?utm_source=facebook → UTMs: (direct)/(none) [IGNORED]
      // 3. Session expires (2 min)
      // 4. User clicks ?utm_source=facebook → NEW SESSION with UTMs: facebook/... [LOCKED]
      //
      // Setup tracking infrastructure on first visit
      if (!this.isTrackingEnabled) {
        this.setupVisitorTracking();
        this.setupSessionTracking(urlParams); // Pass urlParams to lock UTMs at session start
        this.setupBeforeUnload(); // Setup exit tracking
        this.isTrackingEnabled = true;
        console.log('[CosMos] ✅ Tracking enabled');
      }
      
      // Setup page sequence tracking
      this.setupPageSequenceTracking();
      
      // Increment session page count
      this.sessionPageCount++;
      
      // Store in both sessionStorage (for backward compatibility) and localStorage (for persistence)
      sessionStorage.setItem('cosmos_session_page_count', this.sessionPageCount.toString());
      
      // Get locked UTM parameters from localStorage (set at session start)
      const storedUTMData = localStorage.getItem('cosmos_session_utm_data');
      let sessionUTMs = {
        tracking_code: '',
        utm_source: '',
        utm_medium: '',
        utm_campaign: '',
        utm_term: '',
        utm_content: '',
        is_direct: 0
      };
      
      if (storedUTMData) {
        try {
          sessionUTMs = JSON.parse(storedUTMData);
        } catch (e) {
          console.log('[CosMos] Failed to parse session UTM data');
        }
      }
      
      // Use locked session UTMs (ignore any new UTM parameters in URL)
      const trackingCode = sessionUTMs.tracking_code || '';
      const finalUTMSource = sessionUTMs.utm_source;
      const finalUTMMedium = sessionUTMs.utm_medium;
      const finalUTMCampaign = sessionUTMs.utm_campaign;
      const finalUTMTerm = sessionUTMs.utm_term;
      const finalUTMContent = sessionUTMs.utm_content;
      const isDirectTraffic = sessionUTMs.is_direct === 1;
      
      // Get previous page URL from localStorage (persists across tab closes)
      const storedFlowData = localStorage.getItem('cosmos_page_flow_data');
      let previousPageUrl = '';
      
      if (storedFlowData) {
        try {
          const flowData = JSON.parse(storedFlowData);
          if (flowData.session_id === this.sessionId) {
            previousPageUrl = flowData.last_page_url || '';
          }
        } catch (e) {
          // Fallback to sessionStorage if localStorage fails
          previousPageUrl = sessionStorage.getItem('cosmos_last_page_clean') || '';
        }
      }
      
      // CRITICAL: Landing page is ONLY the first page in a NEW SESSION
      // If page_sequence === 1, it's definitely a landing page
      // This ensures each new session properly records its landing page
      const isLandingPage = this.pageSequence === 1 ? 1 : 0;
      
      // Determine referrer domain (or mark as direct)
      let referrerDomain = utils.getReferrerDomain();
      if (isDirectTraffic && !document.referrer) {
        referrerDomain = '(direct)';
      }
      
      const eventData = {
        timestamp: utils.getTimestamp(),
        session_id: this.sessionId,
        user_id: this.visitorId,
        visit_count: this.visitCount,
        is_new_visitor: this.isNewVisitor ? 1 : 0,
        event_type: 'pageview',
        page_url: cleanPageUrl,
        page_title: document.title,
        page_path: cleanPagePath,
        page_sequence: this.pageSequence,
        is_landing_page: isLandingPage,
        previous_page_url: previousPageUrl,
        session_page_count: this.sessionPageCount,
        referrer: document.referrer || '',
        referrer_domain: referrerDomain,
        tracking_code: trackingCode,
        utm_source: finalUTMSource,
        utm_medium: finalUTMMedium,
        utm_campaign: finalUTMCampaign,
        utm_term: finalUTMTerm,
        utm_content: finalUTMContent,
        user_agent: navigator.userAgent,
        device_type: utils.getDeviceType(),
        browser: utils.getBrowser(),
        os: utils.getOS(),
        screen_resolution: utils.getScreenResolution(),
        time_on_page: 0,
      };

      console.log('[CosMos] 📊 Pageview tracked:', {
        sequence: this.pageSequence,
        page: cleanPagePath,
        isLanding: isLandingPage === 1,
        source: finalUTMSource
      });

      this.sendEvent(eventData);
      this.lastTrackedPath = cleanPagePath;
      this.lastTrackedTimestamp = now;
      
      // Update session activity timestamp in localStorage to keep session alive
      const sessionData = JSON.parse(localStorage.getItem('cosmos_session_data') || '{}');
      if (sessionData.session_id === this.sessionId) {
        sessionData.last_activity = utils.getTimestamp();
        localStorage.setItem('cosmos_session_data', JSON.stringify(sessionData));
      }
      
      // Store exit candidate in localStorage (Google Analytics approach)
      // This will be used to send a delayed exit event if the session expires
      const exitCandidate = {
        session_id: this.sessionId,
        user_id: this.visitorId,
        visit_count: this.visitCount,
        is_new_visitor: this.isNewVisitor ? 1 : 0,
        
        page_url: cleanPageUrl,
        page_title: document.title,
        page_path: cleanPagePath,
        
        page_sequence: this.pageSequence,
        is_landing_page: isLandingPage,
        previous_page_url: previousPageUrl,
        session_page_count: this.sessionPageCount,
        
        referrer: document.referrer || '',
        referrer_domain: referrerDomain,
        
        tracking_code: trackingCode,
        utm_source: finalUTMSource,
        utm_medium: finalUTMMedium,
        utm_campaign: finalUTMCampaign,
        utm_term: finalUTMTerm,
        utm_content: finalUTMContent,
        
        user_agent: navigator.userAgent,
        device_type: utils.getDeviceType(),
        screen_resolution: utils.getScreenResolution(),
        browser: utils.getBrowser(),
        os: utils.getOS(),
        language: navigator.language || '',
        
        last_activity: utils.getTimestamp(),
        time_on_page: 0
      };
      
      localStorage.setItem('cosmos_exit_candidate', JSON.stringify(exitCandidate));
      console.log('[CosMos] 💾 Exit candidate stored');
      
      // Store current page data for exit tracking
      // This is CRITICAL - we store NOW so beforeunload uses the RIGHT page
      this.currentPageData = {
        url: cleanPageUrl,
        path: cleanPagePath,
        title: document.title,
        loadTime: this.pageLoadTime,
        sequence: this.pageSequence,
        sessionPageCount: this.sessionPageCount,
        isLanding: isLandingPage,
        previousPageUrl: previousPageUrl
      };
      
      // Store current page as last page for next pageview in localStorage (persists across tab closes)
      localStorage.setItem('cosmos_page_flow_data', JSON.stringify({
        session_id: this.sessionId,
        last_page_url: cleanPageUrl,
        session_page_count: this.sessionPageCount,
        last_update: utils.getTimestamp()
      }));
      
      // Also store in sessionStorage for backward compatibility
      sessionStorage.setItem('cosmos_last_page_clean', cleanPageUrl);
      sessionStorage.setItem('cosmos_last_page_full', fullPageUrl);
    },

    sendEvent: function(data) {
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
        navigator.sendBeacon(CONFIG.apiEndpoint, blob);
      } else {
        fetch(CONFIG.apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
          keepalive: true,
        }).catch(() => {});
      }
    },

     // Update exit candidate on beforeunload (Google Analytics approach)
    // NO longer sends exit event immediately - only updates time_on_page
    setupBeforeUnload: function() {
      const self = this;
      
      window.addEventListener('beforeunload', function(e) {
        // Only update exit candidate if tracking is enabled
        if (!self.isTrackingEnabled || !self.currentPageData || !self.currentPageData.url) {
          return;
        }
        
        // Calculate time on page
        const timeOnPage = Math.floor((Date.now() - self.currentPageData.loadTime) / 1000);
        
        // Update the exit candidate with accurate time_on_page
        const storedExitCandidate = localStorage.getItem('cosmos_exit_candidate');
        if (storedExitCandidate) {
          try {
            const exitCandidate = JSON.parse(storedExitCandidate);
            exitCandidate.time_on_page = timeOnPage;
            exitCandidate.last_activity = utils.getTimestamp();
            localStorage.setItem('cosmos_exit_candidate', JSON.stringify(exitCandidate));
            console.log('[CosMos] 💾 Exit candidate updated with time_on_page:', timeOnPage + 's');
          } catch (err) {
            console.log('[CosMos] Failed to update exit candidate:', err);
          }
        }
        
        // NOTE: We do NOT send exit event here anymore (Google Analytics approach)
        // Exit event will be sent retrospectively when session expires on next visit
      });
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => CosmosTracker.init());
  } else {
    CosmosTracker.init();
  }

  window.CosmosTracker = CosmosTracker;
})();
