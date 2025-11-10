/**
 * CosMos AI - Client-Side Tracking Script
 * Version: 3.1.0
 *
 * Fixes:
 * - Ensures strict UTM-gated tracking (no tracking unless UTM params exist)
 * - Prevents ghost visits from direct or incognito entries
 * - Cleans up stale Cosmos cookies if UTM validation fails
 */

(function() {
  'use strict';

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

    requireUTMParams: true,
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
      document.cookie.split(';').forEach(c => {
        if (c.trim().startsWith('cosmos_')) {
          document.cookie = c.split('=')[0] + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
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
    isTrackingEnabled: false,
    pageLoadTime: null,

    init: function() {
      this.pageLoadTime = Date.now();

      const urlParams = utils.getUrlParams();
      const hasUTMParams = urlParams.utm_campaign || urlParams.utm_source || urlParams.utm_medium;
      const hasStoredUTM = sessionStorage.getItem('cosmos_utm_source') || sessionStorage.getItem('cosmos_utm_campaign');

      if (CONFIG.requireUTMParams && !hasUTMParams && !hasStoredUTM) {
        console.log('[CosMos] Tracking disabled - no UTM parameters found.');
        utils.deleteCosmosCookies();
        sessionStorage.clear();
        return; // 🚫 stop completely
      }

      this.isTrackingEnabled = true;
      console.log('[CosMos] ✅ UTM validation passed. Tracking enabled.');
      this.trackPageview();
    },

    // Everything below this point remains identical to v3.0.0
    setupVisitorTracking: function() {
      this.visitorId = utils.getCookie(CONFIG.visitorCookieName);
      const now = utils.getTimestamp();
      if (!this.visitorId) {
        this.visitorId = utils.generateUUID();
        this.isNewVisitor = true;
        this.visitCount = 1;
        utils.setCookie(CONFIG.visitorCookieName, this.visitorId, CONFIG.cookieExpireDays);
        utils.setCookie(CONFIG.visitCountCookieName, '1', CONFIG.cookieExpireDays);
      } else {
        this.visitCount = parseInt(utils.getCookie(CONFIG.visitCountCookieName) || '1');
      }
    },

    setupSessionTracking: function() {
      this.sessionId = utils.getCookie(CONFIG.sessionCookieName);
      if (!this.sessionId) {
        this.sessionId = utils.generateUUID();
        utils.setCookie(CONFIG.sessionCookieName, this.sessionId, CONFIG.sessionTimeoutMinutes / (24 * 60));
      }
    },

    trackPageview: function() {
      if (!this.isTrackingEnabled) return;
      const urlParams = utils.getUrlParams();

      // Store UTM for later pages
      if (urlParams.utm_source || urlParams.utm_medium || urlParams.utm_campaign) {
        sessionStorage.setItem('cosmos_utm_source', urlParams.utm_source || '');
        sessionStorage.setItem('cosmos_utm_medium', urlParams.utm_medium || '');
        sessionStorage.setItem('cosmos_utm_campaign', urlParams.utm_campaign || '');
      }

      this.setupVisitorTracking();
      this.setupSessionTracking();

      const eventData = {
        timestamp: utils.getTimestamp(),
        session_id: this.sessionId,
        user_id: this.visitorId,
        visit_count: this.visitCount,
        event_type: 'pageview',
        page_url: window.location.href,
        page_title: document.title,
        referrer: document.referrer || '',
        utm_source: sessionStorage.getItem('cosmos_utm_source') || '',
        utm_medium: sessionStorage.getItem('cosmos_utm_medium') || '',
        utm_campaign: sessionStorage.getItem('cosmos_utm_campaign') || '',
        user_agent: navigator.userAgent,
        device_type: utils.getDeviceType(),
        browser: utils.getBrowser(),
        os: utils.getOS(),
        screen_resolution: utils.getScreenResolution(),
      };

      this.sendEvent(eventData);
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
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => CosmosTracker.init());
  } else {
    CosmosTracker.init();
  }

  window.CosmosTracker = CosmosTracker;
})();
