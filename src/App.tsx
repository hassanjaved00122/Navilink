import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  UserProfile,
  UserLocation,
  ShieldedFriendLocation,
  SocketLogEntry,
} from './types';
import { INITIAL_USERS, INITIAL_LOCATIONS, BASE_ANCHOR } from './data/mockDatabase';
import { computeFriendLocation } from './services/privacyEngine';
import { encryptCoordinates } from './utils/crypto';
import { LiveMapView } from './components/Map/LiveMapView';
import { ControlCenterTab } from './components/Navigation/ControlCenterTab';
import { SearchView } from './components/Friends/SearchView';
import { PrivacySettingsView } from './components/Privacy/PrivacySettingsView';
import { GoogleMapsLiveViewAR } from './components/Navigation/GoogleMapsLiveViewAR';
import { SocketInspectorModal } from './components/Network/SocketInspectorModal';
import { CodeGuideView } from './components/CodeInspector/CodeGuideView';
import { TestGuideModal } from './components/Test/TestGuideModal';
import { AddFriendModal } from './components/Friends/AddFriendModal';
import { EditProfileModal } from './components/Friends/EditProfileModal';
import { FirstTimeLoginScreen } from './components/Auth/FirstTimeLoginScreen';
import { WelcomeScreen } from './components/Auth/WelcomeScreen';
import { FriendsBottomSheet } from './components/Dashboard/FriendsBottomSheet';
import { PWAInstallBanner } from './components/PWA/PWAInstallBanner';
import { PWAUpdateToast } from './components/PWA/PWAUpdateToast';
import { NaviLinkLogo } from './components/Common/NaviLinkLogo';
import { NaviLink3DArrow } from './components/Common/NaviLink3DArrow';
import {
  auth,
  fetchUserProfileOnce,
  syncLocationToFirebase,
  syncPrivacyToFirebase,
  subscribeToAllUsersLocations,
  addMutualContactDirectlyInFirebase,
  logoutUserAccount,
  sendFriendRequestInFirebase,
  acceptFriendRequestInFirebase,
  rejectFriendRequestInFirebase,
} from './services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { reverseGeocodeCoords } from './utils/reverseGeocode';
import {
  Shield,
  MapPin,
  Users,
  Lock,
  Code,
  Compass,
  Battery,
  BatteryCharging,
  Radio,
  Terminal,
  Ghost,
  EyeOff,
  CheckCircle2,
  Sliders,
  Navigation2,
  Radar,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  UserPlus,
  Signal,
  Check,
  CheckCheck,
  Plus,
  SlidersHorizontal,
  Navigation,
  Trash2,
  LogOut,
  X,
  Crosshair,
  RefreshCw,
  Copy,
} from 'lucide-react';

interface CachedGps {
  latitude: number;
  longitude: number;
  accuracy: number;
  heading?: number;
  speed?: number;
  address?: string;
  timestamp: number;
}

const getCachedRealGps = (): CachedGps | null => {
  try {
    const raw = localStorage.getItem('navi_last_real_device_gps');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.latitude === 'number' && typeof parsed.longitude === 'number') {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to read cached GPS:', e);
  }
  return null;
};

export default function App() {
  // Application State with Persistent Storage (profile is preserved across reloads and updates)
  const [users, setUsers] = useState<UserProfile[]>(() => {
    try {
      const saved = localStorage.getItem('navi_app_users_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Filter out dummy mock users AND guarantee absolute uniqueness by userId
          const userMap = new Map<string, UserProfile>();
          for (const u of parsed) {
            if (u && u.userId && !['usr_ihtasham', 'usr_sarah', 'usr_ali', 'usr_temp', 'usr_bob'].includes(u.userId)) {
              const cleanFriendList = Array.from(
                new Set((u.friendList || []).filter((id: string) => !['usr_ihtasham', 'usr_sarah', 'usr_ali', 'usr_temp', 'usr_bob'].includes(id)))
              );
              const cleanIncoming = Array.from(new Set(u.pendingIncomingRequests || []));
              const cleanOutgoing = Array.from(new Set(u.pendingOutgoingRequests || []));
              userMap.set(u.userId, {
                ...u,
                friendList: cleanFriendList,
                pendingIncomingRequests: cleanIncoming,
                pendingOutgoingRequests: cleanOutgoing,
              });
            }
          }
          return Array.from(userMap.values());
        }
      }
    } catch (e) {
      console.warn('Failed to load users from storage:', e);
    }
    return INITIAL_USERS;
  });

  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    try {
      const savedId = localStorage.getItem('navi_app_current_user_id');
      if (savedId) return savedId;
    } catch (e) {
      console.warn('Failed to load current user ID from storage:', e);
    }
    return '';
  });

  const [locations, setLocations] = useState<Record<string, UserLocation>>(() => {
    try {
      const cachedGps = getCachedRealGps();
      const savedLocs = localStorage.getItem('navi_app_locations_v2');
      let base: Record<string, UserLocation> = { ...INITIAL_LOCATIONS };
      if (savedLocs) {
        const parsed = JSON.parse(savedLocs);
        base = { ...base, ...parsed };
      }
      if (cachedGps) {
        base['default'] = {
          userId: 'usr_me',
          latitude: cachedGps.latitude,
          longitude: cachedGps.longitude,
          accuracy: cachedGps.accuracy || 4,
          heading: cachedGps.heading || 0,
          speed: cachedGps.speed || 0,
          lastUpdatedTimestamp: cachedGps.timestamp || Date.now(),
        };
      }
      return base;
    } catch (e) {
      console.warn('Failed to load locations from storage:', e);
    }
    return INITIAL_LOCATIONS;
  });

  const [deviceLiveGps, setDeviceLiveGps] = useState<UserLocation | null>(() => {
    const cached = getCachedRealGps();
    if (cached) {
      return {
        userId: 'usr_me',
        latitude: cached.latitude,
        longitude: cached.longitude,
        accuracy: cached.accuracy || 4,
        heading: cached.heading || 0,
        speed: cached.speed || 0,
        lastUpdatedTimestamp: cached.timestamp || Date.now(),
      };
    }
    return null;
  });
  const [hasRealGpsFix, setHasRealGpsFix] = useState<boolean>(() => !!getCachedRealGps());

  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [routeMode, setRouteMode] = useState<'walking' | 'driving'>('walking');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [chatFilter, setChatFilter] = useState<'all' | 'active' | 'favourites'>('all');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [isE2EEEnabled, setIsE2EEEnabled] = useState<boolean>(true);
  const [arTargetFriendId, setArTargetFriendId] = useState<string | null>(null);
  const [isSocketLogsOpen, setIsSocketLogsOpen] = useState<boolean>(false);
  const [isTestGuideOpen, setIsTestGuideOpen] = useState<boolean>(false);
  const [isAddFriendModalOpen, setIsAddFriendModalOpen] = useState<boolean>(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState<boolean>(false);
  const [socketLogs, setSocketLogs] = useState<SocketLogEntry[]>([]);
  const [isLiveGPSActive, setIsLiveGPSActive] = useState<boolean>(true);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isLocatingSystem, setIsLocatingSystem] = useState<boolean>(false);
  const [currentAddress, setCurrentAddress] = useState<string>(() => {
    const cached = getCachedRealGps();
    return cached?.address || 'Locating exact device position...';
  });
  const lastFirebaseSyncRef = useRef<{ lat: number; lng: number; time: number } | null>(null);

  // Broadcast device live GPS to Firebase with intelligent throttling (~2m or 3s)
  const broadcastLiveGpsToFirebase = useCallback((userId: string, loc: UserLocation) => {
    if (!userId) return;
    const now = Date.now();
    const last = lastFirebaseSyncRef.current;
    const moved = last ? Math.hypot(loc.latitude - last.lat, loc.longitude - last.lng) : 999;
    if (!last || moved > 0.00002 || now - last.time > 3000) {
      lastFirebaseSyncRef.current = { lat: loc.latitude, lng: loc.longitude, time: now };
      syncLocationToFirebase(userId, loc);
    }
  }, []);

  // Automatically start in dashboard if a profile already exists
  const [appStage, setAppStage] = useState<'intro' | 'auth' | 'dashboard'>(() => {
    try {
      const savedId = localStorage.getItem('navi_app_current_user_id');
      const savedUsers = localStorage.getItem('navi_app_users_v2');
      if (savedId && savedUsers) {
        const parsed = JSON.parse(savedUsers);
        if (Array.isArray(parsed) && parsed.some((u: UserProfile) => u.userId === savedId)) {
          return 'dashboard';
        }
      }
    } catch (e) {
      console.warn('Failed to restore app stage:', e);
    }
    return 'intro';
  });

  const [isControlCenterOpen, setIsControlCenterOpen] = useState<boolean>(false);

  // Real-Time Firebase Multi-Device GPS Synchronization (e.g. You and other devices in real time)
  useEffect(() => {
    const unsub = subscribeToAllUsersLocations(({ users: liveUsers, locations: liveLocs }) => {
      setUsers((prev) => {
        const userMap = new Map<string, UserProfile>();
        // Add previous valid users
        prev.forEach((u) => {
          if (u && u.userId) userMap.set(u.userId, u);
        });
        // Merge live users
        liveUsers.forEach((u) => {
          if (u && u.userId) {
            const existing = userMap.get(u.userId);
            userMap.set(u.userId, existing ? { ...existing, ...u } : u);
          }
        });
        return Array.from(userMap.values());
      });

      setLocations((prev) => {
        const next = { ...prev };
        Object.entries(liveLocs).forEach(([uid, remoteLoc]) => {
          if (uid === currentUserId && prev[uid] && prev[uid].lastUpdatedTimestamp >= remoteLoc.lastUpdatedTimestamp) {
            return;
          }
          next[uid] = remoteLoc;
        });
        return next;
      });
    });

    return () => unsub();
  }, [currentUserId]);

  // Sync users to localStorage so created profile is never lost
  useEffect(() => {
    try {
      localStorage.setItem('navi_app_users_v2', JSON.stringify(users));
    } catch (e) {
      console.warn('Failed to sync users to storage:', e);
    }
  }, [users]);

  // Sync currentUserId to localStorage
  useEffect(() => {
    try {
      if (currentUserId) {
        localStorage.setItem('navi_app_current_user_id', currentUserId);
      } else {
        localStorage.removeItem('navi_app_current_user_id');
      }
    } catch (e) {
      console.warn('Failed to sync currentUserId to storage:', e);
    }
  }, [currentUserId]);

  // Sync locations to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('navi_app_locations_v2', JSON.stringify(locations));
    } catch (e) {
      console.warn('Failed to sync locations to storage:', e);
    }
  }, [locations]);

  // 1-Read Firebase Session Initialization on App Load / Visit
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Guaranteed exactly 1 single read from Firebase Firestore
          const profile = await fetchUserProfileOnce(
            firebaseUser.uid,
            firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'NaviLink User'
          );
          setUsers((prev) => {
            const userMap = new Map<string, UserProfile>();
            userMap.set(profile.userId, profile);
            prev.forEach((u) => {
              if (u && u.userId && u.userId !== profile.userId) {
                userMap.set(u.userId, u);
              }
            });
            return Array.from(userMap.values());
          });
          setCurrentUserId(profile.userId);
          setIsLiveGPSActive(true);
          setAppStage('dashboard');
        } catch (err) {
          console.warn('Firebase 1-read profile retrieval:', err);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Current active user & location
  const currentUser = useMemo(() => {
    return users.find((u) => u.userId === currentUserId) || null;
  }, [users, currentUserId]);

  const activeUser = currentUser || {
    userId: '',
    name: 'You',
    phoneNumber: '',
    uniqueAppId: '@user',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    appLocationStatus: true,
    ghostMode: false,
    friendList: [],
    pendingIncomingRequests: [],
    pendingOutgoingRequests: [],
    batteryLevel: 95,
    isCharging: false,
    isOnline: true,
    createdAt: '',
  };

  const currentLocation = useMemo(() => {
    if (currentUserId && locations[currentUserId]) {
      return locations[currentUserId];
    }
    if (deviceLiveGps) {
      return {
        ...deviceLiveGps,
        userId: currentUserId || 'usr_me',
      };
    }
    const cached = getCachedRealGps();
    return {
      userId: currentUserId || 'usr_temp',
      latitude: cached?.latitude ?? BASE_ANCHOR.lat,
      longitude: cached?.longitude ?? BASE_ANCHOR.lng,
      accuracy: cached?.accuracy ?? 5,
      speed: 0,
      altitude: 200,
      heading: 0,
      lastUpdatedTimestamp: Date.now(),
    };
  }, [locations, currentUserId, deviceLiveGps]);

  // Compute incoming friend requests
  const incomingRequestsList = useMemo(() => {
    if (!currentUser?.pendingIncomingRequests) return [];
    const ids = new Set(currentUser.pendingIncomingRequests);
    const seen = new Set<string>();
    const list: UserProfile[] = [];
    users.forEach((u) => {
      if (u && u.userId && ids.has(u.userId) && !seen.has(u.userId)) {
        seen.add(u.userId);
        list.push(u);
      }
    });
    return list;
  }, [users, currentUser]);

  // Compute computed friend states based on Privacy Shield
  const computedFriends: ShieldedFriendLocation[] = useMemo(() => {
    const rawIds = activeUser.friendList || [];
    const friendIds = Array.from(new Set(rawIds));

    return friendIds.map((friendId) => {
      const targetUser = users.find((u) => u.userId === friendId);
      let targetLoc = locations[friendId];
      if (!targetLoc) {
        const charCode = friendId.charCodeAt(friendId.length - 1) || 5;
        const charCode2 = friendId.charCodeAt(0) || 7;
        const latOffset = (((charCode % 5) + 1) * 0.0018) * (charCode % 2 === 0 ? 1 : -1);
        const lngOffset = (((charCode2 % 5) + 1) * 0.0018) * (charCode2 % 2 === 0 ? 1 : -1);
        targetLoc = {
          userId: friendId,
          latitude: currentLocation.latitude + (latOffset === 0 ? 0.003 : latOffset),
          longitude: currentLocation.longitude + (lngOffset === 0 ? 0.003 : lngOffset),
          accuracy: 5,
          speed: 0,
          altitude: 15,
          heading: 0,
          lastUpdatedTimestamp: Date.now(),
        };
      }
      if (!targetUser) {
        return {
          userId: friendId,
          user: {
            userId: friendId,
            name: 'Unknown',
            phoneNumber: '',
            uniqueAppId: '@unknown',
            avatarUrl: '',
            appLocationStatus: false,
            ghostMode: false,
            friendList: [],
            pendingIncomingRequests: [],
            pendingOutgoingRequests: [],
            batteryLevel: 0,
            isCharging: false,
            isOnline: false,
            createdAt: '',
          },
          isShielded: true,
          shieldReason: 'blocked',
        };
      }
      return computeFriendLocation(activeUser, currentLocation, targetUser, targetLoc);
    });
  }, [activeUser, currentLocation, users, locations, currentUserId]);

  // Add a socket log entry
  const logSocketEvent = async (
    event: SocketLogEntry['event'],
    direction: SocketLogEntry['direction'],
    payloadObj: any,
    targetUserId?: string
  ) => {
    let payloadStr = JSON.stringify(payloadObj);

    if (isE2EEEnabled && payloadObj.latitude) {
      const encrypted = await encryptCoordinates(
        payloadObj.latitude,
        payloadObj.longitude,
        payloadObj.accuracy || 5
      );
      payloadStr = `[AES-256-GCM Encrypted] iv:${encrypted.iv.slice(0, 8)}... tag:${encrypted.tag} cipher:${encrypted.ciphertext.slice(0, 32)}...`;
    }

    const isMutual = targetUserId
      ? activeUser.friendList.includes(targetUserId)
      : true;
    const isLocationOn = activeUser.appLocationStatus;
    const isGhostMode = activeUser.ghostMode;

    let verdict: SocketLogEntry['privacyShieldCheck']['verdict'] = 'BROADCAST_ALLOWED';
    if (!isLocationOn) verdict = 'LOCATION_HIDDEN_BY_USER';
    else if (isGhostMode) verdict = 'GHOST_SHIELD_ACTIVE';

    const newEntry: SocketLogEntry = {
      id: 'log_' + Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      event,
      direction: !isLocationOn || isGhostMode ? 'BLOCKED' : direction,
      senderId: activeUser.userId,
      targetId: targetUserId,
      payload: payloadStr,
      privacyShieldCheck: {
        isMutual,
        isLocationOn,
        isGhostMode,
        verdict,
      },
    };

    setSocketLogs((prev) => [newEntry, ...prev.slice(0, 30)]);
  };

  // 1. Movement Simulation Loop (only animates if simulation is active AND live device GPS is not overriding current user)
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setLocations((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((uid) => {
          // If live device GPS is active, do not simulate wander for current user
          if (isLiveGPSActive && uid === currentUserId) return;

          const loc = next[uid];
          // Small realistic random wander within Sharif Colony (~2-5 meters)
          const deltaLat = (Math.random() - 0.48) * 0.00018;
          const deltaLon = (Math.random() - 0.48) * 0.00018;
          next[uid] = {
            ...loc,
            latitude: loc.latitude + deltaLat,
            longitude: loc.longitude + deltaLon,
            heading: Math.floor(Math.random() * 360),
            speed: Number((Math.random() * 4 + 1).toFixed(1)),
            lastUpdatedTimestamp: Date.now(),
          };
        });
        return next;
      });

      // Periodic socket emit
      if (activeUser.appLocationStatus && !activeUser.ghostMode) {
        logSocketEvent('update-location', 'OUTGOING', {
          userId: activeUser.userId,
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          accuracy: currentLocation.accuracy,
        });
      }
    }, 4500);

    return () => clearInterval(interval);
  }, [isSimulating, activeUser, currentLocation, isE2EEEnabled, isLiveGPSActive, currentUserId]);

  // Request exact system physical location from device browser
  const requestSystemLocation = useCallback(() => {
    setIsLocatingSystem(true);
    setGpsError(null);

    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setIsLocatingSystem(false);
      setIsLiveGPSActive(true);
      return;
    }

    const applyPosition = (pos: GeolocationPosition) => {
      const { latitude, longitude, accuracy, heading, speed } = pos.coords;
      const roundedAcc = Math.round(accuracy) || 4;
      
      setHasRealGpsFix(true);

      // Reverse geocode live physical coordinates to street/area name
      reverseGeocodeCoords(latitude, longitude).then((addr) => {
        if (addr) {
          setCurrentAddress(addr);
          try {
            localStorage.setItem(
              'navi_last_real_device_gps',
              JSON.stringify({
                latitude,
                longitude,
                accuracy: roundedAcc,
                heading: heading ?? 0,
                speed: speed != null ? Number(speed.toFixed(1)) : 0,
                address: addr,
                timestamp: Date.now(),
              })
            );
          } catch (e) {
            console.warn('Failed to cache GPS:', e);
          }
        }
      });

      const updatedLoc: UserLocation = {
        userId: currentUserId || 'usr_me',
        latitude,
        longitude,
        accuracy: roundedAcc,
        heading: heading ?? 0,
        speed: speed != null ? Number(speed.toFixed(1)) : 0,
        lastUpdatedTimestamp: Date.now(),
      };

      setDeviceLiveGps(updatedLoc);

      setLocations((prev) => {
        const next = { ...prev };
        if (currentUserId) {
          next[currentUserId] = {
            ...prev[currentUserId],
            ...updatedLoc,
            userId: currentUserId,
          };
        }
        next['default'] = updatedLoc;
        return next;
      });

      if (currentUserId) {
        broadcastLiveGpsToFirebase(currentUserId, updatedLoc);
      }
      setIsLocatingSystem(false);
      setIsLiveGPSActive(true);
      setGpsError(null);
    };

    // 1. First attempt: High-Accuracy satellite & sensor GPS
    navigator.geolocation.getCurrentPosition(
      applyPosition,
      (_highErr) => {
        // 2. Second attempt: Standard device network geolocation
        navigator.geolocation.getCurrentPosition(
          applyPosition,
          (lowErr) => {
            if (lowErr.code === 1) {
              setGpsError('Browser location permission denied. Tap to allow live GPS.');
            }
            setIsLocatingSystem(false);
            setIsLiveGPSActive(true);
          },
          {
            enableHighAccuracy: false,
            timeout: 8000,
            maximumAge: 0,
          }
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      }
    );
  }, [currentUserId, broadcastLiveGpsToFirebase]);

  // Request location immediately upon component mounting (app open)
  useEffect(() => {
    requestSystemLocation();
  }, [requestSystemLocation]);

  // Screen WakeLock & Background Live Location Tracking persistence
  useEffect(() => {
    let wakeLockSentinel: any = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err) {
        // Non-blocking
      }
    };

    if (activeUser.appLocationStatus && !activeUser.ghostMode) {
      requestWakeLock();
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && activeUser.appLocationStatus && !activeUser.ghostMode) {
        requestWakeLock();
        requestSystemLocation();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockSentinel) {
        wakeLockSentinel.release().catch(() => {});
      }
    };
  }, [activeUser.appLocationStatus, activeUser.ghostMode, requestSystemLocation]);

  // Background Periodic Location Heartbeat (every 8 seconds when location is ON)
  useEffect(() => {
    if (!activeUser.appLocationStatus || activeUser.ghostMode || !currentUserId) return;

    const heartbeatInterval = setInterval(() => {
      if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude, accuracy, heading, speed } = pos.coords;
            const updatedLoc: UserLocation = {
              userId: currentUserId,
              latitude,
              longitude,
              accuracy: Math.round(accuracy) || 4,
              heading: heading ?? 0,
              speed: speed != null ? Number(speed.toFixed(1)) : 0,
              lastUpdatedTimestamp: Date.now(),
            };
            syncLocationToFirebase(currentUserId, updatedLoc);
          },
          () => {},
          { enableHighAccuracy: true, timeout: 6000, maximumAge: 5000 }
        );
      }
    }, 8000);

    return () => clearInterval(heartbeatInterval);
  }, [activeUser.appLocationStatus, activeUser.ghostMode, currentUserId]);

  // Automatically request exact system location on startup or when dashboard opens
  useEffect(() => {
    if (appStage === 'dashboard') {
      requestSystemLocation();
    }
  }, [appStage, requestSystemLocation]);

  // Real-Time Device Geolocation Tracking (navigator.geolocation watchPosition with High Accuracy)
  useEffect(() => {
    let watchId: number | null = null;

    if (isLiveGPSActive && typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      try {
        watchId = navigator.geolocation.watchPosition(
          (position) => {
            const { latitude, longitude, accuracy, heading, speed } = position.coords;
            const roundedAcc = Math.round(accuracy) || 4;

            setHasRealGpsFix(true);

            reverseGeocodeCoords(latitude, longitude).then((addr) => {
              if (addr) {
                setCurrentAddress(addr);
                try {
                  localStorage.setItem(
                    'navi_last_real_device_gps',
                    JSON.stringify({
                      latitude,
                      longitude,
                      accuracy: roundedAcc,
                      heading: heading ?? 0,
                      speed: speed != null ? Number(speed.toFixed(1)) : 0,
                      address: addr,
                      timestamp: Date.now(),
                    })
                  );
                } catch (e) {}
              }
            });

            const updatedLoc: UserLocation = {
              userId: currentUserId || 'usr_me',
              latitude,
              longitude,
              accuracy: roundedAcc,
              heading: heading ?? 0,
              speed: speed != null ? Number(speed.toFixed(1)) : 0,
              lastUpdatedTimestamp: Date.now(),
            };

            setDeviceLiveGps(updatedLoc);

            setLocations((prev) => {
              const next = { ...prev };
              if (currentUserId) {
                next[currentUserId] = {
                  ...prev[currentUserId],
                  ...updatedLoc,
                  userId: currentUserId,
                };
              }
              next['default'] = updatedLoc;
              return next;
            });

            if (currentUserId) {
              broadcastLiveGpsToFirebase(currentUserId, updatedLoc);
            }
            setGpsError(null);
          },
          (error) => {
            if (error.code === 1) {
              setGpsError('Browser location permission denied. Tap to allow live GPS.');
            }
          },
          {
            enableHighAccuracy: true, // High accuracy tracks live movement accurately across all devices
            maximumAge: 1000,
            timeout: 10000,
          }
        );
      } catch (err) {
        // Fallback safely
      }
    }

    return () => {
      if (watchId !== null && typeof navigator !== 'undefined' && 'geolocation' in navigator) {
        try {
          navigator.geolocation.clearWatch(watchId);
        } catch (e) {
          // ignore
        }
      }
    };
  }, [isLiveGPSActive, currentUserId, broadcastLiveGpsToFirebase]);

  // Handler: Toggle or re-request Real Device GPS
  const handleToggleLiveGPS = () => {
    requestSystemLocation();
  };

  // Handler: Toggle In-App Master Location
  const handleToggleMasterLocation = () => {
    const nextStatus = !activeUser.appLocationStatus;
    setUsers((prev) =>
      prev.map((u) =>
        u.userId === activeUser.userId ? { ...u, appLocationStatus: nextStatus } : u
      )
    );

    if (activeUser.userId) {
      syncPrivacyToFirebase(activeUser.userId, { appLocationStatus: nextStatus });
    }

    logSocketEvent(
      'toggle-app-location',
      nextStatus ? 'OUTGOING' : 'BLOCKED',
      {
        userId: activeUser.userId,
        appLocationStatus: nextStatus,
        message: nextStatus ? 'Location tracking resumed' : 'Location Hidden by User',
      }
    );
  };

  // Handler: Toggle Ghost Mode
  const handleToggleGhostMode = () => {
    const nextGhost = !activeUser.ghostMode;
    setUsers((prev) =>
      prev.map((u) => (u.userId === activeUser.userId ? { ...u, ghostMode: nextGhost } : u))
    );

    if (activeUser.userId) {
      syncPrivacyToFirebase(activeUser.userId, { ghostMode: nextGhost });
    }

    logSocketEvent(
      'friend-location-changed',
      nextGhost ? 'BLOCKED' : 'OUTGOING',
      {
        userId: activeUser.userId,
        ghostMode: nextGhost,
        message: nextGhost ? 'Ghost Mode Activated' : 'Ghost Mode Deactivated',
      }
    );
  };

  // Handler: Send Friend Request
  const handleSendRequest = async (targetUserId: string) => {
    // 1. Local state update for instantaneous snappy feedback
    setUsers((prev) =>
      prev.map((u) => {
        if (u.userId === activeUser.userId) {
          return {
            ...u,
            pendingOutgoingRequests: [...new Set([...u.pendingOutgoingRequests, targetUserId])],
          };
        }
        if (u.userId === targetUserId) {
          return {
            ...u,
            pendingIncomingRequests: [...new Set([...u.pendingIncomingRequests, activeUser.userId])],
          };
        }
        return u;
      })
    );

    // 2. Persist to Firestore
    try {
      await sendFriendRequestInFirebase(activeUser.userId, targetUserId);
    } catch (err) {
      console.warn('Friend request Firebase sync error (using local state fallback):', err);
    }
  };

  // Handler: Accept Friend Request
  const handleAcceptRequest = async (senderUserId: string) => {
    // 1. Local state update
    setUsers((prev) =>
      prev.map((u) => {
        if (u.userId === activeUser.userId) {
          return {
            ...u,
            friendList: [...new Set([...u.friendList, senderUserId])],
            pendingIncomingRequests: u.pendingIncomingRequests.filter((id) => id !== senderUserId),
          };
        }
        if (u.userId === senderUserId) {
          return {
            ...u,
            friendList: [...new Set([...u.friendList, activeUser.userId])],
            pendingOutgoingRequests: u.pendingOutgoingRequests.filter((id) => id !== activeUser.userId),
          };
        }
        return u;
      })
    );

    confetti({
      particleCount: 75,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#06b6d4', '#10b981', '#a855f7'],
    });

    // 2. Persist to Firestore
    try {
      await acceptFriendRequestInFirebase(activeUser.userId, senderUserId);
    } catch (err) {
      console.warn('Friend accept Firebase sync error (using local state fallback):', err);
    }
  };

  // Handler: Reject Friend Request
  const handleRejectRequest = async (senderUserId: string) => {
    // 1. Local state update
    setUsers((prev) =>
      prev.map((u) => {
        if (u.userId === activeUser.userId) {
          return {
            ...u,
            pendingIncomingRequests: u.pendingIncomingRequests.filter((id) => id !== senderUserId),
          };
        }
        if (u.userId === senderUserId) {
          return {
            ...u,
            pendingOutgoingRequests: u.pendingOutgoingRequests.filter((id) => id !== activeUser.userId),
          };
        }
        return u;
      })
    );

    // 2. Persist to Firestore
    try {
      await rejectFriendRequestInFirebase(activeUser.userId, senderUserId);
    } catch (err) {
      console.warn('Friend reject Firebase sync error (using local state fallback):', err);
    }
  };

  const handleResetDemo = () => {
    // Preserve custom user profile across demo resets
    if (currentUser) {
      setUsers([currentUser, ...INITIAL_USERS.filter((u) => u.userId !== currentUser.userId)]);
      setLocations((prev) => ({
        ...INITIAL_LOCATIONS,
        ...(prev[currentUser.userId] ? { [currentUser.userId]: prev[currentUser.userId] } : {}),
      }));
    } else {
      setUsers(INITIAL_USERS);
      setLocations(INITIAL_LOCATIONS);
    }
    setSelectedFriendId(null);
  };

  const handleUpdateProfile = (updated: {
    name: string;
    phoneNumber: string;
    avatarUrl: string;
    uniqueAppId: string;
  }) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.userId === currentUserId) {
          return {
            ...u,
            name: updated.name,
            phoneNumber: updated.phoneNumber,
            avatarUrl: updated.avatarUrl,
            uniqueAppId: updated.uniqueAppId,
          };
        }
        return u;
      })
    );
  };

  // Handler: Add New Friend / Phone Number / Tracking ID
  const handleAddNewFriend = (contact: {
    name: string;
    phoneNumber: string;
    uniqueAppId: string;
    latitude?: number;
    longitude?: number;
  }) => {
    const cleanPhone = contact.phoneNumber.replace(/\D/g, '');
    const cleanHandle = contact.uniqueAppId.trim().toLowerCase();

    // 1. Check if user already exists in Firestore / registered users list (e.g. from Device 2)
    const existing = users.find(
      (u) =>
        u.userId !== activeUser.userId &&
        ((cleanHandle && u.uniqueAppId && u.uniqueAppId.toLowerCase() === cleanHandle) ||
          (cleanPhone && u.phoneNumber && u.phoneNumber.replace(/\D/g, '') === cleanPhone))
    );

    if (existing) {
      // Connect mutually to the real live device!
      setUsers((prev) =>
        prev.map((u) => {
          if (u.userId === activeUser.userId) {
            return {
              ...u,
              friendList: [...new Set([...u.friendList, existing.userId])],
            };
          }
          if (u.userId === existing.userId) {
            return {
              ...u,
              friendList: [...new Set([...u.friendList, activeUser.userId])],
            };
          }
          return u;
        })
      );
      addMutualContactDirectlyInFirebase(activeUser.userId, existing.userId);
      setSelectedFriendId(existing.userId);
      return;
    }

    const newId = `usr_${Date.now().toString(36)}`;
    const randomAvatars = [
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80',
    ];
    const avatarUrl = randomAvatars[Math.floor(Math.random() * randomAvatars.length)];

    const newUser: UserProfile = {
      userId: newId,
      name: contact.name,
      phoneNumber: contact.phoneNumber,
      uniqueAppId: contact.uniqueAppId,
      avatarUrl,
      appLocationStatus: true,
      ghostMode: false,
      friendList: [activeUser.userId],
      pendingIncomingRequests: [],
      pendingOutgoingRequests: [],
      batteryLevel: Math.floor(Math.random() * 40) + 60,
      isCharging: Math.random() > 0.6,
      isOnline: true,
      createdAt: new Date().toISOString(),
    };

    setUsers((prev) => {
      // Also add this new friend to the current user's friendList
      return [
        ...prev.map((u) => {
          if (u.userId === activeUser.userId) {
            return {
              ...u,
              friendList: [...new Set([...u.friendList, newId])],
            };
          }
          return u;
        }),
        newUser,
      ];
    });

    if (contact.latitude && contact.longitude) {
      setLocations((prev) => ({
        ...prev,
        [newId]: {
          userId: newId,
          latitude: contact.latitude!,
          longitude: contact.longitude!,
          accuracy: 5,
          speed: 1.2,
          altitude: 15,
          heading: 60,
          lastUpdatedTimestamp: Date.now(),
        },
      }));
    }

    // Auto-focus to the new friend
    setSelectedFriendId(newId);

    logSocketEvent(
      'friend-location-changed',
      'INCOMING',
      {
        userId: newId,
        name: contact.name,
        action: 'added_friend_contact',
      },
      newId
    );
  };

  const handleDeleteContact = (contactUserId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setUsers((prev) =>
      prev
        .filter((u) => u.userId !== contactUserId)
        .map((u) => {
          if (u.userId === currentUserId) {
            return {
              ...u,
              friendList: u.friendList.filter((id: string) => id !== contactUserId),
            };
          }
          return u;
        })
    );
    setLocations((prev) => {
      const copy = { ...prev };
      delete copy[contactUserId];
      return copy;
    });
    if (selectedFriendId === contactUserId) {
      setSelectedFriendId(null);
    }
  };

  const handleClearAllContacts = () => {
    setUsers((prev) =>
      prev
        .filter((u) => u.userId === currentUserId)
        .map((u) => ({
          ...u,
          friendList: [],
        }))
    );
    setLocations((prev) => {
      const copy: Record<string, UserLocation> = {};
      if (currentUserId && prev[currentUserId]) {
        copy[currentUserId] = prev[currentUserId];
      }
      return copy;
    });
    setSelectedFriendId(null);
  };

  const filteredFriends = useMemo(() => {
    const seen = new Set<string>();
    return computedFriends.filter((friend) => {
      if (!friend || !friend.userId || seen.has(friend.userId)) return false;
      seen.add(friend.userId);

      const matchesSearch =
        !searchQuery ||
        friend.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        friend.user.uniqueAppId.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (chatFilter === 'active') {
        return friend.user.isOnline && !friend.isShielded;
      }
      if (chatFilter === 'favourites') {
        return ['usr_bob', 'usr_sarah'].includes(friend.userId);
      }
      return true;
    });
  }, [computedFriends, searchQuery, chatFilter]);

  const arTargetFriend = computedFriends.find((f) => f.userId === arTargetFriendId);

  const handleProfileCreated = (newProfile: UserProfile, initialLoc: { lat: number; lng: number }) => {
    setUsers((prev) => {
      const userMap = new Map<string, UserProfile>();
      userMap.set(newProfile.userId, newProfile);
      prev.forEach((u) => {
        if (u && u.userId && u.userId !== newProfile.userId) {
          userMap.set(u.userId, u);
        }
      });
      return Array.from(userMap.values());
    });
    setCurrentUserId(newProfile.userId);
    setIsLiveGPSActive(true);
    const userLoc: UserLocation = {
      userId: newProfile.userId,
      latitude: initialLoc.lat,
      longitude: initialLoc.lng,
      accuracy: 4,
      speed: 0,
      altitude: 214.0,
      heading: 0,
      lastUpdatedTimestamp: Date.now(),
      currentFloor: 1,
      indoorZone: 'GPS Location',
    };
    setLocations((prev) => ({
      ...prev,
      [newProfile.userId]: userLoc,
    }));
    // Sync initial exact coordinates to Firebase for other devices
    syncLocationToFirebase(newProfile.userId, userLoc);
  };

  const handleDeleteProfile = () => {
    if (!currentUser) return;
    const deletedId = currentUser.userId;
    setUsers((prev) => {
      const remaining = prev.filter((u) => u.userId !== deletedId);
      try {
        localStorage.setItem('navi_app_users_v2', JSON.stringify(remaining));
      } catch (e) {
        console.warn('Failed to update users on delete:', e);
      }
      return remaining;
    });
    setLocations((prev) => {
      const copy = { ...prev };
      delete copy[deletedId];
      try {
        localStorage.setItem('navi_app_locations_v2', JSON.stringify(copy));
      } catch (e) {
        console.warn('Failed to update locations on delete:', e);
      }
      return copy;
    });
    setCurrentUserId('');
    setSelectedFriendId(null);
    setIsEditProfileModalOpen(false);
    setIsControlCenterOpen(false);
    setAppStage('intro');
    try {
      localStorage.removeItem('navi_app_current_user_id');
    } catch (e) {
      console.warn('Failed to remove currentUserId:', e);
    }
  };

  const handleSignOut = async () => {
    try {
      await logoutUserAccount();
    } catch (e) {
      console.warn('Sign out error:', e);
    }
    setCurrentUserId('');
    setSelectedFriendId(null);
    setIsEditProfileModalOpen(false);
    setIsControlCenterOpen(false);
    setAppStage('auth');
    try {
      localStorage.removeItem('navi_app_current_user_id');
    } catch (e) {}
  };

  const handleIntroGetStarted = () => {
    // Phase 2: Authentication Check
    if (currentUserId && users.some((u) => u.userId === currentUserId)) {
      setAppStage('dashboard');
    } else {
      setAppStage('auth');
    }
  };

  // Phase 1: Intro / Welcome Screen
  if (appStage === 'intro') {
    return (
      <>
        <PWAInstallBanner />
        <PWAUpdateToast />
        <WelcomeScreen onGetStarted={handleIntroGetStarted} />
      </>
    );
  }

  // Phase 2 & 3: Account Creation Screen
  if (appStage === 'auth' || !currentUser) {
    return (
      <>
        <PWAInstallBanner />
        <PWAUpdateToast />
        <FirstTimeLoginScreen
          onProfileCreated={(newProfile, initialLoc) => {
            handleProfileCreated(newProfile, initialLoc);
            setAppStage('dashboard');
          }}
          onBackToIntro={() => setAppStage('intro')}
        />
      </>
    );
  }

  return (
    <div className="relative h-screen h-[100dvh] max-h-[100dvh] w-screen bg-[#000000] text-[#F3F4F6] font-sans overflow-hidden select-none">
      <PWAInstallBanner />
      <PWAUpdateToast />
      {/* Floating Top Navigation Header */}
      <header className="absolute top-2 sm:top-3 left-2 sm:left-3 right-2 sm:right-3 z-30 flex items-center justify-between pointer-events-none gap-1 sm:gap-2">
        {/* Left: NaviLink 3D Logo with text & status */}
        <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2 px-2 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-[#000000]/95 backdrop-blur-xl border border-zinc-800 shadow-xl shrink-0">
          <NaviLinkLogo size="sm" showText={true} showTagline={false} />
          <div className="flex items-center gap-1 pl-1 border-l border-zinc-800/80">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
            <span className="text-[10px] text-slate-400 font-mono hidden md:inline">MESH LIVE</span>
          </div>
        </div>

        {/* Right: Required & Useful Controls (System Location GPS, Settings, Profile) */}
        <div className="pointer-events-auto flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Exact System Location Access & Status Chip */}
          <button
            id="btn-sync-system-location"
            onClick={requestSystemLocation}
            disabled={isLocatingSystem}
            title={
              gpsError
                ? `${gpsError} - Tap to allow location access`
                : `Device GPS: ${currentLocation.latitude.toFixed(5)}°, ${currentLocation.longitude.toFixed(5)}° (±${currentLocation.accuracy}m). Click to refresh.`
            }
            className={`flex items-center gap-1.5 px-2 py-1.5 sm:px-3 sm:py-2 rounded-xl text-xs font-mono border backdrop-blur-xl shadow-xl transition-all cursor-pointer ${
              gpsError
                ? 'bg-amber-950/50 border-amber-500/60 text-amber-300 hover:bg-amber-900/60'
                : isLocatingSystem
                ? 'bg-zinc-900 border-sky-500/60 text-sky-300'
                : 'bg-black/95 border-emerald-500/50 text-emerald-400 hover:border-emerald-400 hover:bg-zinc-900'
            }`}
          >
            {isLocatingSystem ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-400 shrink-0" />
            ) : gpsError ? (
              <Crosshair className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            ) : (
              <Crosshair className="w-3.5 h-3.5 text-emerald-400 shrink-0 animate-pulse" />
            )}

            <div className="text-left flex flex-col">
              <span className="font-bold text-white tracking-tight text-[11px] sm:text-xs truncate max-w-[90px] xs:max-w-[140px] sm:max-w-[200px]">
                {isLocatingSystem
                  ? 'Locating...'
                  : gpsError
                  ? 'Allow GPS'
                  : currentAddress}
              </span>
              {!isLocatingSystem && !gpsError && (
                <span className="text-[9px] sm:text-[10px] text-emerald-400 font-semibold font-mono hidden xs:inline">
                  {currentLocation.latitude.toFixed(4)}°, {currentLocation.longitude.toFixed(4)}°
                </span>
              )}
            </div>
          </button>

          {/* Live GPS Hardware Active Status Badge */}
          <div
            id="badge-live-gps-active"
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl text-xs font-mono border backdrop-blur-xl shadow-xl bg-black/95 border-emerald-500/40 text-emerald-400"
          >
            <Radio className="w-3.5 h-3.5 text-emerald-400 shrink-0 animate-pulse" />
            <span className="text-emerald-300 font-bold text-[11px]">Live GPS</span>
          </div>

          {/* Settings / Control Center Button (Required) */}
          <button
            id="btn-open-control-center"
            onClick={() => setIsControlCenterOpen(true)}
            title="Open Control Center & Settings"
            className="p-2 sm:px-3 sm:py-2 rounded-xl bg-black/95 text-zinc-300 border border-zinc-800 hover:text-white hover:border-zinc-600 transition-all cursor-pointer flex items-center gap-1.5 shadow-xl"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden md:inline text-xs font-semibold">Settings</span>
          </button>

          {/* Current User Profile Chip (Required) */}
          <div
            id="btn-open-user-profile"
            onClick={() => setIsEditProfileModalOpen(true)}
            className="flex items-center gap-1.5 sm:gap-2 p-1 sm:pl-2 sm:pr-3 sm:py-1.5 rounded-xl bg-black/95 border border-zinc-800 shadow-xl hover:border-zinc-600 transition-all cursor-pointer"
            title="Click to edit profile"
          >
            <div className="relative">
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.name}
                className="w-7 h-7 rounded-full object-cover border border-sky-400"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-black" />
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-white leading-none">{currentUser.name}</p>
              <p className="text-[10px] text-zinc-400 leading-none mt-1">{currentUser.batteryLevel}%</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Full-Screen Map Canvas */}
      <main className="w-full h-full relative">
        {gpsError && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 max-w-md w-[92%] bg-amber-950/90 border border-amber-500/80 rounded-2xl p-3 shadow-2xl backdrop-blur-md flex items-center justify-between gap-3 text-amber-200 text-xs animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
              <span className="font-medium">{gpsError}</span>
            </div>
            <button
              onClick={requestSystemLocation}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] shrink-0 transition-colors shadow-md cursor-pointer"
            >
              Allow GPS
            </button>
          </div>
        )}

        <LiveMapView
          currentUser={currentUser}
          currentLocation={currentLocation}
          friends={computedFriends}
          selectedFriendId={selectedFriendId}
          onSelectFriend={(id) => setSelectedFriendId(id)}
          isSimulating={isSimulating}
          onToggleSimulate={() => setIsSimulating(!isSimulating)}
          routeMode={routeMode}
          onChangeRouteMode={setRouteMode}
          isLiveGPSActive={isLiveGPSActive}
          onToggleLiveGPS={handleToggleLiveGPS}
          gpsError={gpsError}
          isRealGpsFixed={hasRealGpsFix}
        />

        {/* Phase 4 Bottom Sheet / Tray for Contacts & Live Routing */}
        <FriendsBottomSheet
          friends={computedFriends}
          selectedFriendId={selectedFriendId}
          onSelectFriend={(id) => setSelectedFriendId(id)}
          onOpenAddContact={() => setIsAddFriendModalOpen(true)}
          onDeleteContact={handleDeleteContact}
          onClearAllContacts={handleClearAllContacts}
          incomingRequests={incomingRequestsList}
          onAcceptRequest={handleAcceptRequest}
          onRejectRequest={handleRejectRequest}
        />
      </main>

      {/* Control Center / Settings Slide-out Panel */}
      {isControlCenterOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
          <div className="w-full sm:w-96 bg-[#121418] border-l border-[#272d3b] h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="p-4 border-b border-[#272d3b] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold text-[#F3F4F6]">Control Center & Settings</h3>
              </div>
              <button
                onClick={() => setIsControlCenterOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <ControlCenterTab
                users={users}
                currentUser={currentUser}
                onSwitchUser={(uid) => {
                  setCurrentUserId(uid);
                  setSelectedFriendId(null);
                }}
                isSimulating={isSimulating}
                onToggleSimulate={() => setIsSimulating(!isSimulating)}
                routeMode={routeMode}
                onChangeRouteMode={setRouteMode}
                onToggleMasterLocation={handleToggleMasterLocation}
                onToggleGhostMode={handleToggleGhostMode}
                isE2EEEnabled={isE2EEEnabled}
                onToggleE2EE={() => setIsE2EEEnabled(!isE2EEEnabled)}
                onOpenSocketLogs={() => setIsSocketLogsOpen(true)}
                onOpenTestGuide={() => setIsTestGuideOpen(true)}
                onResetDemo={handleResetDemo}
                socketLogsCount={socketLogs.length}
                onOpenAddModal={() => setIsAddFriendModalOpen(true)}
                onOpenEditProfile={() => setIsEditProfileModalOpen(true)}
                onDeleteProfile={handleDeleteProfile}
                onSignOut={handleSignOut}
                isLiveGPSActive={isLiveGPSActive}
                onToggleLiveGPS={handleToggleLiveGPS}
                gpsError={gpsError}
              />
            </div>
          </div>
        </div>
      )}

      {/* Google Maps Live View (AR Augmented Reality Walking Navigation) */}
      {arTargetFriend && (
        <GoogleMapsLiveViewAR
          friend={arTargetFriend}
          currentUser={currentUser}
          currentLocation={currentLocation}
          onClose={() => setArTargetFriendId(null)}
          routeMode={routeMode}
        />
      )}

      {/* Add Friend / Add Phone Number Modal */}
      <AddFriendModal
        isOpen={isAddFriendModalOpen}
        onClose={() => setIsAddFriendModalOpen(false)}
        onAddContact={handleAddNewFriend}
        userLocation={{ lat: currentLocation.latitude, lng: currentLocation.longitude }}
        allUsers={users}
        currentUser={currentUser}
        onSendRequest={handleSendRequest}
        onAcceptRequest={handleAcceptRequest}
        onRejectRequest={handleRejectRequest}
      />

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isEditProfileModalOpen}
        onClose={() => setIsEditProfileModalOpen(false)}
        currentUser={currentUser}
        currentLocation={{ latitude: currentLocation.latitude, longitude: currentLocation.longitude }}
        onUpdateProfile={handleUpdateProfile}
        onUpdateLocation={(coords) => {
          if (currentUserId) {
            setLocations((prev) => ({
              ...prev,
              [currentUserId]: {
                ...prev[currentUserId],
                userId: currentUserId,
                latitude: coords.latitude,
                longitude: coords.longitude,
                accuracy: 4,
                speed: 0,
                lastUpdatedTimestamp: Date.now(),
              },
            }));
          }
        }}
        onDeleteProfile={handleDeleteProfile}
      />

      {/* WebSocket & Privacy Shield Live Packet Inspector Modal */}
      <SocketInspectorModal
        isOpen={isSocketLogsOpen}
        logs={socketLogs}
        onClose={() => setIsSocketLogsOpen(false)}
        onClear={() => setSocketLogs([])}
      />

      {/* Testing & Verification Guide Modal */}
      <TestGuideModal
        isOpen={isTestGuideOpen}
        onClose={() => setIsTestGuideOpen(false)}
        currentUser={currentUser}
        onSwitchTab={() => {
          setIsSidebarOpen(true);
        }}
        onSwitchPersona={(uid) => {
          setCurrentUserId(uid);
          setSelectedFriendId(null);
        }}
        onOpenARWithSarah={() => setArTargetFriendId('usr_sarah')}
      />
    </div>
  );
}
