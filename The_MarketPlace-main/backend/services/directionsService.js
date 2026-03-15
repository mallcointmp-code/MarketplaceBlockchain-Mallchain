const axios = require('axios');
const polyline = require('polyline');
const redis = require('../config/redis.js');
const crypto = require('crypto');

const MAPS_KEY = process.env.GOOGLE_MAPS_API_KEY || '';
const CACHE_TTL = Number(process.env.POLYLINE_CACHE_TTL || 24 * 3600);

// Generate a cache key for a route
function cacheKey(pickupLat, pickupLng, dropoffLat, dropoffLng) {
  const keyString = `${Number(pickupLat).toFixed(6)}|${Number(pickupLng).toFixed(6)}|${Number(dropoffLat).toFixed(6)}|${Number(dropoffLng).toFixed(6)}`;
  const hash = crypto.createHash('sha1').update(keyString).digest('hex');
  return `polyline:${hash}`;
}

// Call Google Directions API
async function callDirectionsApi(pickupLat, pickupLng, dropoffLat, dropoffLng) {
  if (!MAPS_KEY) return null;
  try {
    const origin = `${pickupLat},${pickupLng}`;
    const destination = `${dropoffLat},${dropoffLng}`;
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&mode=driving&key=${MAPS_KEY}`;
    const resp = await axios.get(url, { timeout: 15000 });
    if (!resp.data || resp.data.status !== 'OK') {
      console.warn('[directionsService] Directions API status:', resp.data?.status, resp.data?.error_message);
      return null;
    }
    const route = resp.data.routes[0];
    const encoded = route?.overview_polyline?.points || null;
    const decoded = encoded ? polyline.decode(encoded).map(p => ({ lat: p[0], lng: p[1] })) : [];
    const leg = route?.legs?.[0] || {};
    const durationSec = leg.duration?.value || null;
    const distanceMeters = leg.distance?.value || null;
    return { encoded, decoded, durationSec, distanceMeters };
  } catch (err) {
    console.error('[directionsService] callDirectionsApi error:', err?.message || err);
    return null;
  }
}

// Fetch route polyline with Redis caching
async function fetchRoutePolylineWithCache(pickupLat, pickupLng, dropoffLat, dropoffLng) {
  if (![pickupLat, pickupLng, dropoffLat, dropoffLng].every(v => v !== undefined && v !== null && !Number.isNaN(Number(v)))) return null;
  const key = cacheKey(pickupLat, pickupLng, dropoffLat, dropoffLng);

  // Try reading from cache
  if (redis) {
    try {
      const cached = await redis.get(key);
      if (cached) {
        const parsed = JSON.parse(cached);
        await redis.expire(key, CACHE_TTL);
        return parsed;
      }
    } catch (err) {
      console.warn('[directionsService] redis read error, continuing:', err?.message || err);
    }
  }

  // Fetch from API
  const routeInfo = await callDirectionsApi(pickupLat, pickupLng, dropoffLat, dropoffLng);
  if (!routeInfo) return null;

  // Save to cache
  if (redis) {
    try {
      await redis.set(key, JSON.stringify(routeInfo), 'EX', CACHE_TTL);
    } catch (err) {
      console.warn('[directionsService] redis write error (non-fatal):', err?.message || err);
    }
  }

  return routeInfo;
}

// CommonJS exports
module.exports = {
  fetchRoutePolylineWithCache,
  axios,
  polyline,
  redis,
  crypto,
  MAPS_KEY,
  CACHE_TTL,
};
