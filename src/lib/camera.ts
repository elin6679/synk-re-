/**
 * Singleton Camera Manager to prevent "Device in use" errors 
 * and manage clean context switching between features.
 */

let activeStream: MediaStream | null = null;
let isReleasing = false;
let lastReleaseTime = 0;
let releaseTimeout: any = null;

// Lock to prevent concurrent getUserMedia calls
let acquisitionPromise: Promise<void> | null = null;

const COOLDOWN_MS = 6000; // Increased to 6s for persistent hardware release issues
const ACQUISITION_TIMEOUT = 35000; // 35s timeout

export const cameraManager = {
  /**
   * Serialized acquisition of camera stream with hardware-aware retry logic.
   */
  async getStream(constraints: MediaStreamConstraints, retryCount = 0): Promise<MediaStream> {
    // 1. Mutex: If another getStream is running, wait for it
    while (acquisitionPromise) {
      await acquisitionPromise;
    }

    // Capture the lock
    let resolveAcquisition: () => void;
    acquisitionPromise = new Promise(resolve => { resolveAcquisition = resolve; });

    try {
      const startTime = Date.now();

      // 2. Wait for release cooldown if necessary
      while (isReleasing) {
        if (Date.now() - startTime > ACQUISITION_TIMEOUT) {
          console.error('Camera Manager: Releasing lock timeout, forcing unlock.');
          isReleasing = false;
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // 3. Enforce hardware-level cooldown
      const timeSinceRelease = Date.now() - lastReleaseTime;
      if (timeSinceRelease < COOLDOWN_MS) {
        const waitTime = COOLDOWN_MS - timeSinceRelease;
        console.log(`Camera Manager: Hardware cooling down (${waitTime}ms remaining)`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }

      // 4. Force stop everything before new request
      this.stopStreamSync();
      
      // Driver breathing room - extended for hardware reset
      const preCaptureDelay = 2000 + (retryCount * 500);
      await new Promise(resolve => setTimeout(resolve, preCaptureDelay));

      console.log(`Camera Manager: Executing getUserMedia (Attempt ${retryCount + 1})`);
      
      // Fallback strategy: if it repeatedly fails, relax constraints to the bare minimum
      let finalConstraints = constraints;
      if (retryCount >= 1) {
        console.warn('Camera Manager: Falling back to relaxed constraints.');
        finalConstraints = { video: true };
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia(finalConstraints);
        activeStream = stream;
        
        stream.getTracks().forEach(track => {
          track.onended = () => {
            console.warn('Camera track disconnected by hardware/system');
            if (activeStream === stream) activeStream = null;
          };
        });

        return stream;
      } catch (err: any) {
        // If final retry fails with NotReadableError, return a simulated stream
        if (retryCount >= 3 && (err.name === 'NotReadableError' || err.message?.includes('in use'))) {
          console.warn('Camera Manager: Persistent hardware lock. Returning simulated stream.');
          return this.createSimulatedStream();
        }
        throw err;
      }
    } catch (err: any) {
      console.error(`Camera Manager Error (Attempt ${retryCount + 1}):`, err.name, err.message);

      const isBusy = 
        err.name === 'NotReadableError' || 
        err.name === 'AbortError' || 
        err.message?.toLowerCase().includes('in use') ||
        err.message?.toLowerCase().includes('concurrently');

      if (isBusy && retryCount < 4) {
        // More aggressive exponential backoff
        const backoff = (5000 * Math.pow(1.8, retryCount)) + (Math.random() * 1000);
        console.warn(`Camera Manager: Device BUSY. Attempt ${retryCount + 1} failed. Next retry in ${Math.round(backoff)}ms...`);
        
        // Release the lock before waiting for retry to allow others to potentially call release
        acquisitionPromise = null;
        resolveAcquisition!();
        
        await new Promise(resolve => setTimeout(resolve, backoff));
        return this.getStream(constraints, retryCount + 1);
      }
      
      throw err;
    } finally {
      // Release the lock
      if (acquisitionPromise) {
        acquisitionPromise = null;
        resolveAcquisition!();
      }
    }
  },

  /**
   * Creates a simulated MediaStream using a canvas for when hardware is unavailable.
   */
  createSimulatedStream(): MediaStream {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    
    // Draw a "Simulated Viewport" pattern
    if (ctx) {
      ctx.fillStyle = '#0a0a1a';
      ctx.fillRect(0, 0, 640, 480);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 640; i += 40) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 480); ctx.stroke();
      }
      for (let i = 0; i < 480; i += 40) {
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(640, i); ctx.stroke();
      }
    }

    const stream = (canvas as any).captureStream(10);
    (stream as any).isSimulated = true;
    activeStream = stream;
    return stream;
  },

  /**
   * Stops the stream and initiates a strict hardware cooldown lock.
   */
  stopStream() {
    console.log('Camera Manager: Requesting hardware release.');
    if (releaseTimeout) clearTimeout(releaseTimeout);
    
    isReleasing = true;
    lastReleaseTime = Date.now();
    
    this.stopStreamSync();

    releaseTimeout = setTimeout(() => {
      isReleasing = false;
      releaseTimeout = null;
      console.log('Camera Manager: Hardware release lock expired.');
    }, COOLDOWN_MS);
  },

  /**
   * Brute-force stop all tracks.
   */
  stopStreamSync() {
    if (activeStream) {
      activeStream.getTracks().forEach(track => {
        try {
          track.stop();
          track.enabled = false;
        } catch (e) {
          console.error('Camera Manager: Track stop failed', e);
        }
      });
      activeStream = null;
    }
    
    // As a fail-safe, try to find any orphaned tracks in the browser context if possible
    // (Note: we can't easily find untracked global streams, but stopStreamSync is called frequently)
  }
};
