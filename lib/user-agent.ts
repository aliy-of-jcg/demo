const UAParser = require('ua-parser-js');

export interface ParsedUserAgent {
  // Device info
  deviceType: string;      // Mobile, Tablet, Desktop
  deviceVendor: string;    // Apple, Samsung, Google, etc.
  deviceModel: string;     // iPhone 14 Pro, Galaxy S23, etc.
  
  // Browser info
  browser: string;         // Chrome, Safari, Firefox
  browserVersion: string;  // 120.0.0
  
  // OS info
  os: string;             // iOS, Android, Windows, macOS
  osVersion: string;      // 17.2, 14.0, 11, 13.6
  
  // Engine
  engine: string;         // Blink, WebKit, Gecko
  
  // Platform detection
  isBot: boolean;
  isMobileApp: boolean;   // Telegram, Kakao, Line apps
  appName?: string;       // "Telegram", "KakaoTalk", etc.
}

export function parseUserAgent(userAgent: string): ParsedUserAgent {
  const parser = UAParser(userAgent);
  const result = parser;
  
  // Determine device type with better accuracy
  let deviceType = 'Desktop';
  if (result.device.type === 'mobile') deviceType = 'Mobile';
  else if (result.device.type === 'tablet') deviceType = 'Tablet';
  else if (result.device.type === 'wearable') deviceType = 'Wearable';
  else if (result.device.type === 'smarttv') deviceType = 'Smart TV';
  else if (result.device.type === 'console') deviceType = 'Console';
  
  // Detect mobile apps (Telegram, Kakao, Line, etc.)
  const ua = userAgent.toLowerCase();
  let isMobileApp = false;
  let appName: string | undefined;
  
  if (ua.includes('telegram')) {
    isMobileApp = true;
    appName = 'Telegram';
  } else if (ua.includes('kakaotalk')) {
    isMobileApp = true;
    appName = 'KakaoTalk';
  } else if (ua.includes('line/')) {
    isMobileApp = true;
    appName = 'LINE';
  } else if (ua.includes('whatsapp')) {
    isMobileApp = true;
    appName = 'WhatsApp';
  } else if (ua.includes('fbav') || ua.includes('fban')) {
    isMobileApp = true;
    appName = 'Facebook';
  } else if (ua.includes('instagram')) {
    isMobileApp = true;
    appName = 'Instagram';
  } else if (ua.includes('twitter')) {
    isMobileApp = true;
    appName = 'Twitter';
  } else if (ua.includes('wechat')) {
    isMobileApp = true;
    appName = 'WeChat';
  }
  
  // Detect bots
  const isBot = !!(result.device.type === undefined && 
    (ua.includes('bot') || ua.includes('crawler') || ua.includes('spider') || 
     ua.includes('slurp') || ua.includes('googlebot')));
  
  return {
    deviceType,
    deviceVendor: result.device.vendor || 'Unknown',
    deviceModel: result.device.model || 'Unknown',
    
    browser: result.browser.name || 'Unknown',
    browserVersion: result.browser.version || 'Unknown',
    
    os: result.os.name || 'Unknown',
    osVersion: result.os.version || 'Unknown',
    
    engine: result.engine.name || 'Unknown',
    
    isBot,
    isMobileApp,
    appName,
  };
}

