# Core Notification Service Architecture

## Overview

The Core Notification Service is the central hub that bridges pattern intelligence (Team 3) with LED device hardware (Team 1). It manages pattern delivery, maintains a pattern library, and ensures reliable notification delivery to connected devices.

## Technology Stack

- **Language**: TypeScript
- **Runtime**: Node.js
- **Framework**: Express.js for HTTP API
- **WebSocket**: ws library for device communication
- **Testing**: Jest with TypeScript support
- **Build Tool**: TypeScript compiler with ES modules
- **Pattern Storage**: File-based JSON storage (initially)
- **External Dependencies**: 
  - Team 1's Rust animation encoder (via WebAssembly or FFI)
  - Team 3's pattern selection API (HTTP client)

## Project Structure

```
team2/
├── src/
│   ├── api/
│   │   ├── routes/
│   │   │   ├── notify.ts          # POST /api/notify endpoint
│   │   │   └── patterns.ts        # Pattern management endpoints
│   │   └── middleware/
│   │       ├── errorHandler.ts
│   │       └── validation.ts
│   ├── services/
│   │   ├── NotificationService.ts # Core notification orchestration
│   │   ├── PatternLibrary.ts      # Pattern storage and retrieval
│   │   ├── DeviceManager.ts       # WebSocket device connections
│   │   ├── PatternSelector.ts     # Default pattern selection logic
│   │   └── MessageQueue.ts        # Reliable message delivery
│   ├── integrations/
│   │   └── AnimationEncoder.ts    # Team 1's Rust encoder wrapper
│   ├── models/
│   │   ├── Pattern.ts             # Pattern data structures
│   │   ├── Device.ts              # Device connection model
│   │   └── Notification.ts        # Notification request/response
│   ├── utils/
│   │   ├── logger.ts
│   │   └── config.ts
│   └── index.ts                   # Application entry point
├── patterns/                      # Pattern library JSON files
│   ├── gentle_success_v3.json
│   ├── urgent_alert_v1.json
│   └── ...
├── tests/
│   ├── unit/
│   │   ├── services/
│   │   ├── api/
│   │   └── utils/
│   ├── integration/
│   └── e2e/
├── package.json
├── tsconfig.json
├── jest.config.js
└── .env.example

```

## Core Components

### 1. NotificationService
Central orchestrator that handles the notification flow:
- Receives notification requests with pattern_id
- Loads specified pattern from library
- Falls back to default pattern if not found
- Encodes animations to binary format
- Delivers to connected devices
- Handles errors and retries

### 2. PatternLibrary
Manages the pattern storage system:
- CRUD operations for patterns
- Pattern search and filtering
- Metadata management
- File-based storage (JSON)
- In-memory caching for performance

### 3. DeviceManager
Handles WebSocket connections to ESP32 devices:
- Connection lifecycle management
- Message delivery with acknowledgment
- Connection pooling and reconnection
- Device registry and status tracking
- Concurrent device support

### 4. PatternSelector
Default pattern selection when AI service unavailable:
- Simple default pattern, maybe based on priority

### 5. MessageQueue
Ensures reliable message delivery:
- In-memory queue for pending notifications
- Retry logic with exponential backoff
- Priority-based queue ordering
- Offline device handling

## API Design

### POST /api/notify
Main notification endpoint:
```typescript
interface NotificationRequest {
  pattern_id: string;  // Animation ID to play
}

interface NotificationResponse {
  status: "success" | "error";
  started_at?: string;     // ISO timestamp when animation began
  pattern_used?: string;   // Pattern ID that was played
  error?: string;          // Error details
}
```

### Pattern Management APIs
```typescript
GET    /api/patterns              // List all patterns
GET    /api/patterns/:id          // Get specific pattern
POST   /api/patterns              // Create pattern
PUT    /api/patterns/:id          // Update pattern
DELETE /api/patterns/:id          // Delete pattern
```

## Data Flow

1. **Notification Request**
   - Team 3's MCP tool sends POST /api/notify with pattern_id
   - Service validates pattern_id

2. **Pattern Loading**
   - Load specified pattern from library
   - Fall back to default pattern if pattern_id not found

3. **Animation Encoding**
   - Convert JSON pattern to Team 1's binary format
   - Compress with zlib

4. **Device Delivery**
   - Send to connected device(s) via WebSocket
   - Wait for acknowledgment
   - Handle errors/retries

5. **Response**
   - Return success with timestamp
   - Or error with details

## Testing Strategy

### Unit Tests
- Individual service methods
- Pattern selection logic
- Message queue operations
- Error handling paths

### Integration Tests
- API endpoint behavior
- Service interactions
- Mock external dependencies

### End-to-End Tests
- Complete notification flow
- Device connection simulation
- Error scenarios

## TDD Approach

1. **Red Phase**: Write failing tests for each component
2. **Green Phase**: Implement minimal code to pass
3. **Refactor Phase**: Improve code quality

### Test Priorities
1. Pattern storage and retrieval
2. Fallback pattern selection logic
3. Notification flow orchestration
4. WebSocket message delivery
5. Error handling and retries

## External Integrations

### Team 1's Encoder
- WebAssembly module or Node.js FFI binding
- Input: JSON Animation object
- Output: Compressed binary data
- Error handling for invalid animations

### Team 3's MCP Tool
- Receives requests with pre-selected pattern_id
- No direct integration needed (they call our API)
- Pattern library must be accessible for their selection process

## Configuration

Environment variables:
```
PORT=3000
WS_PORT=3001
PATTERN_DIR=./patterns
DEFAULT_PATTERN_ID=default_notification_v1
DEVICE_CONNECTION_TIMEOUT=5000
MESSAGE_RETRY_ATTEMPTS=3
LOG_LEVEL=info
```

## Performance Considerations

- Connection pooling for devices
- Async/await for non-blocking operations
- Batch processing for multiple devices
- Graceful degradation when pattern not found

## Security

- Input validation on all endpoints
- Rate limiting for API requests
- WebSocket connection authentication (future)
- Sanitization of user-provided text
- No sensitive data in logs

## Deployment

- Docker container support
- Health check endpoints
- Graceful shutdown handling
- Log aggregation support
- Metrics collection (future)
