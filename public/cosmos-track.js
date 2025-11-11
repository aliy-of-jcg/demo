/**
 * CosMos AI - Client-Side Tracking Script
 * Version: 4.4.0
 *
 * Key Features:
 * - Tracks ALL visitors (with or without UTM parameters)
 * - Direct visits marked as utm_source: '(direct)', utm_medium: '(none)'
 * - 30-minute visit window (refreshes within window don't increment visit_count)
 * - Page count per session
 * - Exit page tracking ONLY on tab/browser close (not on navigation)
 * - Page refreshes count as pageviews
 * - Proper landing page tracking across multiple sessions
 * - Client-side navigation tracking (SPA/Next.js router support)
 *
 * New in v4.4.0:
 * - Auto-detects client-side route changes (Next.js, SPA frameworks)
 * - Tracks pageviews on internal navigation without page reload
 * - Monitors pushState, replaceState, and popstate events
 * - Compatible with both traditional multi-page and SPA architectures
 *
 * Previous Fixes (v4.3.0):
 * - Fixed page_sequence resetting to 1 on navigation (now increments properly)
 * - Enhanced internal navigation detection with sessionStorage flags
 * - Fixed exit events firing on internal navigation
 * - Added session ID tracking for better page sequence management
 * - Landing page flag now correctly set only for first page (page_sequence=1)
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
    sessionTimeoutMinutes: 30,
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
      
      console.log('[CosMos] Initializing tracker v4.4.0...');
      
      // Track initial pageview immediately (including refreshes)
      this.trackPageview();
      
      // Setup client-side navigation tracking (for SPA/Next.js)
      this.setupClientSideNavigation();
      
      // AFTER pageview is tracked, clear navigation flags
      setTimeout(function() {
        sessionStorage.removeItem('cosmos_is_navigating');
        sessionStorage.removeItem('cosmos_navigation_time');
        console.log('[CosMos] 🧹 Navigation flags cleared');
      }, 100);
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
    setupSessionTracking: function() {
      this.sessionId = utils.getCookie(CONFIG.sessionCookieName);
      
      if (!this.sessionId) {
        // Create new session
        this.sessionId = utils.generateUUID();
        utils.setCookie(CONFIG.sessionCookieName, this.sessionId, CONFIG.sessionTimeoutMinutes / (24 * 60));
        // Reset session page count
        sessionStorage.setItem('cosmos_session_page_count', '0');
      }
      
      // Get session page count
      this.sessionPageCount = parseInt(sessionStorage.getItem('cosmos_session_page_count') || '0');
    },
    
    // Setup page sequence tracking (for page flow analysis)
    setupPageSequenceTracking: function() {
      // Get current page sequence from sessionStorage
      const storedSequence = sessionStorage.getItem('cosmos_page_seq');
      const storedSessionId = sessionStorage.getItem('cosmos_session_tracker_id');
      
      // Check if this is the same session
      if (storedSessionId === this.sessionId && storedSequence) {
        // Same session - increment sequence
        this.pageSequence = parseInt(storedSequence) + 1;
        console.log('[CosMos] 📈 Incrementing page sequence:', this.pageSequence);
      } else {
        // New session or missing data - start at 1
        this.pageSequence = 1;
        console.log('[CosMos] 🆕 Starting new page sequence:', this.pageSequence);
        // Store session ID for tracking
        sessionStorage.setItem('cosmos_session_tracker_id', this.sessionId);
      }
      
      // Store updated sequence
      sessionStorage.setItem('cosmos_page_seq', this.pageSequence.toString());
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
      // UTM PARAMETER HANDLING
      // ============================================================
      // Check if user has UTM parameters in URL
      const hasUTMParams = urlParams.utm_campaign || urlParams.utm_source || urlParams.utm_medium;
      
      // Check if UTM parameters were stored from previous page in this session
      const storedUTMSource = sessionStorage.getItem('cosmos_utm_source') || '';
      const storedUTMCampaign = sessionStorage.getItem('cosmos_utm_campaign') || '';
      const hasStoredUTM = storedUTMSource || storedUTMCampaign;
      
      // Check page sequence temporarily to determine if this is landing page
      const tempPageSeq = parseInt(sessionStorage.getItem('cosmos_page_seq') || '0') + 1;
      
      // NEW: Track everyone, but handle direct vs UTM differently
      let isDirectTraffic = false;
      
      // If it's the first page and no UTM params, mark as direct traffic
      if (tempPageSeq === 1 && !hasUTMParams && !hasStoredUTM) {
        isDirectTraffic = true;
        // Set direct traffic markers in sessionStorage
        sessionStorage.setItem('cosmos_utm_source', '(direct)');
        sessionStorage.setItem('cosmos_utm_medium', '(none)');
        sessionStorage.setItem('cosmos_utm_campaign', '');
        sessionStorage.setItem('cosmos_utm_term', '');
        sessionStorage.setItem('cosmos_utm_content', '');
        sessionStorage.setItem('cosmos_is_direct', '1');
      }
      
      // Setup tracking infrastructure on first accepted visit
      if (!this.isTrackingEnabled) {
        this.setupVisitorTracking();
        this.setupSessionTracking();
        this.setupBeforeUnload(); // Setup exit tracking
        this.isTrackingEnabled = true;
        console.log('[CosMos] ✅ Tracking enabled. Source:', isDirectTraffic ? 'Direct' : 'UTM');
      }
      
      // Setup page sequence tracking
      this.setupPageSequenceTracking();
      
      // Increment session page count
      this.sessionPageCount++;
      sessionStorage.setItem('cosmos_session_page_count', this.sessionPageCount.toString());
      
      // Store UTM params in session storage for subsequent pages (if they exist)
      if (hasUTMParams) {
        sessionStorage.setItem('cosmos_utm_source', urlParams.utm_source || '');
        sessionStorage.setItem('cosmos_utm_medium', urlParams.utm_medium || '');
        sessionStorage.setItem('cosmos_utm_campaign', urlParams.utm_campaign || '');
        sessionStorage.setItem('cosmos_utm_term', urlParams.utm_term || '');
        sessionStorage.setItem('cosmos_utm_content', urlParams.utm_content || '');
        sessionStorage.removeItem('cosmos_is_direct'); // Remove direct flag if UTM params appear
      }
      
      // Use stored UTM params (or direct markers)
      const finalUTMSource = urlParams.utm_source || sessionStorage.getItem('cosmos_utm_source') || '';
      const finalUTMMedium = urlParams.utm_medium || sessionStorage.getItem('cosmos_utm_medium') || '';
      const finalUTMCampaign = urlParams.utm_campaign || sessionStorage.getItem('cosmos_utm_campaign') || '';
      const finalUTMTerm = urlParams.utm_term || sessionStorage.getItem('cosmos_utm_term') || '';
      const finalUTMContent = urlParams.utm_content || sessionStorage.getItem('cosmos_utm_content') || '';
      
      // Get previous page URL from sessionStorage (for page flow tracking)
      const previousPageUrl = sessionStorage.getItem('cosmos_last_page_clean') || '';
      
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
      
      // Store current page as last page for next pageview
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

     // Track time on page before unload
    setupBeforeUnload: function() {
      const self = this;
      
      // Flag to detect if we're navigating to another page on same site
      let isNavigatingAway = false;
      let navigationTimeout = null;
      
      // Listen for clicks on links (internal navigation)
      document.addEventListener('click', function(e) {
        const target = e.target.closest('a');
        if (target && target.href) {
          try {
            const targetUrl = new URL(target.href, window.location.origin);
            const isSameOrigin = targetUrl.origin === window.location.origin;
            
            if (isSameOrigin) {
              isNavigatingAway = true;
              console.log('[CosMos] 🔗 Internal link clicked:', targetUrl.pathname);
              
              // Set flag in sessionStorage for cross-page communication
              sessionStorage.setItem('cosmos_is_navigating', '1');
              sessionStorage.setItem('cosmos_navigation_time', Date.now().toString());
              
              // Clear flag after 3 seconds (in case navigation fails)
              clearTimeout(navigationTimeout);
              navigationTimeout = setTimeout(function() {
                isNavigatingAway = false;
                sessionStorage.removeItem('cosmos_is_navigating');
                console.log('[CosMos] ⏰ Navigation timeout - clearing flags');
              }, 3000);
            }
          } catch (err) {
            console.log('[CosMos] Error parsing URL:', err);
          }
        }
      }, true);
      
      window.addEventListener('beforeunload', function(e) {
        // Only send exit event if tracking is enabled
        if (!self.isTrackingEnabled) {
          return;
        }
        
        // CRITICAL: If navigating to another page on same site, DON'T send exit event
        if (isNavigatingAway) {
          console.log('[CosMos] ⏭️ Skipping exit event - internal navigation');
          return;
        }
        
        // Check sessionStorage flag one more time
        if (sessionStorage.getItem('cosmos_is_navigating') === '1') {
          console.log('[CosMos] ⏭️ Skipping exit event - navigation flag set');
          return;
        }
        
        // If we reach here, it's a real exit (tab close, browser close, or external navigation)
        console.log('[CosMos] 🚪 Real exit detected (tab close or external link)');
        
        // Use stored page data
        if (!self.currentPageData || !self.currentPageData.url) {
          console.log('[CosMos] ⚠️ No current page data stored, skipping exit event');
          return;
        }
        
        const timeOnPage = Math.floor((Date.now() - self.currentPageData.loadTime) / 1000);
        
        // Use stored UTM params or direct markers (ALWAYS preserve them)
        const finalUTMSource = sessionStorage.getItem('cosmos_utm_source') || '';
        const finalUTMMedium = sessionStorage.getItem('cosmos_utm_medium') || '';
        const finalUTMCampaign = sessionStorage.getItem('cosmos_utm_campaign') || '';
        const finalUTMTerm = sessionStorage.getItem('cosmos_utm_term') || '';
        const finalUTMContent = sessionStorage.getItem('cosmos_utm_content') || '';
        
        // Determine referrer domain
        let referrerDomain = utils.getReferrerDomain();
        if (sessionStorage.getItem('cosmos_is_direct') === '1' && !document.referrer) {
          referrerDomain = '(direct)';
        }
        
        // Use STORED page data (from when pageview was tracked)
        const exitPageUrl = self.currentPageData.url;
        const exitPagePath = self.currentPageData.path;
        const exitPageTitle = self.currentPageData.title;
        const exitPageSequence = self.currentPageData.sequence;
        const exitSessionPageCount = self.currentPageData.sessionPageCount;
        const exitIsLandingPage = self.currentPageData.isLanding || 0;
        const exitPreviousPageUrl = self.currentPageData.previousPageUrl || '';
        
        const eventData = {
          timestamp: utils.getTimestamp(),
          session_id: self.sessionId,
          user_id: self.visitorId,
          visit_count: self.visitCount,
          is_new_visitor: self.isNewVisitor ? 1 : 0,
          
          // Use stored page data
          page_url: exitPageUrl,
          page_title: exitPageTitle,
          page_path: exitPagePath,
          
          // Page Flow Tracking - preserve original page's metadata
          page_sequence: exitPageSequence,
          is_landing_page: exitIsLandingPage,
          previous_page_url: exitPreviousPageUrl,
          session_page_count: exitSessionPageCount,
          is_exit_page: 1, // Mark this as exit page
          
          referrer: document.referrer || '',
          referrer_domain: referrerDomain,
          
          // Always include UTM parameters
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
          event_type: 'page_exit',
          time_on_page: timeOnPage
        };
        
        console.log('[CosMos] 🚪 Exit event (tab close):', {
          exitFrom: exitPagePath,
          sequence: exitPageSequence,
          timeOnPage: timeOnPage
        });
        
        // Use sendBeacon for reliability
        if (navigator.sendBeacon) {
          const blob = new Blob([JSON.stringify(eventData)], { type: 'application/json' });
          navigator.sendBeacon(CONFIG.apiEndpoint, blob);
        }
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
