import express from 'express';
import cors from 'cors';
import { PatternLibrary } from './patterns/PatternLibrary';
import { DeviceManager } from './device/DeviceManager';
import { NotificationService } from './services/NotificationService';
import { createRoutes } from './api/routes';
// import { startMCPServer } from './mcp/index';

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
    // Start HTTP server
    const server = app.listen(PORT, () => {
      console.log(`LED Notification Service running on port ${PORT}`);
      console.log(`Pattern library loaded with ${patternLibrary.getAllPatterns().length} patterns`);
      console.log('Health check: GET /health');
      console.log('API endpoints:');
      console.log('  POST /api/notify - Send notification');
      console.log('  GET /api/patterns - List patterns');
      console.log('  GET /api/patterns/:id - Get pattern');
      console.log('  POST /api/patterns - Create pattern');
      console.log('  PUT /api/patterns/:id - Update pattern');
      console.log('  DELETE /api/patterns/:id - Delete pattern');
      console.log('WebSocket server available at ws://localhost:' + PORT + '/ws');
      console.log('Waiting for ESP32 devices to connect...');
    });

    // Start WebSocket server for device connections
    deviceManager.startWebSocketServer(server);

    // Start MCP server if in MCP mode (temporarily disabled for build)
    if (process.env.NODE_ENV === 'mcp' || process.argv.includes('--mcp')) {
      console.log('MCP integration temporarily disabled during integration testing');
      // await startMCPServer(notificationService, patternLibrary);
    }
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  deviceManager.shutdown();
  process.exit(0);
});

startServer();