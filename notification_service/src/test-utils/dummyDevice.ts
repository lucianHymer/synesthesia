#!/usr/bin/env tsx

import { WebSocketServer } from 'ws';
import { Buffer } from 'buffer';

const PORT = parseInt(process.env.PORT || '8080', 10);
const DEVICE_NAME = process.env.DEVICE_NAME || 'DummyESP32';

console.log(`[${DEVICE_NAME}] Starting WebSocket server on port ${PORT}...`);

const wss = new WebSocketServer({ port: PORT });

wss.on('connection', (ws) => {
  console.log(`[${DEVICE_NAME}] Client connected`);

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log(`[${DEVICE_NAME}] Received message:`, JSON.stringify(message, null, 2));

      if (message.type === 'play' && message.data) {
        // Decode the base64 animation data
        const binaryData = Buffer.from(message.data, 'base64');
        console.log(`[${DEVICE_NAME}] Received animation data: ${binaryData.length} bytes`);
        
        // Simulate processing time
        setTimeout(() => {
          // Send success response
          const response = {
            status: 'playing',
            started_at: new Date().toISOString()
          };
          
          console.log(`[${DEVICE_NAME}] Sending response:`, response);
          ws.send(JSON.stringify(response));
          
          // Simulate animation duration (3 seconds)
          console.log(`[${DEVICE_NAME}] Playing animation for 3 seconds...`);
          setTimeout(() => {
            console.log(`[${DEVICE_NAME}] Animation complete`);
          }, 3000);
        }, 100);
      } else {
        // Send error response for unknown message types
        const response = {
          status: 'error',
          error: 'invalid_data',
          started_at: new Date().toISOString()
        };
        
        console.log(`[${DEVICE_NAME}] Sending error response:`, response);
        ws.send(JSON.stringify(response));
      }
    } catch (error) {
      console.error(`[${DEVICE_NAME}] Error processing message:`, error);
      
      const response = {
        status: 'error',
        error: 'invalid_data',
        started_at: new Date().toISOString()
      };
      
      ws.send(JSON.stringify(response));
    }
  });

  ws.on('close', () => {
    console.log(`[${DEVICE_NAME}] Client disconnected`);
  });

  ws.on('error', (error) => {
    console.error(`[${DEVICE_NAME}] WebSocket error:`, error);
  });
});

wss.on('listening', () => {
  console.log(`[${DEVICE_NAME}] WebSocket server listening on port ${PORT}`);
  console.log(`[${DEVICE_NAME}] Waiting for connections...`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(`\n[${DEVICE_NAME}] Shutting down...`);
  wss.close(() => {
    console.log(`[${DEVICE_NAME}] Server closed`);
    process.exit(0);
  });
});