/**
 * HapticService handles tactile feedback through patterns of vibration.
 */

export const HapticPattern = {
  TAP: 50,
  SUCCESS: [50, 100, 50],
  FAILURE: [100, 50, 100, 50, 100],
  WARNING: [300, 100, 300],
  ROUGH: [10, 10, 10, 10, 10, 10, 10, 10],
  SMOOTH: [5, 5, 5, 5],
  SOFT: 10,
  // Fabric specific patterns
  SILK: [10, 80, 10],
  KNIT: [30, 40, 30, 40, 30],
  DENIM: [80],
  LEATHER: [100, 50, 100],
  FUR: [15, 20, 15, 20, 15],
  COTTON: [40],
  LINEN: [25, 30, 50],
} as const;

type HapticPatternType = typeof HapticPattern;
type HapticPatternKey = keyof HapticPatternType;

class HapticService {
  private lastTriggerTime = 0;
  private readonly THROTTLE_MS = 150;

  isSupported(): boolean {
    return typeof window !== 'undefined' && !!navigator.vibrate;
  }

  isEnabled(): boolean {
    if (typeof window === 'undefined') return true;
    const setting = localStorage.getItem('haptic_enabled');
    return setting === null || setting === 'true';
  }

  setEnabled(enabled: boolean) {
    localStorage.setItem('haptic_enabled', String(enabled));
  }

  vibrate(pattern: number | number[] | readonly number[]) {
    if (!this.isSupported() || !this.isEnabled()) return;

    const now = Date.now();
    if (now - this.lastTriggerTime < this.THROTTLE_MS) return;
    
    this.lastTriggerTime = now;
    
    try {
      navigator.vibrate(pattern as any);
    } catch (e) {
      console.warn('Haptics failed:', e);
    }
  }

  stop() {
    if (typeof window !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(0);
    }
  }

  tap() {
    this.vibrate(HapticPattern.TAP);
  }

  success() {
    this.vibrate(HapticPattern.SUCCESS);
  }

  warning() {
    this.vibrate(HapticPattern.WARNING);
  }

  error() {
    this.vibrate(HapticPattern.FAILURE);
  }

  // Simulate texture feedback
  texture(isRough: boolean) {
    this.vibrate(isRough ? HapticPattern.ROUGH : HapticPattern.SMOOTH);
  }
}

export const hapticService = new HapticService();
