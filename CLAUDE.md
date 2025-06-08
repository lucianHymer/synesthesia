# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure

Multi-package Rust/TypeScript project for AI-powered LED notifications:

- **animation_encoder/** - Rust crate for binary animation encoding
- **esp32_firmware/** - PlatformIO C++ firmware for ESP32 devices  
- **notification_service/** - Node.js TypeScript service with MCP integration

## Development Commands

### Build Commands
```bash
# Build all packages
make build

# Individual builds
make build-rust          # Rust encoder only
make build-service       # Node.js service only
make build-firmware      # ESP32 firmware only
```

### Testing Commands
```bash
# Test all packages
make test

# Individual tests
make test-rust           # cargo test in animation_encoder/
make test-service        # npm test in notification_service/
make test-firmware       # pio test (requires hardware)

# With coverage
make service-coverage    # npm test -- --coverage
```

### Linting and Type Checking
```bash
# Lint all packages
make lint                # cargo clippy + npm run lint

# Individual linting
cd animation_encoder && cargo clippy -- -D warnings
cd notification_service && npm run lint
cd notification_service && npm run typecheck
```

### Development Environment
```bash
# Start notification service in dev mode
make dev                 # npm run dev

# With MCP integration
make dev-mcp            # npm run dev -- --mcp
```

### ESP32 Development
```bash
# Upload firmware to device
make upload-firmware     # pio run --target upload

# Monitor serial output
make monitor            # pio monitor
```

## Architecture Overview

### Core Data Flow
1. **MCP Tools** (in notification_service/src/mcp/) provide Claude Code integration
2. **Notification Service** receives requests via REST API or MCP calls
3. **Pattern Library** (notification_service/src/patterns/) manages LED animations
4. **Animation Encoder** (Rust) converts JSON to binary format for ESP32
5. **Device Manager** sends WebSocket messages to connected ESP32 devices

### Key Components
- **NotificationService.ts** - Main orchestration logic
- **PatternLibrary.ts** - Pattern storage and retrieval
- **DeviceManager.ts** - WebSocket device connections
- **encoderIntegration.ts** - Rust encoder wrapper
- **animation_encoder/src/lib.rs** - Binary encoding implementation

### API Endpoints
- `POST /api/notify` - Send notification with pattern_id
- `GET /api/patterns` - List available patterns
- `GET /health` - Service health check

## Testing Strategy

The project uses Test-Driven Development (TDD):

### Notification Service (TypeScript/Jest)
- Unit tests: Individual service methods
- Integration tests: API endpoints and service interactions
- Mock encoder for testing without Rust dependency

### Animation Encoder (Rust/Cargo)
- Unit tests: `cargo test`
- Integration tests: `tests/integration_tests.rs`
- Property-based testing for encoding/decoding

### ESP32 Firmware (PlatformIO)
- Requires hardware for testing: `pio test`
- Serial monitor for debugging: `make monitor`

## Package-Specific Notes

### Animation Encoder (Rust)
- Uses serde for JSON serialization
- Binary format optimized for ESP32 memory constraints
- Compression with flate2/zlib

### Notification Service (TypeScript)
- ES modules configuration (type: "module")
- Jest with ESM support
- MCP integration excludes src/mcp/ from coverage

### ESP32 Firmware (C++)
- FastLED library for LED control
- WebSocket communication with notification service
- Arduino framework on ESP32