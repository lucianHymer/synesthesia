import WebSocket, { WebSocketServer } from 'ws';
import { DeviceConnection } from './DeviceConnection';
import { PlayResponse } from '../types';
import logger from '../utils/logger';
import { Server } from 'http';

export class DeviceManager {
  private devices: Map<string, DeviceConnection> = new Map();
  private wss?: WebSocketServer;
  private messageQueue: Array<{ deviceId: string, data: Uint8Array, resolve: Function, reject: Function }> = [];
  private isProcessingQueue: boolean = false;

  startWebSocketServer(server: Server): void {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws'
    });

    this.wss.on('connection', (ws: WebSocket, request) => {
      const clientIP = request.socket.remoteAddress || 'unknown';
      logger.info(`New WebSocket connection from ${clientIP}`);
      
      // Wait for device registration
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          
          if (message.type === 'register') {
            this.handleDeviceRegistration(ws, message);
          } else {
            // Handle other message types if needed
            logger.warn(`Unknown message type from unregistered device: ${message.type}`);
          }
        } catch (error) {
          logger.error('Failed to parse WebSocket message:', error);
        }
      });

      ws.on('close', () => {
        // Find and remove this device
        const deviceToRemove = Array.from(this.devices.entries())
          .find(([, device]) => device.getWebSocket() === ws);
        
        if (deviceToRemove) {
          const [deviceId] = deviceToRemove;
          this.devices.delete(deviceId);
          logger.info(`Device ${deviceId} disconnected and removed`);
        }
      });

      ws.on('error', (error) => {
        logger.error(`WebSocket error from ${clientIP}:`, error);
      });
    });

    logger.info('WebSocket server started on /ws');
  }

  private handleDeviceRegistration(ws: WebSocket, message: { deviceId?: string; capabilities?: string[] }): void {
    const { deviceId, capabilities } = message;
    
    if (!deviceId) {
      logger.error('Device registration missing deviceId');
      return;
    }

    // Remove existing device with same ID if any
    if (this.devices.has(deviceId)) {
      const existingDevice = this.devices.get(deviceId)!;
      existingDevice.disconnect();
      this.devices.delete(deviceId);
      logger.info(`Replaced existing device ${deviceId}`);
    }

    // Create new device connection
    const device = new DeviceConnection(ws, deviceId, capabilities || []);
    this.devices.set(deviceId, device);
    
    logger.info(`Device ${deviceId} registered with capabilities: ${capabilities}`);
    
    // Send registration confirmation
    ws.send(JSON.stringify({
      type: 'registration_ack',
      deviceId,
      status: 'registered'
    }));

    // Process any queued messages for this device
    this.processQueueForDevice(deviceId);
  }

  async sendToDevice(deviceId: string, encodedData: Uint8Array): Promise<PlayResponse> {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error(`Device ${deviceId} not found in registry`);
    }

    if (!device.isDeviceConnected()) {
      return this.queueMessage(deviceId, encodedData);
    }

    try {
      return await device.sendAnimation(encodedData);
    } catch (error) {
      logger.error(`Failed to send to device ${deviceId}:`, error);
      return this.queueMessage(deviceId, encodedData);
    }
  }

  async sendToAllDevices(encodedData: Uint8Array): Promise<PlayResponse[]> {
    const promises = Array.from(this.devices.keys()).map(deviceId =>
      this.sendToDevice(deviceId, encodedData)
    );
    
    return Promise.all(promises);
  }

  getConnectedDevices(): string[] {
    return Array.from(this.devices.entries())
      .filter(([, device]) => device.isDeviceConnected())
      .map(([deviceId]) => deviceId);
  }

  getAllDevices(): string[] {
    return Array.from(this.devices.keys());
  }

  hasConnectedDevices(): boolean {
    return this.getConnectedDevices().length > 0;
  }

  getDeviceInfo(deviceId: string) {
    const device = this.devices.get(deviceId);
    if (!device) return null;
    
    return {
      deviceId: device.getDeviceId(),
      capabilities: device.getCapabilities(),
      connected: device.isDeviceConnected(),
      lastSeen: device.getLastSeen()
    };
  }

  getAllDeviceInfo() {
    return Array.from(this.devices.keys()).map(deviceId => this.getDeviceInfo(deviceId));
  }

  removeDevice(deviceId: string): boolean {
    const device = this.devices.get(deviceId);
    if (device) {
      device.disconnect();
      this.devices.delete(deviceId);
      logger.info(`Device ${deviceId} removed from registry`);
      return true;
    }
    return false;
  }

  shutdown(): void {
    // Disconnect all devices
    for (const device of this.devices.values()) {
      device.disconnect();
    }
    this.devices.clear();
    
    // Close WebSocket server
    if (this.wss) {
      this.wss.close();
    }
    
    logger.info('DeviceManager shutdown complete');
  }

  private async queueMessage(deviceId: string, data: Uint8Array): Promise<PlayResponse> {
    return new Promise((resolve, reject) => {
      this.messageQueue.push({ deviceId, data, resolve, reject });
      logger.info(`Message queued for device ${deviceId} (queue length: ${this.messageQueue.length})`);
      
      if (!this.isProcessingQueue) {
        this.processQueue();
      }
    });
  }

  private async processQueueForDevice(deviceId: string): Promise<void> {
    const deviceMessages = this.messageQueue.filter(msg => msg.deviceId === deviceId);
    
    for (const message of deviceMessages) {
      const device = this.devices.get(message.deviceId);
      if (device && device.isDeviceConnected()) {
        try {
          const response = await device.sendAnimation(message.data);
          message.resolve(response);
          
          // Remove from queue
          const index = this.messageQueue.indexOf(message);
          if (index > -1) {
            this.messageQueue.splice(index, 1);
          }
        } catch (error) {
          message.reject(error);
        }
      }
    }
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.messageQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (!message) break;

      const device = this.devices.get(message.deviceId);
      if (!device) {
        message.reject(new Error(`Device ${message.deviceId} not found`));
        continue;
      }

      if (device.isDeviceConnected()) {
        try {
          const response = await device.sendAnimation(message.data);
          message.resolve(response);
        } catch (error) {
          message.reject(error);
        }
      } else {
        this.messageQueue.unshift(message);
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.isProcessingQueue = false;

    if (this.messageQueue.length > 0) {
      setTimeout(() => this.processQueue(), 5000);
    }
  }
}