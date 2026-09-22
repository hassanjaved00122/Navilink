export interface UserLocation {
  userId: string;
  latitude: number;
  longitude: number;
  accuracy: number; // meters
  speed: number; // km/h
  altitude?: number; // meters
  heading?: number; // degrees
  lastUpdatedTimestamp: number;
  currentFloor?: number;
  indoorZone?: string;
}

export interface UserProfile {
  userId: string;
  phoneNumber: string;
  uniqueAppId: string; // e.g. @alex_runner
  name: string;
  avatarUrl: string;
  appLocationStatus: boolean; // In-app Master Toggle (disables tracking without OS setting change)
  ghostMode: boolean; // User invisible to friends while still viewing active friends
  friendList: string[]; // List of mutual friend userIds
  pendingIncomingRequests: string[]; // User IDs who sent requests
  pendingOutgoingRequests: string[]; // User IDs this user sent requests to
  batteryLevel: number; // 0 - 100
  isCharging: boolean;
  isOnline: boolean;
  createdAt: string;
}

export type PrivacyShieldReason = 
  | 'allowed' 
  | 'location_toggle_off' 
  | 'ghost_mode_active' 
  | 'not_mutual_friends' 
  | 'blocked';

export interface ShieldedFriendLocation {
  userId: string;
  user: UserProfile;
  isShielded: boolean;
  shieldReason: PrivacyShieldReason;
  location?: UserLocation;
  encryptedCoordinates?: string;
  distanceMeters?: number;
  distanceKm?: number;
  formattedDistance?: string;
  bearing?: number;
  bearingDirection?: string;
  etaWalkingMinutes?: number;
  etaDrivingMinutes?: number;
}

export interface SocketLogEntry {
  id: string;
  timestamp: number;
  event: 'update-location' | 'friend-location-changed' | 'toggle-app-location' | 'privacy-blocked' | 'connection';
  direction: 'INCOMING' | 'OUTGOING' | 'BLOCKED';
  senderId: string;
  targetId?: string;
  payload: string;
  privacyShieldCheck: {
    isMutual: boolean;
    isLocationOn: boolean;
    isGhostMode: boolean;
    verdict: 'BROADCAST_ALLOWED' | 'LOCATION_HIDDEN_BY_USER' | 'GHOST_SHIELD_ACTIVE';
  };
}
