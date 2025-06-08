import { PatternLibrary } from '../patterns/PatternLibrary';
import { DeviceManager } from '../device/DeviceManager';
import { encodeAnimation } from '../encoder/encoderIntegration';
import { NotificationRequest, NotificationResponse } from '../types';

export class NotificationService {
  private patternLibrary: PatternLibrary;
  private deviceManager: DeviceManager;

  constructor(patternLibrary: PatternLibrary, deviceManager: DeviceManager) {
    this.patternLibrary = patternLibrary;
    this.deviceManager = deviceManager;
  }

  async notify(request: NotificationRequest): Promise<NotificationResponse> {
    return this.handleNotification(request);
  }

  async handleNotification(request: NotificationRequest): Promise<NotificationResponse> {
    try {
      let pattern = this.patternLibrary.getPattern(request.pattern_id);
      let patternUsed = request.pattern_id;

      if (!pattern) {
        console.warn(`Pattern not found: ${request.pattern_id}, using fallback`);
        const fallbackId = this.patternLibrary.getFallbackPattern();
        pattern = this.patternLibrary.getPattern(fallbackId);
        patternUsed = fallbackId;

        if (!pattern) {
          return {
            status: "error",
            error: "pattern_not_found"
          };
        }
      }

      if (!this.deviceManager.hasConnectedDevices()) {
        return {
          status: "error",
          error: "device_offline"
        };
      }

      const encodedData = encodeAnimation(pattern.animation);
      this.patternLibrary.incrementUsage(patternUsed);

      try {
        const responses = await this.deviceManager.sendToAllDevices(encodedData);
        
        const successfulResponses = responses.filter(r => r.status === 'playing');
        
        if (successfulResponses.length === 0) {
          return {
            status: "error",
            error: "device_offline"
          };
        }

        return {
          status: "success",
          started_at: successfulResponses[0].started_at || new Date().toISOString(),
          pattern_used: patternUsed
        };

      } catch (deviceError) {
        console.error('Device communication error:', deviceError);
        return {
          status: "error",
          error: "device_offline"
        };
      }

    } catch (encodingError) {
      console.error('Encoding error:', encodingError);
      return {
        status: "error",
        error: "encoding_error" as any
      };
    }
  }

  selectFallbackPattern(patternId: string): string {
    console.warn(`Pattern not found: ${patternId}, using default`);
    return this.patternLibrary.getFallbackPattern();
  }
}