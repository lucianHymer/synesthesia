# Synesthesia: AI-Powered LED Notification System

Multi-package project that brings intelligent LED notifications to your development workflow. Combines embedded hardware, Rust encoding, Node.js services, and AI-powered pattern selection into a cohesive system.

## Architecture

```
synesthesia/
├── animation_encoder/          # Rust crate - Binary animation encoding
├── esp32_firmware/             # PlatformIO - ESP32 LED device firmware  
└── notification_service/       # Node.js - Notification service + MCP integration
```

## Features

- **Smart Pattern Selection**: AI chooses appropriate LED patterns based on development context
- **Embedded Device Control**: ESP32-based LED strips with audio feedback
- **Binary Protocol**: Efficient Rust-encoded animations with compression
- **Claude Code Integration**: MCP tools for seamless IDE integration
- **Pattern Library**: Extensible collection of notification animations
- **WebSocket Communication**: Real-time device control and status

## Quick Start

```bash
# Build all packages
make build

# Run tests  
make test

# Start development environment
make dev
```

## Package Overview

### Animation Encoder (Rust)
Binary encoding library that converts JSON animations to compressed binary format for ESP32 devices.

### ESP32 Firmware (C++)
Embedded firmware running on ESP32 devices, controls LED strips and audio feedback via WebSocket.

### Notification Service (TypeScript)
Combined service providing REST API, device management, pattern library, and Claude Code MCP integration.

## API Endpoints

### Notifications
- `POST /api/notify` - Send notification with pattern_id
- `GET /health` - Service health status

### Pattern Management  
- `GET /api/patterns` - List all patterns with metadata
- `GET /api/patterns/:id` - Get specific pattern
- `POST /api/patterns` - Create new pattern
- `PUT /api/patterns/:id` - Update pattern
- `DELETE /api/patterns/:id` - Delete pattern

## Example Usage

```bash
# Send a notification (MCP integration)
curl -X POST http://localhost:3000/api/notify \
  -H "Content-Type: application/json" \
  -d '{"pattern_id": "gentle_success_v3"}'

# List all patterns
curl http://localhost:3000/api/patterns

# Health check
curl http://localhost:3000/health
```

## Built-in Patterns

The service includes 10+ pre-loaded patterns optimized for development workflows:

1. **gentle_success_v3** - Soft green fade with chimes (test passes, builds)
2. **urgent_alert_v1** - Bright red flashing (critical errors, production issues)
3. **celebration_milestone_v2** - Rainbow colors with victory melody (releases, major achievements)
4. **default_notification_v1** - Simple blue fade (fallback pattern)
5. **warning_attention_v1** - Orange warning glow (warnings, deprecations)
6. **info_subtle_v1** - Gentle blue pulse (info notifications)
7. **progress_building_v1** - Purple gradient build-up (CI/CD progress)
8. **calm_waiting_v1** - Gentle cyan breathing (waiting states)
9. **error_prominent_v1** - Red error flash with low tones (build failures)
10. **success_dramatic_v1** - Dramatic green flash with fanfare (major successes)

## Development

```bash
# Individual package commands
cd animation_encoder && cargo test
cd esp32_firmware && pio test  
cd notification_service && npm test

# Top-level commands
make test           # Test all packages
make build          # Build all packages
make dev            # Development environment
make clean          # Clean build artifacts
```

## MCP Integration

The notification service includes Claude Code MCP integration for intelligent pattern selection:

- **Context-aware**: Analyzes git status, project state, time of day
- **AI-powered**: Uses Claude to select appropriate patterns
- **Seamless**: Integrates directly into Claude Code workflows

## License

MIT
