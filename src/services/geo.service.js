const axios = require('axios');
const env = require('../config/env');
const logger = require('../utils/logger');

function isPrivateOrInvalid(ip) {
  if (!ip) return true;
  return ip === '127.0.0.1' || ip === '::1' || ip === 'N/A';
}

// Mirrors go/index.php's proxy/VPN check: ip-api.com, fields=proxy,status,message.
// Returns true only when the lookup explicitly says status=success AND proxy=true;
// any failure/timeout fails OPEN (does not block the click), same as legacy.
async function isProxyOrVpn(ip) {
  if (isPrivateOrInvalid(ip)) return false;
  try {
    const { data } = await axios.get(`${env.geo.ipApiUrl}/${ip}`, {
      params: { fields: 'proxy,status,message' },
      timeout: 5000,
    });
    return data.status === 'success' && data.proxy === true;
  } catch (err) {
    logger.warn('Proxy/VPN lookup failed, allowing click through', { ip, message: err.message });
    return false;
  }
}

// Mirrors the legacy app's postback.php getIpLocation(): ip-api.com with city/region/country/isp.
async function getIpLocation(ip) {
  if (isPrivateOrInvalid(ip)) return 'Local/Invalid IP';
  try {
    const { data } = await axios.get(`${env.geo.ipApiUrl}/${ip}`, {
      params: {
        fields: 'status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query',
      },
      timeout: 3000,
    });
    if (data.status !== 'success') return 'Location unavailable';
    const parts = [data.city, data.regionName, data.country].filter(Boolean);
    let str = parts.join(', ');
    if (data.isp) str += ` | ${data.isp}`;
    return str || 'Location unavailable';
  } catch (err) {
    logger.warn('IP location lookup failed', { ip, message: err.message });
    return 'Location lookup failed';
  }
}

// Mirrors go/index.php's getLocationFromIP(): ipapi.co then ipinfo.io fallback.
async function getLocationFromIp(ip) {
  if (isPrivateOrInvalid(ip)) return 'Unknown';
  try {
    const { data } = await axios.get(`${env.geo.ipapiCoUrl}/${ip}/json/`, { timeout: 4000 });
    if (data.city && data.region && data.country_name) {
      return `${data.city}, ${data.region}, ${data.country_name}`;
    }
  } catch (err) {
    logger.debug('ipapi.co lookup failed, trying ipinfo.io', { ip, message: err.message });
  }
  try {
    const { data } = await axios.get(`${env.geo.ipinfoUrl}/${ip}/json`, { timeout: 4000 });
    if (data.city && data.region && data.country) {
      return `${data.city}, ${data.region}, ${data.country}`;
    }
  } catch (err) {
    logger.warn('ipinfo.io lookup failed', { ip, message: err.message });
  }
  return 'Location unavailable';
}

// Mirrors publisher/reports.php's getIpInfo(): plain ipinfo.io lookup for
// city/region/org, used to enrich exported report rows. Legacy special-
// cased loopback as "Localhost"; kept for parity.
async function getReportIpInfo(ip) {
  if (ip === '127.0.0.1' || ip === '::1') {
    return { city: 'Localhost', region: 'Local', country: 'Local', org: 'Local Network' };
  }
  try {
    const { data } = await axios.get(`${env.geo.ipinfoUrl}/${ip}/json`, { timeout: 5000 });
    return data;
  } catch (err) {
    logger.warn('Report IP info lookup failed', { ip, message: err.message });
    return { city: 'Unknown', region: 'Unknown', country: 'Unknown', org: 'Unknown' };
  }
}

module.exports = { isProxyOrVpn, getIpLocation, getLocationFromIp, getReportIpInfo };
