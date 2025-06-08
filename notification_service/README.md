# Notification Service

Combined TypeScript service providing REST API endpoints, device management, pattern library, and Claude Code MCP integration for intelligent LED notifications.

## Features

- **HTTP API**: RESTful endpoints for pattern management and notifications
- **WebSocket Device Management**: Real-time communication with ESP32 devices
- **Pattern Library**: Extensible collection of LED animation patterns
- **MCP Integration**: Claude Code tools for context-aware notifications
- **AI Pattern Selection**: Uses claude-code CLI for intelligent pattern choice
- **Fallback Systems**: Graceful degradation when components unavailable

## Quick Start

```bash
# Install dependencies
npm install

# Development mode
npm run dev

# Production mode
npm run build && npm start

# MCP mode (for Claude Code integration)
npm start -- --mcp

# Run tests
npm test

# Type checking and linting
npm run typecheck && npm run lint
```

## API Endpoints

### Notifications
- `POST /api/notify` - Send notification with pattern_id
- `GET /health` - Service health check

### Pattern Management
- `GET /api/patterns` - List all patterns with metadata
- `GET /api/patterns/:id` - Get specific pattern details
- `POST /api/patterns` - Create new pattern
- `PUT /api/patterns/:id` - Update existing pattern
- `DELETE /api/patterns/:id` - Delete pattern

## Environment Variables

```bash
PORT=3000                    # HTTP server port
DEVICE_IP=192.168.1.100     # Default ESP32 device IP
NODE_ENV=production         # Environment mode
```

## MCP Integration

The service includes Model Context Protocol (MCP) tools for Claude Code integration:

### Available Tools

**update_status** - Report development events for LED notifications

```typescript
{
  "message": "All tests passed! Build successful.",
  "urgency": "normal" // "low" | "normal" | "high" | "urgent"
}
```

### Usage in Claude Code

Add to your MCP configuration:

```json
{
  "servers": {
    "led-status": {
      "command": "node",
      "args": ["/path/to/notification_service/dist/index.js", "--mcp"]
    }
  }
}
```

## Pattern Library

Built-in patterns optimized for development workflows:

```typescript
// Example pattern structure
{
  "metadata": {
    "id": "gentle_success_v3",
    "description": "Soft green fade with pleasant chimes",
    "tags": ["success", "gentle", "celebration"],
    "typical_use": "test passes, build success",
    "intensity": "low",
    "mood": "quietly celebratory"
  },
  "animation": {
    "duration_ms": 3000,
    "fps": 20,
    "frames": [...],
    "audio": [...]
  }
}
```

## Architecture

```
notification_service/
├── src/
│   ├── api/           # HTTP endpoints and routing
│   ├── device/        # WebSocket device management  
│   ├── patterns/      # Pattern storage and search
│   ├── encoder/       # Rust encoder integration
│   ├── services/      # Core business logic
│   ├── mcp/           # Claude Code MCP integration
│   └── types.ts       # Shared TypeScript types
├── tests/             # Unit and integration tests
└── package.json       # Dependencies and scripts
```

## Device Integration

The service automatically discovers and manages ESP32 devices:

```typescript
// Device management
const deviceManager = new DeviceManager();
await deviceManager.addDevice('192.168.1.100');

// Send notification
const result = await notificationService.notify({
  pattern_id: 'gentle_success_v3'
});
```

## Pattern Selection

AI-powered pattern selection using claude-code CLI:

1. **Context Collection**: Gathers git branch, project name, time
2. **Claude Analysis**: Uses AI to select appropriate pattern
3. **Fallback Logic**: Simple keyword matching if AI unavailable
4. **Caching**: 5-minute cache to avoid repeated selections

## Testing

```bash
# Unit tests
npm run test:unit

# Integration tests (requires running service)
npm run test:integration

# E2E tests (requires ESP32 device)
npm run test:e2e

# Coverage report
npm test -- --coverage
```

## Development

```bash
# Watch mode for development
npm run dev

# Type checking
npm run typecheck

# Linting
npm run lint

# Build for production
npm run build
```

## Integration with Other Packages

### Animation Encoder (Rust)
The service automatically detects and uses the Rust encoder when available:

```typescript
// Automatically falls back to TypeScript mock if Rust unavailable
const encodedData = await this.encoder.encode(animation);
```

### ESP32 Firmware
WebSocket communication with devices running the esp32_firmware:

```typescript
// Device connection and animation delivery
await device.send({
  type: 'play',
  data: base64EncodedCompressedData
});
```

## Deployment

```bash
# Build production bundle
npm run build

# Start production server
npm start

# With MCP integration
NODE_ENV=mcp npm start -- --mcp

# Docker deployment
docker build -t synesthesia-service .
docker run -p 3000:3000 synesthesia-service
```

## Troubleshooting

**Service won't start:**
- Check Node.js version (requires 18+)
- Verify dependencies: `npm install`
- Check port availability: `lsof -i :3000`

**Device connection fails:**
- Verify ESP32 is on same network
- Check DEVICE_IP environment variable
- Monitor device logs via serial

**MCP integration issues:**
- Verify claude-code CLI is installed
- Check MCP server configuration
- Monitor stderr for MCP server logs

**Pattern selection errors:**
- Ensure claude-code CLI is in PATH
- Check /tmp directory permissions
- Verify pattern library is loaded