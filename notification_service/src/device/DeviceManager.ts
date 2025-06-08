import { DeviceConnection } from './DeviceConnection';
import { PlayResponse } from '../types';

export class DeviceManager {
  private devices: Map<string, DeviceConnection> = new Map();
  private messageQueue: Array<{ deviceIP: string, data: Uint8Array, resolve: Function, reject: Function }> = [];
  private isProcessingQueue: boolean = false;

  async addDevice(deviceIP: string): Promise<boolean> {
    if (this.devices.has(deviceIP)) {
      return true;
    }

    const device = new DeviceConnection(deviceIP);
    const connected = await device.connect();
    
    if (connected) {
      this.devices.set(deviceIP, device);
      console.log(`Device ${deviceIP} added to registry`);
      return true;
    }
    
    console.error(`Failed to add device ${deviceIP}`);
    return false;
  }

  removeDevice(deviceIP: string): boolean {
    const device = this.devices.get(deviceIP);
    if (device) {
      device.disconnect();
      this.devices.delete(deviceIP);
      console.log(`Device ${deviceIP} removed from registry`);
      return true;
    }
    return false;
  }

  async sendToDevice(deviceIP: string, encodedData: Uint8Array): Promise<PlayResponse> {
    const device = this.devices.get(deviceIP);
    if (!device) {
      throw new Error(`Device ${deviceIP} not found in registry`);
    }

    if (!device.isDeviceConnected()) {
      return this.queueMessage(deviceIP, encodedData);
    }

    try {
      return await device.sendAnimation(encodedData);
    } catch (error) {
      console.error(`Failed to send to device ${deviceIP}:`, error);
      return this.queueMessage(deviceIP, encodedData);
    }
  }

  async sendToAllDevices(encodedData: Uint8Array): Promise<PlayResponse[]> {
    const promises = Array.from(this.devices.keys()).map(deviceIP =>
      this.sendToDevice(deviceIP, encodedData)
    );
    
    return Promise.all(promises);
  }

  getConnectedDevices(): string[] {
    return Array.from(this.devices.entries())
      .filter(([, device]) => device.isDeviceConnected())
      .map(([ip]) => ip);
  }

  getAllDevices(): string[] {
    return Array.from(this.devices.keys());
  }

  hasConnectedDevices(): boolean {
    return this.getConnectedDevices().length > 0;
  }

  private async queueMessage(deviceIP: string, data: Uint8Array): Promise<PlayResponse> {
    return new Promise((resolve, reject) => {
      this.messageQueue.push({ deviceIP, data, resolve, reject });
      console.log(`Message queued for device ${deviceIP} (queue length: ${this.messageQueue.length})`);
      
      if (!this.isProcessingQueue) {
        this.processQueue();
      }
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.messageQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (!message) break;

      const device = this.devices.get(message.deviceIP);
      if (!device) {
        message.reject(new Error(`Device ${message.deviceIP} not found`));
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