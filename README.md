# LED Notification Service

Core notification service that manages pattern delivery to LED devices, maintains a pattern library, and provides infrastructure for intelligent pattern selection.

## Features

- **WebSocket Client**: Connects to ESP32 LED devices
- **Pattern Library**: Pre-loaded with 10+ notification patterns
- **HTTP API**: RESTful endpoints for pattern management
- **Message Queuing**: Reliable delivery with reconnection
- **Binary Encoding**: Efficient compression for device communication
- **Fallback Patterns**: Graceful handling of missing patterns

## Quick Start

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Start the service
npm start

# Or run in development mode
npm run dev
```

## Environment Variables

- `PORT`: Server port (default: 3000)
- `DEVICE_IP`: Default LED device IP address (default: 192.168.1.100)

## API Endpoints

### Notifications
- `POST /api/notify` - Send notification to device

### Pattern Management
- `GET /api/patterns` - List all patterns
- `GET /api/patterns/:id` - Get specific pattern
- `POST /api/patterns` - Create new pattern
- `PUT /api/patterns/:id` - Update pattern
- `DELETE /api/patterns/:id` - Delete pattern

### Health Check
- `GET /health` - Service health status

## Example Usage

```bash
# Send a notification
curl -X POST http://localhost:3000/api/notify \
  -H "Content-Type: application/json" \
  -d '{"pattern_id": "gentle_success_v3"}'

# List all patterns
curl http://localhost:3000/api/patterns

# Health check
curl http://localhost:3000/health
```

## Built-in Patterns

The service comes with 10 pre-loaded patterns:

1. **gentle_success_v3** - Soft green fade with chimes
2. **urgent_alert_v1** - Bright red flashing with beeps
3. **celebration_milestone_v2** - Rainbow colors with victory melody
4. **default_notification_v1** - Simple blue fade (fallback)
5. **warning_attention_v1** - Orange warning glow
6. **info_subtle_v1** - Gentle blue pulse
7. **progress_building_v1** - Purple gradient build-up
8. **calm_waiting_v1** - Gentle cyan breathing pattern
9. **error_prominent_v1** - Red error flash with low tones
10. **success_dramatic_v1** - Dramatic green flash with fanfare

## Integration with Team 1

The service automatically detects and uses Team 1's Rust encoder library when available. Falls back to TypeScript mock encoder for development.

## Integration with Team 3

Team 3's MCP tool calls the `/api/notify` endpoint with selected pattern IDs. No direct integration needed.

## Architecture

```
NotificationService
├── PatternLibrary (in-memory storage)
├── DeviceManager (WebSocket connections)
├── EncoderIntegration (Rust/mock encoding)
└── HTTP API (Express.js)
```

## Development

```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Run tests with coverage
npm test -- --coverage
```

## License

MIT