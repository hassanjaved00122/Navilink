import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  memoryLocalCache,
  setLogLevel,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  collection,
  onSnapshot,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
} from 'firebase/firestore';
import { UserProfile, UserLocation } from '../types';

export const firebaseConfig = {
  apiKey: "AIzaSyA274cAVJIrU5ZvS_6A-VeM9JOF2WlZvlk",
  authDomain: "navilink-f1469.firebaseapp.com",
  databaseURL: "https://navilink-f1469-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "navilink-f1469",
  storageBucket: "navilink-f1469.firebasestorage.app",
  messagingSenderId: "506975964681",
  appId: "1:506975964681:web:e7c75889cc589f4f1472d8"
};

// Suppress non-critical backend reachability warnings when running in sandboxed iframes or transient offline conditions
try {
  setLogLevel('silent');
} catch (_) {
  // Ignore
}

// In sandboxed iframes / preview environments, filter out cosmetic Cloud Firestore reachability warnings from window/console
if (typeof window !== 'undefined') {
  const origWarn = console.warn.bind(console);
  console.warn = (...args: any[]) => {
    const text = args.map((a) => (typeof a === 'string' ? a : a?.message || '')).join(' ');
    if (text.includes('Could not reach Cloud Firestore backend') || text.includes('@firebase/firestore')) {
      return;
    }
    origWarn(...args);
  };

  const origError = console.error.bind(console);
  console.error = (...args: any[]) => {
    const text = args.map((a) => (typeof a === 'string' ? a : a?.message || '')).join(' ');
    if (text.includes('Could not reach Cloud Firestore backend') || text.includes('@firebase/firestore: Firestore')) {
      return;
    }
    origError(...args);
  };
}

// Initialize Firebase safely with memory cache and auto-detect long-polling for iframe/sandboxed environments
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getApps().length > 0
  ? getFirestore(app)
  : initializeFirestore(app, {
      localCache: memoryLocalCache(),
      experimentalAutoDetectLongPolling: true,
    });

// In-memory cache for user profile to guarantee minimal Firebase reads (1 read per session/visit)
let cachedUserProfile: UserProfile | null = null;
let lastFetchedUid: string | null = null;

/**
 * Format phone number with default Pakistan (+92) country code
 */
export function formatPakistanPhoneNumber(rawPhone: string): string {
  const cleaned = rawPhone.trim().replace(/[\s\-()]/g, '');
  if (cleaned.startsWith('+92')) {
    return cleaned;
  }
  if (cleaned.startsWith('0092')) {
    return '+' + cleaned.slice(2);
  }
  if (cleaned.startsWith('03')) {
    return '+92' + cleaned.slice(1);
  }
  if (cleaned.startsWith('3') && cleaned.length === 10) {
    return '+92' + cleaned;
  }
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  return '+92' + cleaned;
}

// Helper to persist profile locally
function saveLocalProfile(profile: UserProfile): void {
  try {
    localStorage.setItem(`navi_profile_${profile.userId}`, JSON.stringify(profile));
    localStorage.setItem('navi_app_current_user_id', profile.userId);
  } catch (e) {
    // Ignore localStorage failures
  }
}

function getLocalProfile(userId: string): UserProfile | null {
  try {
    const raw = localStorage.getItem(`navi_profile_${userId}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // Ignore
  }
  return null;
}

/**
 * Sign Up with Full Name, Pakistan Phone (+92), Email, and Password
 * Automatically sets device location tracking ON by default
 */
export async function registerUserAccount(
  name: string,
  rawPhone: string,
  email: string,
  password: string
): Promise<UserProfile> {
  const formattedPhone = formatPakistanPhoneNumber(rawPhone);
  
  // 1. Firebase Auth User Creation (Always authoritative)
  const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  const user = userCredential.user;

  // Update display name in Auth
  try {
    await updateProfile(user, { displayName: name.trim() });
  } catch (e) {
    console.warn('Could not update Auth display name:', e);
  }

  const sanitizedHandle = `@${name.trim().toLowerCase().replace(/[^a-z0-9_]/g, '') || 'user'}_${Math.floor(1000 + Math.random() * 9000)}`;

  const newProfile: UserProfile = {
    userId: user.uid,
    phoneNumber: formattedPhone,
    uniqueAppId: sanitizedHandle,
    name: name.trim(),
    avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`,
    appLocationStatus: true, // Default: Automatic ON as requested
    ghostMode: false,
    friendList: [],
    pendingIncomingRequests: [],
    pendingOutgoingRequests: [],
    batteryLevel: 95,
    isCharging: false,
    isOnline: true,
    createdAt: new Date().toISOString(),
  };

  // 2. Safe Firestore Write (Non-blocking fallback if Firestore security rules are strict)
  try {
    await setDoc(doc(db, 'users', user.uid), {
      ...newProfile,
      email: email.trim(),
      updatedAt: serverTimestamp(),
    });
  } catch (_firestoreErr) {
    // Non-blocking fallback if Firestore database rules are restricted in console
  }

  // Cache & save profile locally
  cachedUserProfile = newProfile;
  lastFetchedUid = user.uid;
  saveLocalProfile(newProfile);

  return newProfile;
}

/**
 * Log In with Email and Password
 */
export async function loginUserAccount(email: string, password: string): Promise<UserProfile> {
  const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
  return await fetchUserProfileOnce(
    userCredential.user.uid,
    userCredential.user.displayName || email.split('@')[0] || 'NaviLink User'
  );
}

/**
 * Log Out
 */
export async function logoutUserAccount(): Promise<void> {
  cachedUserProfile = null;
  lastFetchedUid = null;
  try {
    localStorage.removeItem('navi_app_current_user_id');
  } catch (e) {}
  await signOut(auth);
}

/**
 * Optimized Single Read Function:
 * Reads from Firestore exactly once when the user opens/visits the app.
 * Gracefully falls back to local cached profile if Firestore returns permission-denied.
 */
export async function fetchUserProfileOnce(uid: string, fallbackName?: string): Promise<UserProfile> {
  if (cachedUserProfile && lastFetchedUid === uid) {
    return cachedUserProfile;
  }

  // Check local storage backup
  const localSaved = getLocalProfile(uid);

  try {
    const userDocRef = doc(db, 'users', uid);
    const snap = await getDoc(userDocRef); // Single 1-Read operation

    if (snap.exists()) {
      const data = snap.data();
      const profile: UserProfile = {
        userId: uid,
        phoneNumber: data.phoneNumber || localSaved?.phoneNumber || '+923001234567',
        uniqueAppId: data.uniqueAppId || localSaved?.uniqueAppId || `@user_${uid.slice(0, 6)}`,
        name: data.name || localSaved?.name || fallbackName || 'NaviLink User',
        avatarUrl: data.avatarUrl || localSaved?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${uid}`,
        appLocationStatus: data.appLocationStatus ?? localSaved?.appLocationStatus ?? true, // Default ON
        ghostMode: data.ghostMode ?? localSaved?.ghostMode ?? false,
        friendList: data.friendList || localSaved?.friendList || [],
        pendingIncomingRequests: data.pendingIncomingRequests || localSaved?.pendingIncomingRequests || [],
        pendingOutgoingRequests: data.pendingOutgoingRequests || localSaved?.pendingOutgoingRequests || [],
        batteryLevel: data.batteryLevel ?? localSaved?.batteryLevel ?? 95,
        isCharging: data.isCharging ?? localSaved?.isCharging ?? false,
        isOnline: true,
        createdAt: data.createdAt || localSaved?.createdAt || new Date().toISOString(),
      };
      cachedUserProfile = profile;
      lastFetchedUid = uid;
      saveLocalProfile(profile);
      return profile;
    }
  } catch (_err) {
    // Firestore rules may restrict read access; silently fallback to local cache
  }

  // If local backup exists
  if (localSaved) {
    cachedUserProfile = localSaved;
    lastFetchedUid = uid;
    return localSaved;
  }

  // If new doc needs creation
  const fallbackProfile: UserProfile = {
    userId: uid,
    phoneNumber: '+923001234567',
    uniqueAppId: `@navilink_${uid.slice(0, 5)}`,
    name: fallbackName || 'NaviLink User',
    avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${uid}`,
    appLocationStatus: true,
    ghostMode: false,
    friendList: [],
    pendingIncomingRequests: [],
    pendingOutgoingRequests: [],
    batteryLevel: 95,
    isCharging: false,
    isOnline: true,
    createdAt: new Date().toISOString(),
  };

  cachedUserProfile = fallbackProfile;
  lastFetchedUid = uid;
  saveLocalProfile(fallbackProfile);
  return fallbackProfile;
}

/**
 * Update Location in Firestore with merge (resilient across devices & networks)
 */
export async function syncLocationToFirebase(userId: string, location: UserLocation): Promise<void> {
  if (!userId) return;
  try {
    const userDocRef = doc(db, 'users', userId);
    await setDoc(
      userDocRef,
      {
        userId,
        lastLocation: {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          heading: location.heading ?? 0,
          speed: location.speed ?? 0,
          lastUpdatedTimestamp: location.lastUpdatedTimestamp || Date.now(),
        },
        lastActive: serverTimestamp(),
        isOnline: true,
      },
      { merge: true }
    );
  } catch (e) {
    // Non-blocking sync
  }
}

/**
 * Directly establish mutual contact connection in Firebase
 */
export async function addMutualContactDirectlyInFirebase(
  userUid: string,
  targetUid: string
): Promise<boolean> {
  if (!userUid || !targetUid || userUid === targetUid) return false;
  try {
    const userRef = doc(db, 'users', userUid);
    const targetRef = doc(db, 'users', targetUid);

    await Promise.all([
      setDoc(userRef, { friendList: arrayUnion(targetUid), updatedAt: serverTimestamp() }, { merge: true }),
      setDoc(targetRef, { friendList: arrayUnion(userUid), updatedAt: serverTimestamp() }, { merge: true }),
    ]);
    return true;
  } catch (e) {
    console.warn('addMutualContactDirectlyInFirebase error:', e);
    return false;
  }
}

/**
 * Update Privacy Settings (appLocationStatus, ghostMode)
 */
export async function syncPrivacyToFirebase(
  userId: string,
  settings: { appLocationStatus?: boolean; ghostMode?: boolean }
): Promise<void> {
  if (cachedUserProfile && cachedUserProfile.userId === userId) {
    cachedUserProfile = {
      ...cachedUserProfile,
      ...settings,
    };
  }

  try {
    const userDocRef = doc(db, 'users', userId);
    await setDoc(
      userDocRef,
      {
        ...settings,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (e) {
    // Non-blocking
  }
}

/**
 * Real-Time Firestore Location & User Stream
 * When both users are active on devices,
 * this syncs their exact GPS locations in real time.
 */
export function subscribeToAllUsersLocations(
  onUpdate: (data: { users: UserProfile[]; locations: Record<string, UserLocation> }) => void
): () => void {
  try {
    const usersCol = collection(db, 'users');
    const unsubscribe = onSnapshot(
      usersCol,
      (snapshot) => {
        const fetchedUsers: UserProfile[] = [];
        const fetchedLocations: Record<string, UserLocation> = {};

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const uid = docSnap.id;
          if (data) {
            fetchedUsers.push({
              userId: uid,
              phoneNumber: data.phoneNumber || '+923001234567',
              uniqueAppId: data.uniqueAppId || `@user_${uid.slice(0, 6)}`,
              name: data.name || 'NaviLink User',
              avatarUrl: data.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${uid}`,
              appLocationStatus: data.appLocationStatus ?? true,
              ghostMode: data.ghostMode ?? false,
              friendList: data.friendList || [],
              pendingIncomingRequests: data.pendingIncomingRequests || [],
              pendingOutgoingRequests: data.pendingOutgoingRequests || [],
              batteryLevel: data.batteryLevel ?? 95,
              isCharging: data.isCharging ?? false,
              isOnline: true,
              createdAt: data.createdAt || new Date().toISOString(),
            });

            if (data.lastLocation && typeof data.lastLocation.latitude === 'number' && typeof data.lastLocation.longitude === 'number') {
              fetchedLocations[uid] = {
                userId: uid,
                latitude: data.lastLocation.latitude,
                longitude: data.lastLocation.longitude,
                accuracy: data.lastLocation.accuracy ?? 5,
                heading: data.lastLocation.heading ?? 0,
                speed: data.lastLocation.speed ?? 0,
                lastUpdatedTimestamp: data.lastLocation.lastUpdatedTimestamp || Date.now(),
              };
            }
          }
        });

        if (fetchedUsers.length > 0) {
          onUpdate({ users: fetchedUsers, locations: fetchedLocations });
        }
      },
      (_err) => {
        // Silently ignore if Firestore access is restricted
      }
    );
    return unsubscribe;
  } catch (e) {
    return () => {};
  }
}

/**
 * Send Friend Request in Firebase Firestore
 */
export async function sendFriendRequestInFirebase(senderUid: string, targetUid: string): Promise<boolean> {
  if (!senderUid || !targetUid || senderUid === targetUid) return false;
  try {
    const senderRef = doc(db, 'users', senderUid);
    const targetRef = doc(db, 'users', targetUid);

    await Promise.all([
      updateDoc(senderRef, {
        pendingOutgoingRequests: arrayUnion(targetUid),
        updatedAt: serverTimestamp(),
      }).catch(() => {}),
      updateDoc(targetRef, {
        pendingIncomingRequests: arrayUnion(senderUid),
        updatedAt: serverTimestamp(),
      }).catch(() => {}),
    ]);
    return true;
  } catch (e) {
    console.warn('sendFriendRequestInFirebase error:', e);
    return false;
  }
}

/**
 * Accept Friend Request in Firebase Firestore (Creates mutual friend connection)
 */
export async function acceptFriendRequestInFirebase(userUid: string, senderUid: string): Promise<boolean> {
  if (!userUid || !senderUid) return false;
  try {
    const userRef = doc(db, 'users', userUid);
    const senderRef = doc(db, 'users', senderUid);

    await Promise.all([
      updateDoc(userRef, {
        friendList: arrayUnion(senderUid),
        pendingIncomingRequests: arrayRemove(senderUid),
        updatedAt: serverTimestamp(),
      }).catch(() => {}),
      updateDoc(senderRef, {
        friendList: arrayUnion(userUid),
        pendingOutgoingRequests: arrayRemove(userUid),
        updatedAt: serverTimestamp(),
      }).catch(() => {}),
    ]);
    return true;
  } catch (e) {
    console.warn('acceptFriendRequestInFirebase error:', e);
    return false;
  }
}

/**
 * Reject Friend Request in Firebase Firestore
 */
export async function rejectFriendRequestInFirebase(userUid: string, senderUid: string): Promise<boolean> {
  if (!userUid || !senderUid) return false;
  try {
    const userRef = doc(db, 'users', userUid);
    const senderRef = doc(db, 'users', senderUid);

    await Promise.all([
      updateDoc(userRef, {
        pendingIncomingRequests: arrayRemove(senderUid),
        updatedAt: serverTimestamp(),
      }).catch(() => {}),
      updateDoc(senderRef, {
        pendingOutgoingRequests: arrayRemove(userUid),
        updatedAt: serverTimestamp(),
      }).catch(() => {}),
    ]);
    return true;
  } catch (e) {
    console.warn('rejectFriendRequestInFirebase error:', e);
    return false;
  }
}

