/**
 * Haversine Formula Utility
 * Calculates the great-circle distance between two points on a sphere given their longitudes and latitudes.
 */

export interface DistanceResult {
  meters: number;
  kilometers: number;
  formatted: string;
}

export interface BearingResult {
  degrees: number;
  cardinal: string;
}

export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): DistanceResult {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const meters = Math.round(R * c);
  const kilometers = Number((meters / 1000).toFixed(2));

  let formatted = '';
  if (meters < 1000) {
    formatted = `${meters} meters away`;
  } else {
    formatted = `${kilometers} km away`;
  }

  return { meters, kilometers, formatted };
}

export function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): BearingResult {
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

  let degrees = (Math.atan2(y, x) * 180) / Math.PI;
  degrees = (degrees + 360) % 360; // Normalize to 0-360

  const cardinals = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(degrees / 45) % 8;

  return {
    degrees: Math.round(degrees),
    cardinal: cardinals[index],
  };
}

export function calculateETA(distanceMeters: number): { walkingMinutes: number; drivingMinutes: number } {
  // Walking speed approx 5 km/h = 83.3 m/min
  const walkingMinutes = Math.max(1, Math.round(distanceMeters / 83.33));
  // Driving average speed in city approx 30 km/h = 500 m/min + 2 min overhead
  const drivingMinutes = Math.max(1, Math.round(distanceMeters / 500) + 1);

  return { walkingMinutes, drivingMinutes };
}
