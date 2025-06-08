import express from 'express';
import cors from 'cors';
import { PatternLibrary } from './patterns/PatternLibrary';
import { DeviceManager } from './device/DeviceManager';
import { NotificationService } from './services/NotificationService';
import { createRoutes } from './api/routes';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const patternLibrary = new PatternLibrary();
const deviceManager = new DeviceManager();
const notificationService = new NotificationService(patternLibrary, deviceManager);

app.use(createRoutes(notificationService, patternLibrary));

async function startServer() {
  try {
    const defaultDeviceIP = process.env.DEVICE_IP || '192.168.1.100';
    
    console.log(`Attempting to connect to default device: ${defaultDeviceIP}`);
    const connected = await deviceManager.addDevice(defaultDeviceIP);
    
    if (connected) {
      console.log(`Successfully connected to device: ${defaultDeviceIP}`);
    } else {
      console.warn(`Could not connect to device: ${defaultDeviceIP}, continuing without device`);
    }

    app.listen(PORT, () => {
      console.log(`LED Notification Service running on port ${PORT}`);
      console.log(`Pattern library loaded with ${patternLibrary.getAllPatterns().length} patterns`);
      console.log(`Connected devices: ${deviceManager.getConnectedDevices().length}`);
      console.log('Health check: GET /health');
      console.log('API endpoints:');
      console.log('  POST /api/notify - Send notification');
      console.log('  GET /api/patterns - List patterns');
      console.log('  GET /api/patterns/:id - Get pattern');
      console.log('  POST /api/patterns - Create pattern');
      console.log('  PUT /api/patterns/:id - Update pattern');
      console.log('  DELETE /api/patterns/:id - Delete pattern');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  deviceManager.getAllDevices().forEach(deviceIP => {
    deviceManager.removeDevice(deviceIP);
  });
  process.exit(0);
});

startServer();