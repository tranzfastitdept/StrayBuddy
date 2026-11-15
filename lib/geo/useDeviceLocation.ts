"use client";

import { useCallback, useEffect, useRef, useState } from 'react';

export type LocationStatus = 'idle' | 'loading' | 'ready' | 'denied' | 'unavailable';

export interface DeviceLocation {
  lat: number;
  lng: number;
  accuracy: number | null;
  updatedAt: number;
}

export interface UseDeviceLocationResult {
  coords: DeviceLocation | null;
  status: LocationStatus;
  error: string | null;
  /** Ask the browser for a fresh fix (also re-prompts if permission was reset). */
  request: () => void;
}

/**
 * Tracks the current device location and keeps it fresh as the user moves.
 * Safe to call on the server: it falls back to the idle state.
 */
export function useDeviceLocation(options?: { autoStart?: boolean }): UseDeviceLocationResult {
  const autoStart = options?.autoStart ?? true;

  const [coords, setCoords] = useState<DeviceLocation | null>(null);
  const [status, setStatus] = useState<LocationStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const watchId = useRef<number | null>(null);
  const mounted = useRef(true);

  const stop = useCallback(() => {
    if (watchId.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId.current);
    }
    watchId.current = null;
  }, []);

  const request = useCallback(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setStatus('unavailable');
      setError('This browser does not support location.');
      return;
    }

    stop();
    setStatus('loading');
    setError(null);

    const success = (pos: GeolocationPosition) => {
      if (!mounted.current) return;
      setCoords({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : null,
        updatedAt: Date.now(),
      });
      setStatus('ready');
      setError(null);
    };

    const failure = (err: GeolocationPositionError) => {
      if (!mounted.current) return;
      if (err.code === err.PERMISSION_DENIED) {
        setStatus('denied');
        setError('Location permission was blocked.');
      } else if (err.code === err.POSITION_UNAVAILABLE) {
        setStatus('unavailable');
        setError('Your device could not get a location fix.');
      } else {
        setStatus('unavailable');
        setError('Location timed out. Try again.');
      }
      // A live watch that starts failing (permission revoked) is stopped.
      stop();
    };

    const watchOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 0,
    };

    // One immediate fix so the bubble shows at once, then a watch to follow movement.
    navigator.geolocation.getCurrentPosition(success, failure, watchOptions);
    watchId.current = navigator.geolocation.watchPosition(success, failure, watchOptions);
  }, [stop]);

  useEffect(() => {
    mounted.current = true;
    if (autoStart) request();
    return () => {
      mounted.current = false;
      stop();
    };
  }, [autoStart, request, stop]);

  return { coords, status, error, request };
}

/**
 * Human-readable hint for a denied or failed permission, or null when all is well.
 */
export function locationHint(status: LocationStatus, error: string | null): string | null {
  if (status === 'loading') return 'Finding your location…';
  if (status === 'denied') {
    return 'Location is blocked. Turn it on in your browser settings to see yourself on the map.';
  }
  if (status === 'unavailable') return error || 'Location is not available right now.';
  return null;
}
