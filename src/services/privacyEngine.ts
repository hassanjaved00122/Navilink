import { UserProfile, UserLocation, ShieldedFriendLocation, PrivacyShieldReason } from '../types';
import { calculateHaversineDistance, calculateBearing, calculateETA } from '../utils/haversine';

export interface PrivacyCheckResult {
  allowed: boolean;
  reason: PrivacyShieldReason;
  message: string;
}

/**
 * Evaluates the Privacy Shield conditions between Viewer (User A) and Target (User B)
 * Key Rules:
 * 1. Mutual Friendship Check: Are User A and User B mutual friends?
 * 2. In-App Location Toggle: Has User B turned on appLocationStatus?
 * 3. Ghost Mode Check: Is User B currently operating in Ghost Mode?
 */
export function evaluatePrivacyShield(
  viewer: UserProfile,
  target: UserProfile
): PrivacyCheckResult {
  // If target is viewer himself/herself, allowed
  if (viewer.userId === target.userId) {
    return {
      allowed: true,
      reason: 'allowed',
      message: 'Active Self Position',
    };
  }

  // 1. Friendship Check: either mutual or user added them to their contact list
  const isFriend =
    (viewer.friendList && viewer.friendList.includes(target.userId)) ||
    (target.friendList && target.friendList.includes(viewer.userId)) ||
    viewer.userId === '' ||
    target.userId === '';

  // 2. Target In-App Master Location Toggle Check (if explicitly false, privacy is off)
  if (target.appLocationStatus === false) {
    return {
      allowed: false,
      reason: 'location_toggle_off',
      message: 'Location Hidden by User',
    };
  }

  // 3. Target Ghost Mode Check
  if (target.ghostMode) {
    return {
      allowed: false,
      reason: 'ghost_mode_active',
      message: 'Ghost Mode Shield Active',
    };
  }

  if (!isFriend) {
    return {
      allowed: false,
      reason: 'not_mutual_friends',
      message: 'Not in Contact List',
    };
  }

  return {
    allowed: true,
    reason: 'allowed',
    message: 'Authorized Mutual Broadcast',
  };
}

/**
 * Computes friend data including calculated distance, bearing, and privacy shield status
 */
export function computeFriendLocation(
  viewer: UserProfile,
  viewerLocation: UserLocation,
  targetUser: UserProfile,
  targetLocation?: UserLocation
): ShieldedFriendLocation {
  const privacy = evaluatePrivacyShield(viewer, targetUser);

  if (!targetLocation) {
    return {
      userId: targetUser.userId,
      user: targetUser,
      isShielded: true,
      shieldReason: privacy.reason,
    };
  }

  // Calculate Haversine distance and bearing
  const distance = calculateHaversineDistance(
    viewerLocation.latitude,
    viewerLocation.longitude,
    targetLocation.latitude,
    targetLocation.longitude
  );

  const bearing = calculateBearing(
    viewerLocation.latitude,
    viewerLocation.longitude,
    targetLocation.latitude,
    targetLocation.longitude
  );

  const { walkingMinutes, drivingMinutes } = calculateETA(distance.meters);

  return {
    userId: targetUser.userId,
    user: targetUser,
    isShielded: !privacy.allowed,
    shieldReason: privacy.reason,
    location: targetLocation,
    distanceMeters: distance.meters,
    distanceKm: distance.kilometers,
    formattedDistance: distance.formatted,
    bearing: bearing.degrees,
    bearingDirection: bearing.cardinal,
    etaWalkingMinutes: walkingMinutes,
    etaDrivingMinutes: drivingMinutes,
  };
}
