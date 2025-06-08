import WebSocket from 'ws';
import { PlayCommand, PlayResponse } from '../types';
import logger from '../utils/logger';

export class DeviceConnection {
  private ws: WebSocket;
  private deviceId: string;
  private capabilities: string[];
  private lastSeen: Date;

  constructor(ws: WebSocket, deviceId: string, capabilities: string[] = []) {
    this.ws = ws;
    this.deviceId = deviceId;
    this.capabilities = capabilities;
    this.lastSeen = new Date();
    
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.ws.on('close', () => {
      logger.info(`Device ${this.deviceId} disconnected`);
    });

    this.ws.on('error', (error) => {
      logger.error(`WebSocket error for device ${this.deviceId}:`, error);
    });

    this.ws.on('pong', () => {
      this.lastSeen = new Date();
    });
  }

  async sendAnimation(encodedData: Uint8Array): Promise<PlayResponse> {
    if (!this.isDeviceConnected()) {
      throw new Error('Device not connected');
    }

    const message: PlayCommand = {
      type: "play",
      data: Buffer.from(encodedData).toString('base64')
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Device response timeout'));
      }, 5000);

      const handleMessage = (data: WebSocket.Data) => {
        clearTimeout(timeout);
        this.ws.off('message', handleMessage);
        
        try {
          const response: PlayResponse = JSON.parse(data.toString());
          resolve(response);
        } catch {
          // If no response expected, assume success
          resolve({ status: 'playing', started_at: new Date().toISOString() });
        }
      };

      this.ws.on('message', handleMessage);

      this.ws.send(JSON.stringify(message), (error) => {
        if (error) {
          clearTimeout(timeout);
          this.ws.off('message', handleMessage);
          reject(error);
        }
      });
    });
  }

  isDeviceConnected(): boolean {
    return this.ws.readyState === WebSocket.OPEN;
  }

  disconnect(): void {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.close();
    }
  }

  getDeviceId(): string {
    return this.deviceId;
  }

  getCapabilities(): string[] {
    return [...this.capabilities];
  }

  getLastSeen(): Date {
    return this.lastSeen;
  }

  getWebSocket(): WebSocket {
    return this.ws;
  }

  ping(): void {
    if (this.isDeviceConnected()) {
      this.ws.ping();
    }
  }
}