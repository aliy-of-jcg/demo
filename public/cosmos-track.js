/**
 * CosMos AI - Client-Side Tracking Script
 * Version: 1.0.0
 * 
 * This script tracks pageviews, sessions, and user behavior
 * for analytics on aptdecor.uz
 */

(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    apiEndpoint: '/api/log', // Will send to cosmos.kr/api/log
    cookieDomain: window.location.hostname,
    visitorCookieName: 'cosmos_visitor_id',
    sessionCookieName: 'cosmos_session_id',
    visitCountCookieName: 'cosmos_visit_count',
    firstVisitCookieName: 'cosmos_first_visit',
    lastVisitCookieName: 'cosmos_last_visit',
    cookieExpireDays: 730, // 2 years for visitor ID
    sessionTimeoutMinutes: 30,
    pageViewDebounceMs: 500, // Prevent duplicate pageviews
  };

  // Utility Functions
  const utils = {
    // Generate UUID v4
    generateUUID: function() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    },

    // Set cookie
    setCookie: function(name, value, days) {
      const expires = new Date();
      expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
      document.cookie = name + '=' + value + ';expires=' + expires.toUTCString() + ';path=/;SameSite=Lax';
    },

    // Get cookie
    getCookie: function(name) {
      const nameEQ = name + '=';
      const ca = document.cookie.split(';');
      for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
      }
      return null;
    },

    // Parse URL parameters
    getUrlParams: function() {
      const params = {};
      const queryString = window.location.search.substring(1);
      const pairs = queryString.split('&');
      
      for (let i = 0; i < pairs.length; i++) {
        const pair = pairs[i].split('=');
        if (pair[0]) {
          params[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || '');
        }
      }
      return params;
    },

    // Get referrer domain
    getReferrerDomain: function() {
      if (!document.referrer) return '';
      try {
        const url = new URL(document.referrer);
        return url.hostname;
      } catch (e) {
        return '';
      }
    },

    // Detect device type (always lowercase for consistency)
    getDeviceType: function() {
      const ua = navigator.userAgent.toLowerCase();
      if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
        return 'tablet';
      }
      if (/mobile|iphone|ipod|android|blackberry|iemobile|kindle|silk-accelerated|(hpw|web)os|opera m(obi|ini)/i.test(ua)) {
        return 'mobile';
      }
      return 'desktop';
    },

    // Get screen resolution
    getScreenResolution: function() {
      return window.screen.width + 'x' + window.screen.height;
    },

    // Detect browser from user agent
    getBrowser: function() {
      const ua = navigator.userAgent;
      
      // Check for specific browsers (order matters!)
      if (ua.indexOf('YaBrowser') > -1 || ua.indexOf('Yandex') > -1) return 'Yandex';
      if (ua.indexOf('Edg/') > -1 || ua.indexOf('Edge/') > -1) return 'Edge';
      if (ua.indexOf('OPR') > -1 || ua.indexOf('Opera') > -1) return 'Opera';
      if (ua.indexOf('Firefox') > -1) return 'Firefox';
      if (ua.indexOf('Safari') > -1 && ua.indexOf('Chrome') === -1) return 'Safari';
      if (ua.indexOf('Chrome') > -1) return 'Chrome';
      if (ua.indexOf('MSIE') > -1 || ua.indexOf('Trident/') > -1) return 'Internet Explorer';
      
      return 'Unknown';
    },

    // Detect OS from user agent
    getOS: function() {
      const ua = navigator.userAgent;
      
      if (ua.indexOf('Win') > -1) return 'Windows';
      if (ua.indexOf('Mac') > -1 && ua.indexOf('Mobile') === -1) return 'macOS';
      if (ua.indexOf('Linux') > -1 && ua.indexOf('Android') === -1) return 'Linux';
      if (ua.indexOf('Android') > -1) return 'Android';
      if (ua.indexOf('iOS') > -1 || ua.indexOf('iPhone') > -1 || ua.indexOf('iPad') > -1) return 'iOS';
      
      return 'Unknown';
    },

    // Get current timestamp
    getTimestamp: function() {
      return Math.floor(Date.now() / 1000);
    }
  };

  // Tracking Class
  const CosmosTracker = {
    visitorId: null,
    sessionId: null,
    visitCount: 0,
    isNewVisitor: false,
    firstVisitTime: null,
    lastVisitTime: null,
    pageLoadTime: null,
    lastPageviewSent: 0,
    pageSequence: 0,

    // Initialize tracker
    init: function() {
      this.pageLoadTime = Date.now();
      this.setupVisitorTracking();
      this.setupSessionTracking();
      this.setupPageSequenceTracking();
      this.trackPageview();
      this.setupBeforeUnload();
    },
    
    // Setup page sequence tracking (for page flow analysis)
    setupPageSequenceTracking: function() {
      // Get current page sequence from sessionStorage
      this.pageSequence = parseInt(sessionStorage.getItem('cosmos_page_seq') || '0');
      // Increment for this pageview
      this.pageSequence++;
      // Store updated sequence
      sessionStorage.setItem('cosmos_page_seq', this.pageSequence.toString());
    },

    // Setup visitor tracking (persistent UUID)
    setupVisitorTracking: function() {
      // Get or create visitor ID
      this.visitorId = utils.getCookie(CONFIG.visitorCookieName);
      
      if (!this.visitorId) {
        // New visitor
        this.visitorId = utils.generateUUID();
        this.isNewVisitor = true;
        this.visitCount = 1;
        this.firstVisitTime = utils.getTimestamp();
        
        utils.setCookie(CONFIG.visitorCookieName, this.visitorId, CONFIG.cookieExpireDays);
        utils.setCookie(CONFIG.visitCountCookieName, '1', CONFIG.cookieExpireDays);
        utils.setCookie(CONFIG.firstVisitCookieName, this.firstVisitTime.toString(), CONFIG.cookieExpireDays);
      } else {
        // Returning visitor
        this.isNewVisitor = false;
        this.visitCount = parseInt(utils.getCookie(CONFIG.visitCountCookieName) || '1');
        this.firstVisitTime = parseInt(utils.getCookie(CONFIG.firstVisitCookieName) || utils.getTimestamp().toString());
        
        // Increment visit count
        this.visitCount++;
        utils.setCookie(CONFIG.visitCountCookieName, this.visitCount.toString(), CONFIG.cookieExpireDays);
      }
      
      // Update last visit time
      this.lastVisitTime = utils.getTimestamp();
      utils.setCookie(CONFIG.lastVisitCookieName, this.lastVisitTime.toString(), CONFIG.cookieExpireDays);
    },

    // Setup session tracking
    setupSessionTracking: function() {
      // Check for existing session
      this.sessionId = utils.getCookie(CONFIG.sessionCookieName);
      
      if (!this.sessionId) {
        // Create new session
        this.sessionId = utils.generateUUID();
        // Session cookie expires after timeout minutes
        utils.setCookie(CONFIG.sessionCookieName, this.sessionId, CONFIG.sessionTimeoutMinutes / (24 * 60));
      }
    },

    // Track pageview
    trackPageview: function() {
      // Debounce to prevent duplicate tracking
      const now = Date.now();
      if (now - this.lastPageviewSent < CONFIG.pageViewDebounceMs) {
        return;
      }
      this.lastPageviewSent = now;

      const urlParams = utils.getUrlParams();
      
      // Get previous page URL from sessionStorage
      const previousPageUrl = sessionStorage.getItem('cosmos_last_page') || '';
      const isLandingPage = this.pageSequence === 1 ? 1 : 0;
      
      const eventData = {
        // Timestamp
        timestamp: utils.getTimestamp(),
        
        // Session & Visitor
        session_id: this.sessionId,
        user_id: this.visitorId,
        visit_count: this.visitCount,
        is_new_visitor: this.isNewVisitor ? 1 : 0,
        
        // Page Info
        page_url: window.location.href,
        page_title: document.title,
        page_path: window.location.pathname,
        
        // Page Flow Tracking
        page_sequence: this.pageSequence,
        is_landing_page: isLandingPage,
        previous_page_url: previousPageUrl,
        
        // Referrer
        referrer: document.referrer || '',
        referrer_domain: utils.getReferrerDomain(),
        
        // UTM Parameters
        utm_source: urlParams.utm_source || '',
        utm_medium: urlParams.utm_medium || '',
        utm_campaign: urlParams.utm_campaign || '',
        utm_term: urlParams.utm_term || '',
        utm_content: urlParams.utm_content || '',
        
        // User Agent & Device
        user_agent: navigator.userAgent,
        device_type: utils.getDeviceType(),
        screen_resolution: utils.getScreenResolution(),
        browser: utils.getBrowser(),
        os: utils.getOS(),
        
        // Browser Info
        language: navigator.language || '',
        
        // Event Type
        event_type: 'pageview',
        
        // Time on page (will be 0 for initial pageview)
        time_on_page: 0
      };

      this.sendEvent(eventData);
      
      // Store current page as last page for next pageview
      sessionStorage.setItem('cosmos_last_page', window.location.href);
    },

    // Send event to API
    sendEvent: function(data) {
      // Use sendBeacon if available (for reliability)
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
        navigator.sendBeacon(CONFIG.apiEndpoint, blob);
      } else {
        // Fallback to fetch
        fetch(CONFIG.apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
          keepalive: true
        }).catch(function(error) {
          // Silently fail - don't break the page
        });
      }
    },

    // Track time on page before unload
    setupBeforeUnload: function() {
      const self = this;
      window.addEventListener('beforeunload', function() {
        const timeOnPage = Math.floor((Date.now() - self.pageLoadTime) / 1000);
        
        // Send final event with time on page
        const urlParams = utils.getUrlParams();
        
        // Get previous page URL from sessionStorage
        const previousPageUrl = sessionStorage.getItem('cosmos_last_page') || '';
        const isLandingPage = self.pageSequence === 1 ? 1 : 0;
        
        const eventData = {
          timestamp: utils.getTimestamp(),
          session_id: self.sessionId,
          user_id: self.visitorId,
          visit_count: self.visitCount,
          is_new_visitor: self.isNewVisitor ? 1 : 0,
          page_url: window.location.href,
          page_title: document.title,
          page_path: window.location.pathname,
          
          // Page Flow Tracking
          page_sequence: self.pageSequence,
          is_landing_page: isLandingPage,
          previous_page_url: previousPageUrl,
          
          referrer: document.referrer || '',
          referrer_domain: utils.getReferrerDomain(),
          utm_source: urlParams.utm_source || '',
          utm_medium: urlParams.utm_medium || '',
          utm_campaign: urlParams.utm_campaign || '',
          utm_term: urlParams.utm_term || '',
          utm_content: urlParams.utm_content || '',
          user_agent: navigator.userAgent,
          device_type: utils.getDeviceType(),
          screen_resolution: utils.getScreenResolution(),
          browser: utils.getBrowser(),
          os: utils.getOS(),
          language: navigator.language || '',
          event_type: 'page_exit',
          time_on_page: timeOnPage
        };
        
        // Use sendBeacon for reliability
        if (navigator.sendBeacon) {
          const blob = new Blob([JSON.stringify(eventData)], { type: 'application/json' });
          navigator.sendBeacon(CONFIG.apiEndpoint, blob);
        }
      });
    }
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      CosmosTracker.init();
    });
  } else {
    // DOM already loaded
    CosmosTracker.init();
  }

  // Expose tracker globally (optional, for debugging)
  window.CosmosTracker = CosmosTracker;

})();

