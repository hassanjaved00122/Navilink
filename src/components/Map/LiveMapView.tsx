import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { UserProfile, UserLocation, ShieldedFriendLocation } from '../../types';
import {
  Shield,
  ShieldAlert,
  Ghost,
  Compass,
  Crosshair,
  Play,
  Pause,
  Navigation,
  EyeOff,
  Layers,
  Maximize2,
  Footprints,
  Car,
  Route,
  ChevronRight,
  Sparkles,
  Camera,
  Plus,
  Minus,
  ZoomIn,
  ZoomOut,
  CircleDot,
  X,
  MapPin,
} from 'lucide-react';
import {
  fetchGoogleDirections,
  DirectionStep,
  GoogleRouteResult,
} from '../../services/googleDirectionsService';
import { SHARIF_COLONY_POIS, GoogleMapPOI } from '../../data/mapPOIData';

interface LiveMapViewProps {
  currentUser: UserProfile;
  currentLocation: UserLocation;
  friends: ShieldedFriendLocation[];
  selectedFriendId: string | null;
  onSelectFriend: (friendId: string | null) => void;
  isSimulating: boolean;
  onToggleSimulate: () => void;
  routeMode?: 'walking' | 'driving';
  onChangeRouteMode?: (mode: 'walking' | 'driving') => void;
  onOpenDirectionsTab?: () => void;
  onDirectionsUpdated?: (data: {
    steps: DirectionStep[];
    summary: string;
    distanceText: string;
    durationText: string;
    startAddress: string;
    endAddress: string;
    source: 'google' | 'osrm' | 'fallback';
  }) => void;
  isLiveGPSActive?: boolean;
  onToggleLiveGPS?: () => void;
  onToggleMasterLocation?: () => void;
  gpsError?: string | null;
  isRealGpsFixed?: boolean;
}

export const LiveMapView: React.FC<LiveMapViewProps> = ({
  currentUser,
  currentLocation,
  friends,
  selectedFriendId,
  onSelectFriend,
  isSimulating,
  onToggleSimulate,
  routeMode: propRouteMode,
  onChangeRouteMode,
  onOpenDirectionsTab,
  onDirectionsUpdated,
  isLiveGPSActive = false,
  onToggleLiveGPS,
  onToggleMasterLocation,
  gpsError,
  isRealGpsFixed = false,
}) => {
  const [mapTheme, setMapTheme] = useState<'streets' | 'satellite' | 'terrain'>('streets');
  const [mapReady, setMapReady] = useState<boolean>(false);
  const [currentZoom, setCurrentZoom] = useState<number>(16);
  const [mapRotation, setMapRotation] = useState<number>(0);
  const [isRotatingWithFinger, setIsRotatingWithFinger] = useState<boolean>(false);
  const [selectedPoi, setSelectedPoi] = useState<GoogleMapPOI | null>(null);
  const [internalRouteMode, setInternalRouteMode] = useState<'walking' | 'driving'>('walking');
  const routeMode = propRouteMode ?? internalRouteMode;
  const setRouteMode = (mode: 'walking' | 'driving') => {
    setInternalRouteMode(mode);
    if (onChangeRouteMode) onChangeRouteMode(mode);
  };
  const [routeData, setRouteData] = useState<{
    distanceFormatted: string;
    durationFormatted: string;
    routeSummary: string;
    friendName: string;
    bounds: L.LatLngBounds | null;
  } | null>(null);
  const [isMovedAway, setIsMovedAway] = useState<boolean>(false);
  const [circleSize, setCircleSize] = useState<'compact' | 'standard'>('compact');

  const touchStartAngleRef = useRef<number | null>(null);
  const touchStartRotationRef = useRef<number>(0);

  // Two-Finger Touch Gesture Rotation directly on the map screen
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[1].clientX - e.touches[0].clientX;
      const dy = e.touches[1].clientY - e.touches[0].clientY;
      touchStartAngleRef.current = Math.atan2(dy, dx) * (180 / Math.PI);
      touchStartRotationRef.current = mapRotation;
      setIsRotatingWithFinger(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStartAngleRef.current !== null) {
      const dx = e.touches[1].clientX - e.touches[0].clientX;
      const dy = e.touches[1].clientY - e.touches[0].clientY;
      const currentAngle = Math.atan2(dy, dx) * (180 / Math.PI);
      const angleDiff = currentAngle - touchStartAngleRef.current;
      const newRotation = Math.round((touchStartRotationRef.current + angleDiff + 360) % 360);
      setMapRotation(newRotation);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      touchStartAngleRef.current = null;
      setIsRotatingWithFinger(false);
    }
  };

  const handleResetRotation = () => {
    setMapRotation(0);
  };

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const friendMarkersRef = useRef<Record<string, L.Marker>>({});
  const poiMarkersRef = useRef<Record<string, L.Marker>>({});

  // Single Stable Google Maps Route along the road (True Google Maps Blue Route without red arrow)
  const routeOutlineRef = useRef<L.Polyline | null>(null);
  const routeMainRef = useRef<L.Polyline | null>(null);
  const routeInnerRef = useRef<L.Polyline | null>(null);

  // Stability Tracking Refs (Prevents jumping, flickering, or re-rendering)
  const hasInitialCenteredRef = useRef<boolean>(false);
  const lastCalculatedStartRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastCalculatedEndRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastTargetFriendIdRef = useRef<string | null>(null);
  const lastFramedFriendIdRef = useRef<string | null>(null);
  const lastRouteModeRef = useRef<'walking' | 'driving'>('walking');
  const activeRedCoordsRef = useRef<[number, number][]>([]);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Initialize Leaflet Map with Google Maps
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [currentLocation.latitude, currentLocation.longitude],
      zoom: 16,
      zoomControl: false,
    });

    // Real Google Maps Streets Layer (Standard)
    const initialTile = L.tileLayer(
      'https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
      {
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: '&copy; Google Maps',
        maxZoom: 20,
      }
    ).addTo(map);

    tileLayerRef.current = initialTile;

    // Track real-time zoom level to reveal Google Maps POI & places dynamically
    const handleZoomUpdate = () => {
      setCurrentZoom(map.getZoom());
    };
    map.on('zoom', handleZoomUpdate);
    map.on('zoomend', handleZoomUpdate);
    setCurrentZoom(map.getZoom());

    mapInstanceRef.current = map;
    setMapReady(true);

    // Ensure size is invalidated after mount to render all pins accurately
    requestAnimationFrame(() => map.invalidateSize());
    const t = setTimeout(() => map.invalidateSize(), 250);

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      clearTimeout(t);
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
      resizeObserver.disconnect();
      map.off('zoom', handleZoomUpdate);
      map.off('zoomend', handleZoomUpdate);
      if (routeOutlineRef.current) routeOutlineRef.current.remove();
      if (routeMainRef.current) routeMainRef.current.remove();
      if (routeInnerRef.current) routeInnerRef.current.remove();
      Object.values(poiMarkersRef.current).forEach((m) => m.remove());
      poiMarkersRef.current = {};
      map.remove();
      mapInstanceRef.current = null;
      setMapReady(false);
    };
  }, []);

  // Handle Google Maps Theme Switching
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      tileLayerRef.current.remove();
    }

    if (mapTheme === 'streets') {
      tileLayerRef.current = L.tileLayer(
        'https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
        {
          subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
          attribution: '&copy; Google Maps',
          maxZoom: 20,
        }
      ).addTo(map);
    } else if (mapTheme === 'satellite') {
      // Google Maps Satellite Hybrid (Satellite + Roads/Labels)
      tileLayerRef.current = L.tileLayer(
        'https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
        {
          subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
          attribution: '&copy; Google Maps Satellite',
          maxZoom: 20,
        }
      ).addTo(map);
    } else if (mapTheme === 'terrain') {
      // Google Maps Terrain (Relief & Roads)
      tileLayerRef.current = L.tileLayer(
        'https://{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',
        {
          subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
          attribution: '&copy; Google Maps Terrain',
          maxZoom: 20,
        }
      ).addTo(map);
    }
  }, [mapTheme]);

  // 2. Update User Position & Accuracy Circle
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    const userLatLng: L.LatLngExpression = [currentLocation.latitude, currentLocation.longitude];

    // If first real GPS fix arrives and user hasn't manually panned away, smoothly center on user
    if (!hasInitialCenteredRef.current && currentLocation.latitude && currentLocation.longitude) {
      hasInitialCenteredRef.current = true;
      map.flyTo([currentLocation.latitude, currentLocation.longitude], 17, { duration: 0.8 });
    }

    // If Master Location Toggle is OFF, user is not broadcasting
    const isSharing = currentUser.appLocationStatus;

    // Red Teardrop Location Pin for User matching Google Maps style in 1.jpg
    const userIconHtml = `
      <div class="user-map-pin" style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 60px; pointer-events: auto;">
        <!-- Top Compact Label -->
        <div style="background: rgba(220, 38, 38, 0.95); color: #ffffff; font-weight: 800; font-size: 10px; padding: 1.5px 7px; border-radius: 9999px; border: 1.5px solid #f87171; box-shadow: 0 2px 8px rgba(239,68,68,0.5); white-space: nowrap; margin-bottom: 2px; text-transform: uppercase; letter-spacing: 0.5px;">
          You
        </div>
        
        <!-- Red Teardrop Location Pin with Circular Hole (matching 1.jpg) -->
        <div style="position: relative; width: 34px; height: 42px; display: flex; align-items: center; justify-content: center;">
          ${isSharing ? '<div style="position: absolute; bottom: 5px; width: 22px; height: 22px; border-radius: 50%; background: rgba(239, 68, 68, 0.45); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>' : ''}
          <svg width="32" height="42" viewBox="0 0 34 42" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 3px 6px rgba(185,28,28,0.6));">
            <path d="M17 0C7.61 0 0 7.61 0 17C0 27.5 17 42 17 42C17 42 34 27.5 34 17C34 7.61 26.39 0 17 0Z" fill="${isSharing ? '#ef4444' : '#f59e0b'}" stroke="#991b1b" stroke-width="2"/>
            <circle cx="17" cy="17" r="5.5" fill="#ffffff" stroke="#991b1b" stroke-width="1.6"/>
          </svg>
        </div>
      </div>
    `;

    const userIcon = L.divIcon({
      className: 'user-pin-icon',
      html: userIconHtml,
      iconSize: [60, 56],
      iconAnchor: [30, 54],
    });

    if (!userMarkerRef.current) {
      userMarkerRef.current = L.marker(userLatLng, { icon: userIcon, zIndexOffset: 1000 }).addTo(map);
      userMarkerRef.current.bindPopup(`
        <div class="p-2 text-slate-900 font-sans">
          <p class="font-bold text-sm">${currentUser.name}</p>
          <p class="text-xs text-slate-600">${currentUser.uniqueAppId}</p>
          <div class="mt-2 text-[11px] space-y-1">
            <p><strong>Status:</strong> ${currentUser.appLocationStatus ? 'Sharing Active' : 'Location Hidden'}</p>
            <p><strong>Mode:</strong> ${currentUser.ghostMode ? 'Ghost Shield ON' : 'Visible to Friends'}</p>
            <p><strong>Accuracy:</strong> &plusmn;${currentLocation.accuracy}m</p>
          </div>
        </div>
      `);
    } else {
      userMarkerRef.current.setLatLng(userLatLng);
      userMarkerRef.current.setIcon(userIcon);
    }

    // Calibrated Live Location Circle Radius (Thora Chota / Compact by default)
    const effectiveRadius =
      circleSize === 'compact'
        ? Math.min(Math.max(currentLocation.accuracy * 0.4, 9), 16)
        : Math.min(Math.max(currentLocation.accuracy, 18), 38);

    // Accuracy / Live Location Halo Circle
    if (!accuracyCircleRef.current) {
      accuracyCircleRef.current = L.circle(userLatLng, {
        radius: effectiveRadius,
        color: isSharing ? '#06b6d4' : '#f59e0b',
        fillColor: isSharing ? '#0891b2' : '#d97706',
        fillOpacity: circleSize === 'compact' ? 0.22 : 0.16,
        weight: circleSize === 'compact' ? 1.4 : 1.6,
      }).addTo(map);
    } else {
      accuracyCircleRef.current.setLatLng(userLatLng);
      accuracyCircleRef.current.setRadius(effectiveRadius);
      accuracyCircleRef.current.setStyle({
        color: isSharing ? '#06b6d4' : '#f59e0b',
        fillColor: isSharing ? '#0891b2' : '#d97706',
        fillOpacity: circleSize === 'compact' ? 0.22 : 0.16,
        weight: circleSize === 'compact' ? 1.4 : 1.6,
      });
    }
  }, [currentLocation, currentUser, mapReady, circleSize]);

  // 3. Update Friends Markers & Polyline
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    const currentMarkers = friendMarkersRef.current;
    const activeFriendIds = new Set<string>();

    friends.forEach((friend) => {
      const isSelected = selectedFriendId === friend.userId;
      // Requirement: Default show only YOU. Show friend pin ONLY when selected!
      if (!isSelected || !friend.location || friend.isShielded || !friend.user.appLocationStatus) {
        if (currentMarkers[friend.userId]) {
          currentMarkers[friend.userId].remove();
          delete currentMarkers[friend.userId];
        }
        return;
      }

      activeFriendIds.add(friend.userId);
      const latLng: L.LatLngExpression = [friend.location.latitude, friend.location.longitude];

      // Green Teardrop Location Pin for Friend matching Google Maps style in 1.jpg
      const friendFirstName = friend.user.name.split(' ')[0];
      const friendIconHtml = `
        <div class="friend-map-pin" style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 70px; cursor: pointer;">
          <!-- Top Compact Label -->
          <div style="background: rgba(21, 128, 61, 0.95); color: #ffffff; font-weight: 800; font-size: 10px; padding: 1.5px 7px; border-radius: 9999px; border: 1.5px solid #86efac; box-shadow: 0 2px 8px rgba(34,197,94,0.6); white-space: nowrap; margin-bottom: 2px; display: flex; align-items: center; gap: 3.5px;">
            <span style="width: 5px; height: 5px; border-radius: 50%; background: #4ade80; box-shadow: 0 0 5px #4ade80;"></span>
            <span>${friendFirstName}</span>
          </div>

          <!-- Green Teardrop Location Pin with Circular Hole (matching 1.jpg) -->
          <div style="position: relative; width: 34px; height: 42px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; bottom: 2px; width: 34px; height: 34px; border-radius: 50%; background: rgba(34, 197, 94, 0.35); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <svg width="32" height="42" viewBox="0 0 34 42" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 3px 6px rgba(21,128,61,0.6));">
              <path d="M17 0C7.61 0 0 7.61 0 17C0 27.5 17 42 17 42C17 42 34 27.5 34 17C34 7.61 26.39 0 17 0Z" fill="#22c55e" stroke="#14532d" stroke-width="2"/>
              <circle cx="17" cy="17" r="7.5" fill="#ffffff" stroke="#14532d" stroke-width="1.8"/>
            </svg>
          </div>
        </div>
      `;

      const friendIcon = L.divIcon({
        className: 'friend-pin-icon',
        html: friendIconHtml,
        iconSize: [70, 56],
        iconAnchor: [35, 54],
      });

      if (!currentMarkers[friend.userId]) {
        const marker = L.marker(latLng, { icon: friendIcon, zIndexOffset: 950 }).addTo(map);
        marker.on('click', () => {
          onSelectFriend(friend.userId);
        });
        currentMarkers[friend.userId] = marker;
      } else {
        currentMarkers[friend.userId].setLatLng(latLng);
        currentMarkers[friend.userId].setIcon(friendIcon);
        currentMarkers[friend.userId].setZIndexOffset(950);
      }
    });

    // Clean up markers that are no longer active
    Object.keys(currentMarkers).forEach((id) => {
      if (!activeFriendIds.has(id)) {
        currentMarkers[id].remove();
        delete currentMarkers[id];
      }
    });
  }, [friends, selectedFriendId, currentLocation, mapReady]);

  // 3.5 Dynamic Google Maps Places & Points of Interest (Reveal More Places as User Zooms In)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    const currentPoiMarkers = poiMarkersRef.current;
    const activePoiIds = new Set<string>();

    // Filter POIs that qualify for the current zoom level
    const visiblePois = SHARIF_COLONY_POIS.filter((poi) => currentZoom >= poi.minZoom);

    // Get SVG icon markup based on category/iconType matching authentic Google Maps icons
    const getCategoryIconSvg = (poi: GoogleMapPOI) => {
      switch (poi.category) {
        case 'restaurant':
          return `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2"/><path d="M15 2v18"/><path d="M8 2v10a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V2"/><path d="M10 14v6"/></svg>`;
        case 'education':
          return `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`;
        case 'hospital':
          return `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
        case 'park':
          return `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 10v.2A3 3 0 0 1 8.9 16H5a3 3 0 0 1-1-5.8V10a3 3 0 0 1 6 0Z"/><path d="M7 16v6"/><path d="M13 19v3"/><path d="M12 19h8.3a1 1 0 0 0 .7-1.7L18 14h.3a1 1 0 0 0 .7-1.7L16 9h.2a1 1 0 0 0 .8-1.7L13 3l-1.4 1.4"/></svg>`;
        case 'shopping':
          return `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`;
        case 'landmark':
          return `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;
        case 'government':
          return `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22h16"/><path d="M6 18v-8"/><path d="M10 18v-8"/><path d="M14 18v-8"/><path d="M18 18v-8"/><path d="m2 6 10-4 10 4v2H2Z"/></svg>`;
        case 'transit':
          return `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.6 19 6 17.7 6H6.3C5 6 3.9 6.6 3.6 7.8L2.2 12.8c-.1.4-.2.8-.2 1.2 0 .4.1.8.2 1.2.3 1.1.8 2.8.8 2.8h3"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>`;
        default:
          return `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;
      }
    };

    visiblePois.forEach((poi) => {
      activePoiIds.add(poi.id);
      const isAreaLabel = poi.category === 'residence' && currentZoom < 16;
      const isHighZoom = currentZoom >= 16;

      let poiHtml = '';

      if (isAreaLabel) {
        // Broad Google Maps Area Label (e.g. SHARIF COLONY, OFFICER COLONY)
        poiHtml = `
          <div class="google-poi-badge" style="display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: auto; cursor: pointer; transform: translate(-50%, -50%);">
            <span style="font-family: 'Roboto', -apple-system, sans-serif; font-size: ${currentZoom >= 15 ? '13px' : '11px'}; font-weight: 800; color: #1e293b; text-transform: uppercase; letter-spacing: 1.5px; text-shadow: 0 0 4px #ffffff, 0 0 8px #ffffff, 0 1px 2px rgba(255,255,255,0.9); white-space: nowrap;">
              ${poi.name}
            </span>
          </div>
        `;
      } else {
        // Distinctive Google Maps Point of Interest Icon & Name Label
        poiHtml = `
          <div class="google-poi-badge" style="display: flex; align-items: center; gap: 6px; pointer-events: auto; cursor: pointer; transform: translate(-8px, -12px); max-width: 240px;">
            <!-- Circular POI Badge matching authentic Google Maps Colors -->
            <div style="width: 24px; height: 24px; border-radius: 50%; background-color: ${poi.badgeColor}; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.3); border: 1.5px solid #ffffff; shrink-0;">
              ${getCategoryIconSvg(poi)}
            </div>

            <!-- Authentic Google Maps POI Label -->
            <div style="display: flex; flex-direction: column; line-height: 1.15; filter: drop-shadow(0 1px 2px rgba(255,255,255,0.9));">
              <span style="font-family: 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif; font-size: ${isHighZoom ? '11.5px' : '10.5px'}; font-weight: 700; color: ${poi.textColor}; white-space: nowrap; text-shadow: -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff, 0 0 6px #ffffff;">
                ${poi.name}
              </span>
            </div>
          </div>
        `;
      }

      const poiIcon = L.divIcon({
        className: 'poi-marker-icon',
        html: poiHtml,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      if (!currentPoiMarkers[poi.id]) {
        const marker = L.marker([poi.lat, poi.lng], { icon: poiIcon, zIndexOffset: 300 }).addTo(map);
        marker.on('click', () => {
          setSelectedPoi(poi);
        });
        currentPoiMarkers[poi.id] = marker;
      } else {
        currentPoiMarkers[poi.id].setLatLng([poi.lat, poi.lng]);
        currentPoiMarkers[poi.id].setIcon(poiIcon);
      }
    });

    // Remove POIs that are outside the current zoom threshold
    Object.keys(currentPoiMarkers).forEach((id) => {
      if (!activePoiIds.has(id)) {
        currentPoiMarkers[id].remove();
        delete currentPoiMarkers[id];
      }
    });
  }, [currentZoom, mapReady]);

  // Distance calculation helper (Haversine formula in meters)
  const getDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3;
    const p1 = (lat1 * Math.PI) / 180;
    const p2 = (lat2 * Math.PI) / 180;
    const dp = ((lat2 - lat1) * Math.PI) / 180;
    const dl = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dp / 2) * Math.sin(dp / 2) +
      Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  // Segment bearing helper to rotate the navigation arrowhead along the road (in degrees)
  const calculateSegmentBearing = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const y = Math.sin(dLon) * Math.cos((lat2 * Math.PI) / 180);
    const x =
      Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
      Math.sin((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.cos(dLon);
    let brng = (Math.atan2(y, x) * 180) / Math.PI;
    return (brng + 360) % 360;
  };

  // Clean up all primary route layers
  const clearRedRouteLayers = () => {
    if (routeOutlineRef.current) {
      routeOutlineRef.current.remove();
      routeOutlineRef.current = null;
    }
    if (routeMainRef.current) {
      routeMainRef.current.remove();
      routeMainRef.current = null;
    }
    if (routeInnerRef.current) {
      routeInnerRef.current.remove();
      routeInnerRef.current = null;
    }
    activeRedCoordsRef.current = [];
    setRouteData(null);
  };

  // Render or smooth-update the Google Maps road route (True Google Maps Blue Route along the road without red arrow)
  const updateOrRenderRedRoute = (
    coords: [number, number][],
    distanceMeters: number,
    durationSec: number,
    summaryName: string,
    friendName: string,
    forceRedraw: boolean = false
  ) => {
    const map = mapInstanceRef.current;
    if (!map || coords.length < 2) return;

    activeRedCoordsRef.current = coords;

    const distText =
      distanceMeters >= 1000
        ? `${(distanceMeters / 1000).toFixed(1)} km`
        : `${Math.round(distanceMeters)} m`;
    const durMins = Math.max(1, Math.round(durationSec / 60));
    const durText = `${durMins} min`;

    // IN-PLACE UPDATE: If polylines already exist on map, update coordinates smoothly
    if (!forceRedraw && routeOutlineRef.current && routeMainRef.current && routeInnerRef.current) {
      routeOutlineRef.current.setLatLngs(coords);
      routeMainRef.current.setLatLngs(coords);
      routeInnerRef.current.setLatLngs(coords);

      setRouteData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          distanceFormatted: distText,
          durationFormatted: durText,
          routeSummary: summaryName,
          friendName: friendName,
          bounds: L.latLngBounds(coords),
        };
      });
      return;
    }

    // Clean any previous layers before initial creation
    if (routeOutlineRef.current) routeOutlineRef.current.remove();
    if (routeMainRef.current) routeMainRef.current.remove();
    if (routeInnerRef.current) routeInnerRef.current.remove();

    // 1. Google Maps Navigation Route Casing (Deep Blue outline for crisp contrast on satellite/street tiles)
    routeOutlineRef.current = L.polyline(coords, {
      color: '#1a56db',
      weight: 9,
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map);

    // 2. Google Maps Navigation Route Core (Authentic Google Maps Royal Blue #4285F4)
    routeMainRef.current = L.polyline(coords, {
      color: '#3b82f6',
      weight: 6.5,
      opacity: 1,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map);

    // 3. Inner Center Line for high-definition clarity
    routeInnerRef.current = L.polyline(coords, {
      color: '#60a5fa',
      weight: 2.5,
      opacity: 0.9,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map);

    setRouteData({
      distanceFormatted: distText,
      durationFormatted: durText,
      routeSummary: summaryName,
      friendName: friendName,
      bounds: L.latLngBounds(coords),
    });
  };

  // Google Maps Shortest Road Route Lifecycle Handler
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    // Targeted friend for navigation route (only when a friend is explicitly selected)
    const targetFriend = selectedFriendId
      ? friends.find((f) => f.userId === selectedFriendId && f.location) ||
        friends.find((f) => f.userId === selectedFriendId)
      : null;

    if (!targetFriend || !targetFriend.location || !targetFriend.user.appLocationStatus || targetFriend.isShielded) {
      clearRedRouteLayers();
      lastCalculatedStartRef.current = null;
      lastCalculatedEndRef.current = null;
      lastTargetFriendIdRef.current = null;
      return;
    }

    const startLat = currentLocation.latitude;
    const startLng = currentLocation.longitude;
    const endLat = targetFriend.location.latitude;
    const endLng = targetFriend.location.longitude;
    const friendFirstName = targetFriend.user.name.split(' ')[0];

    // Real-time instantaneous vertex anchoring: if route already exists, update its endpoints immediately
    if (activeRedCoordsRef.current.length >= 2) {
      const updatedLivePoints: [number, number][] = [...activeRedCoordsRef.current];
      updatedLivePoints[0] = [startLat, startLng];
      updatedLivePoints[updatedLivePoints.length - 1] = [endLat, endLng];
      activeRedCoordsRef.current = updatedLivePoints;

      if (routeOutlineRef.current) routeOutlineRef.current.setLatLngs(updatedLivePoints);
      if (routeMainRef.current) routeMainRef.current.setLatLngs(updatedLivePoints);
      if (routeInnerRef.current) routeInnerRef.current.setLatLngs(updatedLivePoints);
    }

    // Accurate Shortest Distance
    const shortestDist = targetFriend.distanceMeters || Math.round(getDistanceMeters(startLat, startLng, endLat, endLng));
    const walkingSec = targetFriend.etaWalkingMinutes ? targetFriend.etaWalkingMinutes * 60 : Math.round(shortestDist / 1.35);
    const drivingSec = targetFriend.etaDrivingMinutes ? targetFriend.etaDrivingMinutes * 60 : Math.max(30, Math.round(shortestDist / 8.5));
    const currentDur = routeMode === 'driving' ? drivingSec : walkingSec;

    // If both users are in the same room (distance <= 5 meters)
    if (shortestDist <= 5) {
      const roomPoints: [number, number][] = [
        [startLat, startLng],
        [endLat, endLng],
      ];
      updateOrRenderRedRoute(
        roomPoints,
        0,
        0,
        'Arrived • Same Room (0m)',
        friendFirstName,
        false
      );
      if (onDirectionsUpdated) {
        onDirectionsUpdated({
          steps: [{
            instruction: `Arrived at ${targetFriend.user.name}'s location in the same room.`,
            distance: '0 m',
            duration: '0 min',
            startLocation: [startLat, startLng],
            endLocation: [endLat, endLng],
          }],
          summary: 'Arrived • Same Room',
          distanceText: '0 m',
          durationText: '0 min',
          startAddress: 'Your Location',
          endAddress: `${targetFriend.user.name}'s Location`,
          source: 'fallback',
        });
      }
      return;
    }

    const startMoved = lastCalculatedStartRef.current
      ? getDistanceMeters(startLat, startLng, lastCalculatedStartRef.current.lat, lastCalculatedStartRef.current.lng)
      : 999;
    const endMoved = lastCalculatedEndRef.current
      ? getDistanceMeters(endLat, endLng, lastCalculatedEndRef.current.lat, lastCalculatedEndRef.current.lng)
      : 999;
    const friendChanged = lastTargetFriendIdRef.current !== targetFriend.userId;
    const modeChanged = lastRouteModeRef.current !== routeMode;
    const hasMovedSignificantly = startMoved > 2 || endMoved > 2;

    // Recalculate if friend changed, travel mode changed, or either user moved (>2m)
    if (!friendChanged && !modeChanged && !hasMovedSignificantly && activeRedCoordsRef.current.length >= 2) {
      return;
    }

    // 2. TARGET FRIEND CHANGE, OR MODE TOGGLE (Calculated once)
    lastCalculatedStartRef.current = { lat: startLat, lng: startLng };
    lastCalculatedEndRef.current = { lat: endLat, lng: endLng };
    lastTargetFriendIdRef.current = targetFriend.userId;
    lastRouteModeRef.current = routeMode;

    if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);

    let isCancelled = false;
    const controller = new AbortController();

    // Fetch the real shortest road path (immediate on first load/change, 200ms on continuous movement)
    const delay = activeRedCoordsRef.current.length === 0 || friendChanged || modeChanged ? 0 : 200;

    fetchTimeoutRef.current = setTimeout(async () => {
      if (isCancelled) return;

      try {
        const result = await fetchGoogleDirections(
          startLat,
          startLng,
          endLat,
          endLng,
          routeMode,
          controller.signal
        );

        if (isCancelled || !result) return;

        // Connect user location and friend location seamlessly with road path
        const streetPoints: [number, number][] = [
          [startLat, startLng],
          ...result.coordinates,
          [endLat, endLng],
        ];

        const streetSummary =
          result.summary || (routeMode === 'driving' ? 'Shortest Driving Route' : 'Shortest Walking Route');

        updateOrRenderRedRoute(
          streetPoints,
          result.distanceMeters,
          result.durationSeconds,
          streetSummary,
          friendFirstName,
          false
        );

        // Notify parent application with full turn-by-turn direction steps
        if (onDirectionsUpdated) {
          onDirectionsUpdated({
            steps: result.steps,
            summary: streetSummary,
            distanceText: result.distanceText,
            durationText: result.durationText,
            startAddress: result.startAddress || 'Your Location',
            endAddress: result.endAddress || `${targetFriend.user.name}'s Location`,
            source: result.source,
          });
        }
      } catch (err: any) {
        if (isCancelled || err?.name === 'AbortError') return;

        // Fallback smooth avenue path
        const streetAvenuePoints: [number, number][] = [
          [startLat, startLng],
          [startLat, (startLng + endLng) / 2],
          [endLat, (startLng + endLng) / 2],
          [endLat, endLng],
        ];
        updateOrRenderRedRoute(
          streetAvenuePoints,
          shortestDist,
          currentDur,
          routeMode === 'driving' ? 'Shortest Drive' : 'Shortest Walk',
          friendFirstName,
          false
        );
      }
    }, delay);

    return () => {
      isCancelled = true;
      controller.abort();
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
    };
  }, [friends, selectedFriendId, currentLocation, currentUser.appLocationStatus, routeMode, mapReady]);

  // Initial Auto-Fit & Dynamic Centering on Real Device Location
  const hasCenteredOnUserRef = useRef<boolean>(false);
  const lastCenteredCoordsRef = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    if (currentLocation.latitude && currentLocation.longitude) {
      const isFirstFix = !hasCenteredOnUserRef.current;
      const prevCoords = lastCenteredCoordsRef.current;
      const hasSignificantJump =
        prevCoords &&
        Math.hypot(
          currentLocation.latitude - prevCoords.lat,
          currentLocation.longitude - prevCoords.lng
        ) > 0.001; // > ~100m shift from initial fallback to real GPS

      if (isFirstFix || (hasSignificantJump && !isMovedAway)) {
        const activeFriends = friends.filter((f) => !f.isShielded && f.location);
        if (activeFriends.length > 0 && isFirstFix) {
          const bounds = L.latLngBounds([
            [currentLocation.latitude, currentLocation.longitude],
            ...activeFriends.map((f) => [f.location!.latitude, f.location!.longitude] as [number, number]),
          ]);
          map.fitBounds(bounds, { padding: [70, 70], maxZoom: 16 });
        } else {
          map.flyTo([currentLocation.latitude, currentLocation.longitude], 17, {
            duration: isFirstFix ? 0.4 : 0.8,
          });
        }
        hasCenteredOnUserRef.current = true;
        lastCenteredCoordsRef.current = {
          lat: currentLocation.latitude,
          lng: currentLocation.longitude,
        };
      }
    }
  }, [mapReady, currentLocation.latitude, currentLocation.longitude, isRealGpsFixed, isMovedAway, friends]);

  // Track when user moves or pans away from their current location
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    const checkMapCenter = () => {
      const center = map.getCenter();
      const dist = map.distance(center, [currentLocation.latitude, currentLocation.longitude]);
      // If map center is more than 50 meters away from user's current coordinates, mark as moved away
      setIsMovedAway(dist > 50);
    };

    map.on('moveend', checkMapCenter);
    map.on('dragend', checkMapCenter);
    checkMapCenter();

    return () => {
      map.off('moveend', checkMapCenter);
      map.off('dragend', checkMapCenter);
    };
  }, [mapReady, currentLocation.latitude, currentLocation.longitude]);

  const handleCenterOnUser = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([currentLocation.latitude, currentLocation.longitude], 17, {
        duration: 0.9,
      });
      setIsMovedAway(false);
    }
  };

  const handleZoomIn = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomIn(1, { animate: true });
    }
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomOut(1, { animate: true });
    }
  };

  const handleFitAllPins = () => {
    if (!mapInstanceRef.current) return;
    const activeFriends = friends.filter((f) => !f.isShielded && f.location);
    const coords: [number, number][] = [
      [currentLocation.latitude, currentLocation.longitude],
      ...activeFriends.map((f) => [f.location!.latitude, f.location!.longitude] as [number, number]),
    ];
    if (coords.length > 1) {
      mapInstanceRef.current.fitBounds(L.latLngBounds(coords), {
        padding: [80, 80],
        maxZoom: 16,
      });
    } else {
      mapInstanceRef.current.flyTo([currentLocation.latitude, currentLocation.longitude], 16);
    }
  };

  const handleCenterOnRoute = () => {
    if (!mapInstanceRef.current) return;
    if (routeData && routeData.bounds) {
      mapInstanceRef.current.fitBounds(routeData.bounds, {
        padding: [80, 80],
        maxZoom: 17,
      });
    } else if (routeMainRef.current) {
      mapInstanceRef.current.fitBounds(routeMainRef.current.getBounds(), {
        padding: [80, 80],
        maxZoom: 17,
      });
    }
  };

  const selectedFriend = friends.find((f) => f.userId === selectedFriendId);

  // Determine active friend for the top distance card (selected only)
  const activeFriend = selectedFriendId
    ? friends.find((f) => f.userId === selectedFriendId)
    : null;

  // Center map on selected friend and route ONLY once when selectedFriendId changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;
    
    if (!selectedFriendId) {
      lastFramedFriendIdRef.current = null;
      return;
    }

    // Only fit bounds if user selected a DIFFERENT contact
    if (lastFramedFriendIdRef.current === selectedFriendId) return;
    lastFramedFriendIdRef.current = selectedFriendId;

    const friend = friends.find((f) => f.userId === selectedFriendId);
    if (friend && friend.location) {
      const bounds = L.latLngBounds([
        [currentLocation.latitude, currentLocation.longitude],
        [friend.location.latitude, friend.location.longitude],
      ]);
      map.fitBounds(bounds, { padding: [80, 80], maxZoom: 16 });
    }
  }, [selectedFriendId, mapReady]);

  const getProximityStatus = (distanceMeters?: number) => {
    if (distanceMeters === undefined) {
      return {
        label: 'CALCULATING',
        color: 'text-slate-400',
        bg: 'bg-slate-850',
        border: 'border-slate-700',
        dot: 'bg-slate-400',
        description: 'Syncing coordinates...'
      };
    }
    if (distanceMeters <= 300) {
      return {
        label: 'VERY CLOSE (NEARBY)',
        color: 'text-emerald-300',
        bg: 'bg-emerald-950/90',
        border: 'border-emerald-500/50',
        dot: 'bg-emerald-400',
        description: 'Within immediate walking steps (<300m)'
      };
    }
    if (distanceMeters <= 800) {
      return {
        label: 'NEARBY (<800m)',
        color: 'text-emerald-400',
        bg: 'bg-emerald-950/80',
        border: 'border-emerald-500/40',
        dot: 'bg-emerald-400',
        description: 'Short walking distance'
      };
    }
    if (distanceMeters <= 2000) {
      return {
        label: 'IN VICINITY (~1-2km)',
        color: 'text-cyan-300',
        bg: 'bg-cyan-950/80',
        border: 'border-cyan-500/40',
        dot: 'bg-cyan-400',
        description: 'In the same neighborhood'
      };
    }
    return {
      label: 'FAR AWAY (>2km)',
      color: 'text-amber-300',
      bg: 'bg-amber-950/80',
      border: 'border-amber-500/40',
      dot: 'bg-amber-400',
      description: 'Commute / driving needed'
    };
  };

  const proximity = getProximityStatus(activeFriend?.distanceMeters);

  return (
    <div
      id="live-map-wrapper"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative w-full h-full bg-[#0b141a] overflow-hidden select-none touch-none"
    >
      {/* Rotatable Full-Screen Map Canvas Wrapper */}
      <div
        className="absolute w-[140%] h-[140%] -left-[20%] -top-[20%] z-0 pointer-events-auto transition-transform duration-150 ease-out"
        style={{
          transform: `rotate(${mapRotation}deg)`,
          transformOrigin: 'center center',
        }}
      >
        <div ref={mapContainerRef} className="w-full h-full" />
      </div>

      {/* Map Interactive Canvas Floating Overlay Container (z-30 to stay above Leaflet tiles) */}
      <div className="absolute inset-0 z-30 pointer-events-none">
        {/* Floating Rotation Indicator during two-finger rotation */}
        {isRotatingWithFinger && (
          <div className="pointer-events-none absolute top-14 left-1/2 -translate-x-1/2 z-40 px-3 py-1.5 rounded-full bg-black/90 border border-sky-400 text-sky-300 text-xs font-mono font-bold shadow-2xl flex items-center gap-2 animate-pulse">
            <Compass className="w-3.5 h-3.5 text-sky-400" />
            <span>Rotating: {mapRotation}°</span>
          </div>
        )}

        {/* Location Turned OFF Warning Banner */}
        {!currentUser.appLocationStatus && (
          <div className="pointer-events-auto absolute top-14 sm:top-18 left-2 right-2 sm:left-4 sm:right-auto sm:max-w-sm z-35 animate-in fade-in slide-in-from-top-3 duration-200">
            <div className="p-3.5 rounded-2xl bg-black border-2 border-amber-400 shadow-2xl backdrop-blur-xl text-white space-y-2.5">
              <div className="flex items-start gap-2.5">
                <div className="p-1.5 rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/40 shrink-0">
                  <EyeOff className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wide">Location is Turned OFF</h4>
                  <p className="text-[11px] text-zinc-300 mt-0.5 leading-snug">
                    Turn on your location to interact with NaviLink, navigate along roads, and share live proximity with contacts.
                  </p>
                </div>
              </div>
              {onToggleMasterLocation && (
                <button
                  id="btn-map-turn-on-location"
                  type="button"
                  onClick={onToggleMasterLocation}
                  className="w-full py-2 px-3 rounded-xl bg-black hover:bg-white text-white hover:text-black border border-amber-400 text-xs font-bold transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
                >
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  <span>Turn ON Location Now</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Active Selected Contact Navigation & Route Card or Offline Status Alert */}
        {activeFriend && (
          <div className="absolute top-14 sm:top-4 left-2 sm:left-4 right-14 sm:right-auto sm:w-96 z-30 pointer-events-auto animate-in fade-in slide-in-from-top-3 duration-200">
            <div className="p-3 sm:p-3.5 rounded-2xl bg-black border border-sky-400 shadow-2xl backdrop-blur-xl flex flex-col gap-2">
              {/* Header: Avatar, Name, App ID & Close Button */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative shrink-0">
                    <img
                      src={activeFriend.user.avatarUrl}
                      alt={activeFriend.user.name}
                      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border-2 ${
                        activeFriend.user.appLocationStatus ? 'border-sky-400' : 'border-zinc-500'
                      }`}
                    />
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 sm:w-3 sm:h-3 border-2 border-black rounded-full ${
                        activeFriend.user.appLocationStatus ? 'bg-emerald-400' : 'bg-zinc-500'
                      }`}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-xs sm:text-sm font-bold text-white truncate">
                        {activeFriend.user.name}
                      </h3>
                      <span
                        className={`text-[9px] sm:text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-full border shrink-0 ${
                          activeFriend.user.appLocationStatus
                            ? 'text-emerald-400 bg-emerald-950/80 border-emerald-500'
                            : 'text-zinc-400 bg-zinc-900 border-zinc-700'
                        }`}
                      >
                        {activeFriend.user.appLocationStatus ? 'Online' : 'Offline'}
                      </span>
                    </div>

                    {activeFriend.user.appLocationStatus ? (
                      <div className="flex items-center gap-1.5 text-xs mt-0.5">
                        <span className="text-sky-300 font-mono font-bold text-[11px] sm:text-xs flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-sky-400" />
                          {activeFriend.formattedDistance ||
                            (activeFriend.distanceMeters !== undefined
                              ? activeFriend.distanceMeters > 1000
                                ? `${(activeFriend.distanceMeters / 1000).toFixed(1)} km`
                                : `${Math.round(activeFriend.distanceMeters)} m`
                              : 'Locating...')}
                        </span>
                        <span className="text-zinc-600">•</span>
                        <span className="text-zinc-300 text-[10px] sm:text-[11px] font-mono">
                          ~{routeMode === 'driving' ? (activeFriend.etaDrivingMinutes || 1) : (activeFriend.etaWalkingMinutes || 4)}m {routeMode === 'driving' ? 'drive' : 'walk'}
                        </span>
                      </div>
                    ) : (
                      <p className="text-[10px] sm:text-[11px] text-amber-300 mt-0.5 font-medium">
                        User is offline (Location sharing is off)
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => onSelectFriend(null)}
                  title="Close Navigation"
                  className="p-1.5 rounded-xl bg-black text-white border border-sky-400 hover:bg-zinc-900 transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>

              {/* Travel Mode Toggle & Re-center Route Button (When Online) */}
              {activeFriend.user.appLocationStatus && (
                <div className="flex items-center justify-between gap-1.5 pt-1.5 border-t border-zinc-800">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setRouteMode('walking')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] transition-all cursor-pointer ${
                        routeMode === 'walking'
                          ? 'bg-white text-black border border-white font-bold shadow'
                          : 'bg-black text-white border border-sky-400 hover:bg-zinc-900'
                      }`}
                    >
                      <Footprints className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      <span>Walk</span>
                    </button>
                    <button
                      onClick={() => setRouteMode('driving')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] transition-all cursor-pointer ${
                        routeMode === 'driving'
                          ? 'bg-white text-black border border-white font-bold shadow'
                          : 'bg-black text-white border border-sky-400 hover:bg-zinc-900'
                      }`}
                    >
                      <Car className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      <span>Drive</span>
                    </button>
                  </div>

                  <button
                    onClick={handleCenterOnRoute}
                    title="Focus Map on Route"
                    className="px-2.5 py-1 rounded-lg bg-black text-white border border-sky-400 hover:bg-zinc-900 active:bg-white active:text-black text-[10px] sm:text-[11px] font-semibold flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                  >
                    <Route className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-sky-400" />
                    <span>Focus Route</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Selected Google Maps Place / POI Detail Card */}
        {selectedPoi && (
          <div className="absolute bottom-20 left-2 right-2 sm:left-4 sm:right-auto sm:w-96 z-30 animate-in fade-in slide-in-from-bottom-3 duration-200">
            <div className="p-3.5 sm:p-4 rounded-2xl bg-black border border-sky-400 shadow-2xl backdrop-blur-xl">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 border border-white/20 shadow-md"
                    style={{ backgroundColor: selectedPoi.badgeColor }}
                  >
                    <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-100 text-xs sm:text-sm leading-tight">
                      {selectedPoi.name}
                    </h4>
                    {selectedPoi.subText && (
                      <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                        {selectedPoi.subText}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] sm:text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-zinc-900 text-sky-300 border border-zinc-700">
                        {selectedPoi.category}
                      </span>
                      {selectedPoi.rating && (
                        <span className="text-[10px] sm:text-[11px] text-amber-400 font-bold flex items-center gap-1">
                          ★ {selectedPoi.rating}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPoi(null)}
                  className="bg-black text-white border border-sky-400 hover:bg-zinc-900 rounded-lg p-1 text-xs"
                >
                  ✕
                </button>
              </div>

              {selectedPoi.subText && (
                <p className="text-[11px] sm:text-xs text-slate-300 mt-2 bg-zinc-900/80 p-2 rounded-lg border border-zinc-800">
                  {selectedPoi.subText}
                </p>
              )}

              <div className="mt-2.5 flex items-center justify-between pt-1 border-t border-zinc-800 text-[10px] sm:text-[11px] text-slate-400 font-mono">
                <span>Coords: {selectedPoi.lat.toFixed(4)}, {selectedPoi.lng.toFixed(4)}</span>
                <button
                  onClick={() => {
                    if (mapInstanceRef.current) {
                      mapInstanceRef.current.flyTo([selectedPoi.lat, selectedPoi.lng], 18, { duration: 0.8 });
                    }
                  }}
                  className="px-2.5 py-1 rounded-lg bg-black text-white border border-sky-400 hover:bg-zinc-900 font-bold text-xs transition-colors"
                >
                  Zoom In
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Unified Control Stack on Right Side with Clean Black/White/SkyBlue Buttons */}
        <div className="pointer-events-auto absolute top-14 sm:top-18 right-2 sm:right-3.5 z-30 flex flex-col items-end gap-2">
          {/* 1. Compass Bearing & North Reset Knob (Tap to reset North, Bearing rotates smoothly) */}
          <button
            id="btn-map-compass"
            onClick={handleResetRotation}
            title={`Compass (Bearing: ${mapRotation}°). Rotate map using two fingers on touch screen or click to reset North.`}
            className="p-2.5 sm:p-3 bg-black border border-sky-400 rounded-xl sm:rounded-2xl shadow-xl hover:bg-zinc-900 transition-all active:scale-95 cursor-pointer flex flex-col items-center gap-0.5 group"
          >
            <div
              className="w-6 h-6 flex items-center justify-center transition-transform duration-200"
              style={{ transform: `rotate(${-mapRotation}deg)` }}
            >
              <Compass className="w-5 h-5 text-sky-400 group-hover:scale-110 transition-transform" />
            </div>
            <span className="text-[9px] font-mono text-zinc-400 group-hover:text-white">
              {mapRotation}°
            </span>
          </button>

          {/* 2. Satellite View Toggle Button */}
          <button
            id="btn-single-satellite-toggle"
            onClick={() => {
              setMapTheme((prev) => (prev === 'satellite' ? 'streets' : 'satellite'));
            }}
            title={mapTheme === 'satellite' ? 'Switch to Street Map' : 'Switch to Satellite View'}
            className={`flex items-center justify-center gap-1.5 p-2 sm:px-3 sm:py-2 rounded-xl sm:rounded-2xl border shadow-xl transition-all active:scale-95 cursor-pointer text-xs ${
              mapTheme === 'satellite'
                ? 'bg-white text-black border-white font-bold'
                : 'bg-black text-white border-sky-400 hover:bg-zinc-900'
            }`}
          >
            <Layers className={`w-4 h-4 shrink-0 ${mapTheme === 'satellite' ? 'text-black' : 'text-sky-400'}`} />
            <span className="hidden sm:inline">{mapTheme === 'satellite' ? 'Satellite ON' : 'Satellite'}</span>
          </button>

          {/* 3. My Location Re-center Button */}
          <button
            id="btn-single-my-location"
            onClick={handleCenterOnUser}
            title="Recenter camera on my exact location"
            className={`flex items-center justify-center gap-1.5 p-2 sm:px-3 sm:py-2 rounded-xl sm:rounded-2xl border shadow-xl transition-all active:scale-95 cursor-pointer text-xs ${
              isMovedAway
                ? 'bg-white text-black border-white font-bold animate-pulse'
                : 'bg-black text-white border-sky-400 hover:bg-zinc-900'
            }`}
          >
            <Crosshair className={`w-4 h-4 shrink-0 ${isMovedAway ? 'text-black' : 'text-sky-400'}`} />
            <span className="hidden sm:inline">{isMovedAway ? 'Re-center' : 'My Location'}</span>
          </button>

          {/* 4. Zoom Controls (+ / -) */}
          <div className="flex flex-col rounded-xl sm:rounded-2xl overflow-hidden bg-black border border-sky-400 shadow-xl">
            {/* Zoom In */}
            <button
              id="btn-single-zoom-in"
              onClick={handleZoomIn}
              title="Zoom In (+)"
              aria-label="Zoom in"
              className="flex items-center justify-center w-9 h-8 sm:w-11 sm:h-10 text-white hover:bg-zinc-800 border-b border-zinc-800 transition-colors active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-sky-400" />
            </button>
            {/* Zoom Out */}
            <button
              id="btn-single-zoom-out"
              onClick={handleZoomOut}
              title="Zoom Out (-)"
              aria-label="Zoom out"
              className="flex items-center justify-center w-9 h-8 sm:w-11 sm:h-10 text-white hover:bg-zinc-800 transition-colors active:scale-95 cursor-pointer"
            >
              <Minus className="w-4 h-4 sm:w-5 sm:h-5 text-sky-400" />
            </button>
          </div>

          {/* Route & Friend Fit Auxiliaries */}
          {routeData && (
            <button
              id="btn-center-route"
              onClick={handleCenterOnRoute}
              title="Focus Route"
              className="flex items-center justify-center w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-black border border-sky-400 hover:bg-zinc-900 text-sky-400 shadow-xl transition-all active:scale-95 cursor-pointer"
            >
              <Route className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          )}

          <button
            id="btn-fit-all-pins"
            onClick={handleFitAllPins}
            title="Fit view to markers"
            className="flex items-center justify-center w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-black border border-sky-400 hover:bg-zinc-900 text-sky-400 shadow-xl transition-all active:scale-95 cursor-pointer"
          >
            <Maximize2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Bottom Coordinates Telemetry */}
        <div className="pointer-events-auto absolute bottom-16 sm:bottom-18 left-2 sm:left-4 z-20 flex items-center gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl bg-black border border-sky-400 backdrop-blur-md text-[10px] sm:text-[11px] font-mono text-white shadow-xl">
            <Navigation className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-sky-400 shrink-0" />
            <span className="font-semibold text-white tracking-tight">
              {currentLocation.latitude.toFixed(5)}, {currentLocation.longitude.toFixed(5)}
            </span>
            <span className="text-zinc-600">|</span>
            <span className="text-sky-400 font-bold">&plusmn;{currentLocation.accuracy}m</span>
          </div>
        </div>
      </div>
    </div>
  );
};
