import * as Location from 'expo-location';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';

/**
 * Location Analytics Service
 * 
 * Records ANONYMOUS location events for analytics purposes.
 * - NO user identification is stored
 * - Location is rounded to ~1km accuracy
 * - Used only for understanding geographic app usage
 */

type EventType = 'app_open' | 'login' | 'signup';

interface LocationEvent {
  lat: number;
  lng: number;
  event_type: EventType;
  platform: string;
}

/**
 * Round coordinates to 2 decimal places (~1km grid)
 * This ensures user privacy while still providing useful geographic data
 */
function roundCoordinates(lat: number, lng: number): { lat: number; lng: number } {
  return {
    lat: Math.round(lat * 100) / 100,
    lng: Math.round(lng * 100) / 100,
  };
}

/**
 * Get the current platform
 */
function getPlatform(): string {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  return 'web';
}

/**
 * Request location permission and get approximate location
 * Returns null if permission denied or location unavailable
 */
async function getApproximateLocation(): Promise<{ lat: number; lng: number } | null> {
  try {
    // Check if we already have permission
    const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
    
    let finalStatus = existingStatus;
    
    // Request permission if not already granted
    if (existingStatus !== 'granted') {
      const { status } = await Location.requestForegroundPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[LocationAnalytics] Permission not granted');
      return null;
    }

    // Get location with LOW accuracy (privacy-friendly)
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Low, // ~3km accuracy from device
    });

    // Round to 2 decimals for additional privacy (~1km grid)
    return roundCoordinates(
      location.coords.latitude,
      location.coords.longitude
    );
  } catch (error) {
    console.log('[LocationAnalytics] Error getting location:', error);
    return null;
  }
}

/**
 * Record an anonymous location event
 * 
 * @param eventType - Type of event ('app_open', 'login', 'signup')
 * 
 * This function:
 * 1. Gets approximate location (if permitted)
 * 2. Rounds to ~1km grid
 * 3. Stores event WITHOUT any user identification
 */
export async function recordLocationEvent(eventType: EventType): Promise<void> {
  try {
    const location = await getApproximateLocation();
    
    if (!location) {
      // No location available - that's fine, just skip
      return;
    }

    const event: LocationEvent = {
      lat: location.lat,
      lng: location.lng,
      event_type: eventType,
      platform: getPlatform(),
    };

    // Insert anonymous event (no user_id)
    const { error } = await supabase
      .from('location_events')
      .insert(event);

    if (error) {
      console.log('[LocationAnalytics] Error recording event:', error.message);
    } else {
      console.log('[LocationAnalytics] Recorded', eventType, 'from', location.lat, location.lng);
    }
  } catch (error) {
    // Silent fail - analytics should never break the app
    console.log('[LocationAnalytics] Error:', error);
  }
}

/**
 * Record an app open event
 * Call this when the app is opened/foregrounded
 */
export function recordAppOpen(): void {
  recordLocationEvent('app_open');
}

/**
 * Record a login event
 * Call this after successful login
 */
export function recordLogin(): void {
  recordLocationEvent('login');
}

/**
 * Record a signup event
 * Call this after successful signup
 */
export function recordSignup(): void {
  recordLocationEvent('signup');
}

/**
 * Check if location permission has been granted
 * Useful for showing/hiding location-related UI
 */
export async function hasLocationPermission(): Promise<boolean> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

