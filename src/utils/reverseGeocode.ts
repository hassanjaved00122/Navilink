/**
 * Reverse Geocode Utility
 * Converts exact physical GPS coordinates (latitude, longitude)
 * into real-world human-readable street / area / city names using OpenStreetMap Nominatim
 */

const addressCache = new Map<string, string>();

export async function reverseGeocodeCoords(latitude: number, longitude: number): Promise<string> {
  const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
  if (addressCache.has(cacheKey)) {
    return addressCache.get(cacheKey)!;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept-Language': 'en,ur',
      },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.address) {
        const addr = data.address;
        const street =
          addr.road ||
          addr.suburb ||
          addr.neighbourhood ||
          addr.residential ||
          addr.quarter ||
          addr.hamlet;
        const city =
          addr.city ||
          addr.town ||
          addr.village ||
          addr.county ||
          addr.state_district ||
          addr.state;

        let result = '';
        if (street && city) {
          result = `${street}, ${city}`;
        } else if (street) {
          result = street;
        } else if (city) {
          result = city;
        } else if (data.display_name) {
          result = data.display_name.split(',').slice(0, 2).join(',').trim();
        }

        if (result) {
          addressCache.set(cacheKey, result);
          return result;
        }
      }
    }
  } catch (err) {
    // Fail silently to coordinate string
  }

  const fallback = `${latitude.toFixed(5)}°, ${longitude.toFixed(5)}°`;
  return fallback;
}
