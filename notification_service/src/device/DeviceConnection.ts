import WebSocket from 'ws';
import { PlayCommand, PlayResponse } from '../types';

export class DeviceConnection {
  private ws?: WebSocket;
  private deviceIP: string;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectTimeouts: number[] = [1000, 2000, 4000, 8000, 30000];

  constructor(deviceIP: string) {
    this.deviceIP = deviceIP;
  }

  async connect(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        this.ws = new WebSocket(`ws://${this.deviceIP}:80`);
        
        this.ws.on('open', () => {
          console.log(`Connected to device at ${this.deviceIP}`);
          this.isConnected = true;
          this.reconnectAttempts = 0;
          resolve(true);
        });

        this.ws.on('close', () => {
          console.log(`Disconnected from device at ${this.deviceIP}`);
          this.isConnected = false;
          this.attemptReconnect();
        });

        this.ws.on('error', (error) => {
          console.error(`WebSocket error for ${this.deviceIP}:`, error);
          this.isConnected = false;
          resolve(false);
        });

      } catch (error) {
        console.error(`Failed to connect to ${this.deviceIP}:`, error);
        resolve(false);
      }
    });
  }

  async sendAnimation(encodedData: Uint8Array): Promise<PlayResponse> {
    if (!this.isConnected || !this.ws) {
      throw new Error('Device not connected');
    }

    const message: PlayCommand = {
      type: "play",
      data: Buffer.from(encodedData).toString('base64')
    };

    return new Promise((resolve, reject) => {
      if (!this.ws) {
        reject(new Error('WebSocket not available'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Device response timeout'));
      }, 5000);

      this.ws.once('message', (data) => {
        clearTimeout(timeout);
        try {
          const response: PlayResponse = JSON.parse(data.toString());
          resolve(response);
        } catch (error) {
          reject(new Error('Invalid response format'));
        }
      });

      this.ws.send(JSON.stringify(message), (error) => {
        if (error) {
          clearTimeout(timeout);
          reject(error);
        }
      });
    });
  }

  isDeviceConnected(): boolean {
    return this.isConnected && this.ws?.readyState === WebSocket.OPEN;
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = undefined;
    }
    this.isConnected = false;
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log(`Max reconnection attempts reached for ${this.deviceIP}`);
      return;
    }

    const timeout = this.reconnectTimeouts[this.reconnectAttempts] || 30000;
    console.log(`Attempting to reconnect to ${this.deviceIP} in ${timeout}ms...`);

    setTimeout(async () => {
      this.reconnectAttempts++;
      const connected = await this.connect();
      if (!connected) {
        console.log(`Reconnection attempt ${this.reconnectAttempts} failed for ${this.deviceIP}`);
      }
    }, timeout);
  }
}