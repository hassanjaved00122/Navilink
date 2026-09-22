// Google Directions & Routing Service using Google Maps Platform Directions API
// Grounded with official Google Maps Platform API key

export interface DirectionStep {
  instruction: string;
  distance: string;
  duration: string;
  maneuver?: string;
  startLocation: [number, number];
  endLocation: [number, number];
}

export interface GoogleRouteResult {
  coordinates: [number, number][];
  distanceMeters: number;
  durationSeconds: number;
  distanceText: string;
  durationText: string;
  summary: string;
  startAddress: string;
  endAddress: string;
  steps: DirectionStep[];
  source: 'google' | 'osrm' | 'fallback';
}

/**
 * Decodes Google Encoded Polyline Algorithm Format (standard Google Maps format)
 */
export function decodeGooglePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push([lat / 1e5, lng / 1e5]);
  }

  return points;
}

/**
 * Strip HTML tags from Google Maps instructions (e.g. <b>Market St</b> -> Market St)
 */
export function cleanInstructionHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<div[^>]*>.*?<\/div>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Fetches real driving or walking directions using Google Maps Platform Directions API,
 * with resilient fallback to high-precision OSRM.
 */
export async function fetchGoogleDirections(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  mode: 'walking' | 'driving',
  signal?: AbortSignal
): Promise<GoogleRouteResult | null> {
  const apiKey =
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
    'AIzaSyD_kCk1LLmsWM8Bm77vesqOsaj34__rTh8';

  // 1. Try Google Maps Platform Directions API
  if (apiKey) {
    try {
      const googleMode = mode === 'driving' ? 'driving' : 'walking';
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${startLat},${startLng}&destination=${endLat},${endLng}&mode=${googleMode}&key=${apiKey}`;

      const res = await fetch(url, { signal });
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'OK' && data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const leg = route.legs?.[0];

          let coords: [number, number][] = [];
          if (route.overview_polyline?.points) {
            coords = decodeGooglePolyline(route.overview_polyline.points);
          }

          // If overview_polyline was empty, build from steps
          if (coords.length === 0 && leg?.steps) {
            for (const step of leg.steps) {
              if (step.polyline?.points) {
                coords.push(...decodeGooglePolyline(step.polyline.points));
              }
            }
          }

          const steps: DirectionStep[] = (leg?.steps || []).map((s: any) => ({
            instruction: cleanInstructionHtml(s.html_instructions || ''),
            distance: s.distance?.text || '',
            duration: s.duration?.text || '',
            maneuver: s.maneuver,
            startLocation: [s.start_location?.lat || 0, s.start_location?.lng || 0],
            endLocation: [s.end_location?.lat || 0, s.end_location?.lng || 0],
          }));

          if (coords.length > 0) {
            return {
              coordinates: coords,
              distanceMeters: leg?.distance?.value || 0,
              durationSeconds: leg?.duration?.value || 0,
              distanceText: leg?.distance?.text || '',
              durationText: leg?.duration?.text || '',
              summary: route.summary || (mode === 'driving' ? 'Driving Route' : 'Walking Route'),
              startAddress: leg?.start_address || '',
              endAddress: leg?.end_address || '',
              steps,
              source: 'google',
            };
          }
        }
      }
    } catch {
      // If browser CORS or network error blocks direct client call, proceed to OSRM
    }
  }

  // 2. High Precision OSRM Fallback
  try {
    const osrmUrls =
      mode === 'walking'
        ? [
            `https://routing.openstreetmap.de/routed-foot/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson&steps=true`,
            `https://routing.openstreetmap.de/routed-bike/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson&steps=true`,
            `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson&steps=true`,
          ]
        : [
            `https://routing.openstreetmap.de/routed-car/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson&steps=true`,
            `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson&steps=true`,
            `https://routing.openstreetmap.de/routed-foot/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson&steps=true`,
          ];

    for (const url of osrmUrls) {
      try {
        const res = await fetch(url, { signal });
        if (!res.ok) continue;
        const data = await res.json();
        if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const leg = route.legs?.[0];
          const coords: [number, number][] = route.geometry.coordinates.map(
            ([lng, lat]: [number, number]) => [lat, lng] as [number, number]
          );

          const steps: DirectionStep[] = (leg?.steps || []).map((s: any) => ({
            instruction: s.maneuver?.modifier
              ? `${s.maneuver.type} ${s.maneuver.modifier} onto ${s.name || 'road'}`
              : s.name
              ? `Continue on ${s.name}`
              : 'Continue straight',
            distance: s.distance >= 1000 ? `${(s.distance / 1000).toFixed(1)} km` : `${Math.round(s.distance)} m`,
            duration: `${Math.max(1, Math.round(s.duration / 60))} min`,
            maneuver: s.maneuver?.type,
            startLocation: [s.maneuver?.location?.[1] || 0, s.maneuver?.location?.[0] || 0],
            endLocation: [coords[coords.length - 1][0], coords[coords.length - 1][1]],
          }));

          const distM = Math.round(route.distance);
          const durS = Math.round(route.duration);
          return {
            coordinates: coords,
            distanceMeters: distM,
            durationSeconds: durS,
            distanceText: distM >= 1000 ? `${(distM / 1000).toFixed(1)} km` : `${distM} m`,
            durationText: `${Math.max(1, Math.round(durS / 60))} min`,
            summary: leg?.summary || (mode === 'driving' ? 'Fastest Drive' : 'Direct Walk'),
            startAddress: 'Your Current Location',
            endAddress: 'Friend Location',
            steps,
            source: 'osrm',
          };
        }
      } catch {
        // try next OSRM mirror
      }
    }
  } catch {
    // fall through
  }

  return null;
}
