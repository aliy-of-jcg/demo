import queryString from 'query-string';

export interface ParsedURL {
  // Full URL components
  protocol: string;       // https:
  host: string;          // example.com
  hostname: string;      // example.com
  port: string;          // 443, 80
  pathname: string;      // /landing/page
  search: string;        // ?utm_source=telegram
  hash: string;          // #section1
  
  // Parsed query parameters
  params: Record<string, any>;
  
  // UTM parameters (if present)
  utm: {
    source?: string;
    medium?: string;
    campaign?: string;
    content?: string;
    term?: string;
  };
  
  // Domain breakdown
  subdomain?: string;    // www, app, api
  domain: string;        // example
  tld: string;           // com, co.kr, org
  
  // Analytics
  pathSegments: string[]; // ['landing', 'page']
  queryCount: number;     // Number of query parameters
}

export function parseURL(url: string): ParsedURL {
  const urlObj = new URL(url);
  
  // Parse query parameters with advanced parsing
  const params = queryString.parse(urlObj.search, {
    arrayFormat: 'bracket', // ?tags[]=a&tags[]=b
    parseBooleans: true,    // ?enabled=true -> boolean
    parseNumbers: true,     // ?page=1 -> number
  });
  
  // Extract UTM parameters
  const utm = {
    source: params.utm_source as string | undefined,
    medium: params.utm_medium as string | undefined,
    campaign: params.utm_campaign as string | undefined,
    content: params.utm_content as string | undefined,
    term: params.utm_term as string | undefined,
  };
  
  // Parse domain components
  const hostParts = urlObj.hostname.split('.');
  let subdomain: string | undefined;
  let domain: string;
  let tld: string;
  
  if (hostParts.length > 2) {
    subdomain = hostParts.slice(0, -2).join('.');
    domain = hostParts[hostParts.length - 2];
    tld = hostParts[hostParts.length - 1];
  } else if (hostParts.length === 2) {
    domain = hostParts[0];
    tld = hostParts[1];
  } else {
    domain = hostParts[0] || 'Unknown';
    tld = '';
  }
  
  // Parse path segments
  const pathSegments = urlObj.pathname
    .split('/')
    .filter(segment => segment.length > 0);
  
  return {
    protocol: urlObj.protocol,
    host: urlObj.host,
    hostname: urlObj.hostname,
    port: urlObj.port,
    pathname: urlObj.pathname,
    search: urlObj.search,
    hash: urlObj.hash,
    
    params,
    utm,
    
    subdomain,
    domain,
    tld,
    
    pathSegments,
    queryCount: Object.keys(params).length,
  };
}

export interface ParsedReferrer {
  source: string;        // Platform name or hostname
  domain: string;        // Full domain
  isKnownPlatform: boolean;
  path?: string;
  params?: Record<string, any>;
}

export function parseReferrer(referrer: string): ParsedReferrer {
  if (!referrer) {
    return {
      source: 'Direct',
      domain: 'Direct',
      isKnownPlatform: false,
    };
  }
  
  try {
    const parsed = parseURL(referrer);
    
    // Detect known platforms
    const knownPlatforms: Record<string, string> = {
      'google.com': 'Google',
      'google.co.kr': 'Google',
      'google.co.jp': 'Google',
      'naver.com': 'Naver',
      'daum.net': 'Daum',
      'facebook.com': 'Facebook',
      'instagram.com': 'Instagram',
      't.me': 'Telegram',
      'telegram.org': 'Telegram',
      'telegram.me': 'Telegram',
      'kakao.com': 'Kakao',
      'twitter.com': 'Twitter',
      'x.com': 'X (Twitter)',
      'linkedin.com': 'LinkedIn',
      'youtube.com': 'YouTube',
      'tiktok.com': 'TikTok',
      'reddit.com': 'Reddit',
      'pinterest.com': 'Pinterest',
    };
    
    const fullDomain = `${parsed.domain}.${parsed.tld}`;
    const platformName = knownPlatforms[fullDomain];
    
    return {
      source: platformName || parsed.hostname,
      domain: parsed.hostname,
      isKnownPlatform: !!platformName,
      path: parsed.pathname,
      params: parsed.params,
    };
  } catch {
    return {
      source: 'Unknown',
      domain: 'Unknown',
      isKnownPlatform: false,
    };
  }
}

export interface GeoLocation {
  country: string;
  city: string;
  region?: string;
  timezone?: string;
  ll?: [number, number]; // [latitude, longitude]
}

export function getGeoLocation(ip: string): GeoLocation {
  // Basic implementation - can be enhanced with geoip-lite
  try {
    const geoip = require('geoip-lite');
    const geo = geoip.lookup(ip);
    
    if (geo) {
      return {
        country: geo.country || 'Unknown',
        city: geo.city || 'Unknown',
        region: geo.region,
        timezone: geo.timezone,
        ll: geo.ll,
      };
    }
  } catch (error) {
    // geoip-lite not available or error
  }
  
  return {
    country: 'Unknown',
    city: 'Unknown',
  };
}



