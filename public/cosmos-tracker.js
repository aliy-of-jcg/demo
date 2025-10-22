/**
 * CosMos AI Tracking Script
 * Captures pageviews, user behavior, and UTM parameters
 */

(function() {
  'use strict';

  // Configuration
  const config = {
    apiEndpoint: '/api/track',
    sessionTimeout: 30 * 60 * 1000, // 30 minutes
    heartbeatInterval: 15000 // 15 seconds
  };

  // Helper functions
  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  }

  function setCookie(name, value, days) {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
  }

  function getOrCreateUserId() {
    let userId = localStorage.getItem('cosmos_user_id');
    if (!userId) {
      userId = generateUUID();
      localStorage.setItem('cosmos_user_id', userId);
      localStorage.setItem('cosmos_first_visit', new Date().toISOString());
    }
    return userId;
  }

  function getOrCreateSessionId() {
    let sessionId = sessionStorage.getItem('cosmos_session_id');
    let lastActivity = sessionStorage.getItem('cosmos_last_activity');
    
    const now = Date.now();
    if (!sessionId || !lastActivity || (now - parseInt(lastActivity)) > config.sessionTimeout) {
      sessionId = generateUUID();
      sessionStorage.setItem('cosmos_session_id', sessionId);
      sessionStorage.setItem('cosmos_session_start', new Date().toISOString());
    }
    
    sessionStorage.setItem('cosmos_last_activity', now.toString());
    return sessionId;
  }

  function getVisitCount() {
    let count = parseInt(localStorage.getItem('cosmos_visit_count') || '0');
    count++;
    localStorage.setItem('cosmos_visit_count', count.toString());
    return count;
  }

  function isNewVisitor() {
    return getVisitCount() === 1;
  }

  function getUTMParameters() {
    const params = new URLSearchParams(window.location.search);
    return {
      utm_source: params.get('utm_source') || '',
      utm_medium: params.get('utm_medium') || '',
      utm_campaign: params.get('utm_campaign') || '',
      utm_term: params.get('utm_term') || '',
      utm_content: params.get('utm_content') || ''
    };
  }

  function getScreenResolution() {
    return `${window.screen.width}x${window.screen.height}`;
  }

  function getDeviceType() {
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
      return 'Tablet';
    }
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
      return 'Mobile';
    }
    return 'Desktop';
  }

  function getOS() {
    const ua = navigator.userAgent;
    if (ua.indexOf('Win') > -1) return 'Windows';
    if (ua.indexOf('Mac') > -1) return 'macOS';
    if (ua.indexOf('Linux') > -1) return 'Linux';
    if (ua.indexOf('Android') > -1) return 'Android';
    if (ua.indexOf('iOS') > -1 || ua.indexOf('iPhone') > -1 || ua.indexOf('iPad') > -1) return 'iOS';
    return 'Unknown';
  }

  function getBrowser() {
    const ua = navigator.userAgent;
    if (ua.indexOf('Chrome') > -1 && ua.indexOf('Edg') === -1) return 'Chrome';
    if (ua.indexOf('Safari') > -1 && ua.indexOf('Chrome') === -1) return 'Safari';
    if (ua.indexOf('Firefox') > -1) return 'Firefox';
    if (ua.indexOf('Edg') > -1) return 'Edge';
    if (ua.indexOf('MSIE') > -1 || ua.indexOf('Trident') > -1) return 'Internet Explorer';
    return 'Unknown';
  }

  // Track pageview
  function trackPageview() {
    const data = {
      event_type: 'pageview',
      page_url: window.location.href,
      page_title: document.title,
      referrer: document.referrer || '',
      ...getUTMParameters(),
      session_id: getOrCreateSessionId(),
      user_id: getOrCreateUserId(),
      visit_count: getVisitCount(),
      is_new_visitor: isNewVisitor() ? 1 : 0,
      device_type: getDeviceType(),
      os: getOS(),
      browser: getBrowser(),
      screen_resolution: getScreenResolution(),
      user_agent: navigator.userAgent,
      timestamp: new Date().toISOString()
    };

    // Send tracking data
    sendTrackingData(data);

    // Start time tracking
    startTimeTracking();
  }

  // Send tracking data to server
  function sendTrackingData(data) {
    if (navigator.sendBeacon) {
      // Use sendBeacon for reliability
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      navigator.sendBeacon(config.apiEndpoint, blob);
    } else {
      // Fallback to fetch
      fetch(config.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        keepalive: true
      }).catch(err => console.error('Tracking error:', err));
    }
  }

  // Track time on page
  let pageStartTime = Date.now();
  let isPageVisible = true;

  function startTimeTracking() {
    pageStartTime = Date.now();

    // Track visibility changes
    document.addEventListener('visibilitychange', function() {
      isPageVisible = !document.hidden;
    });

    // Send time on page before leaving
    window.addEventListener('beforeunload', function() {
      if (isPageVisible) {
        const timeOnPage = Math.floor((Date.now() - pageStartTime) / 1000);
        sendTrackingData({
          event_type: 'page_exit',
          page_url: window.location.href,
          time_on_page: timeOnPage,
          session_id: getOrCreateSessionId(),
          user_id: getOrCreateUserId()
        });
      }
    });
  }

  // Initialize tracking on page load
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    trackPageview();
  } else {
    document.addEventListener('DOMContentLoaded', trackPageview);
  }

  // Expose track function for manual tracking
  window.CosMosTracker = {
    track: function(eventType, eventData) {
      const data = {
        event_type: eventType,
        ...eventData,
        session_id: getOrCreateSessionId(),
        user_id: getOrCreateUserId(),
        timestamp: new Date().toISOString()
      };
      sendTrackingData(data);
    },
    trackConversion: function(conversionData) {
      this.track('conversion', conversionData);
    }
  };

})();

