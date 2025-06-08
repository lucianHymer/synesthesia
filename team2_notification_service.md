# Team 2: Core Notification Service

## Mission
Build the notification service that manages pattern delivery to LED devices, maintains a pattern library, and provides the infrastructure for intelligent pattern selection.

## Your Ownership
- WebSocket client that connects to devices
- Pattern library storage and management
- Basic pattern selection logic
- Message queuing and reliable delivery
- HTTP API for pattern management

## What You Receive

### From Team 1: Rust Encoder Library
```rust
use animation_encoder::{Animation, Frame, AudioNote, encode_animation};

// Their library converts JSON-like structs to compressed binary
let compressed_bytes = encode_animation(&animation)?;
```

### From Team 3: MCP Tool
Team 3's MCP tool will:
- Access your pattern library to see available patterns
- Select appropriate pattern based on context
- Call your `/api/notify` endpoint with chosen `pattern_id`

No direct API integration needed - they call you!

## What You Deliver

### 1. Notification Service (TypeScript or Rust)

**Core API Endpoint:**
```typescript
POST /api/notify
{
  "pattern_id": "gentle_success_v3"
}

Response (waits for device confirmation):
{
  "status": "success" | "error",
  "started_at": "2025-06-07T14:30:15Z",  // When animation began
  "pattern_used": "gentle_success_v3",
  "error"?: "device_offline" | "pattern_not_found"
}
```

**Service Architecture:**
```typescript
class NotificationService {
  async handleNotification(request: NotificationRequest) {
    // 1. Load pattern from library (Team 3 already selected it)
    const pattern = await loadPattern(request.pattern_id);
    
    // 2. Convert to binary using Team 1's encoder
    const encoded = encodeAnimation(pattern);
    
    // 3. Send to device(s)
    await sendToDevice(encoded);
  }
}
```

### 2. Pattern Library System

**Storage Format (JSON):**
```json
{
  "pattern_id": "gentle_success_v3",
  "name": "Gentle Success",
  "duration_ms": 3000,
  "fps": 20,
  "frames": [
    {
      "time_ms": 0,
      "leds": [[0,0,0], [0,0,0], /* ... 20 total */]
    },
    {
      "time_ms": 1500,
      "leds": [[0,255,100], [0,255,100], /* ... */]
    }
  ],
  "audio": [
    {
      "start_ms": 0,
      "duration_ms": 200,
      "frequency": 523,
      "voice": 0,
      "waveform": "square"
    }
  ],
  "metadata": {
    "id": "gentle_success_v3",
    "description": "Soft green fade with pleasant ascending chimes",
    "tags": ["success", "gentle", "celebration", "green", "calm"],
    "typical_use": "test passes, build success, minor achievements",
    "intensity": "low",
    "mood": "quietly celebratory",
    "usage_count": 0,
    "created_at": "2025-06-06T10:00:00Z"
  }
}
```

**Pattern Management API:**
```typescript
GET    /api/patterns              // List all patterns
GET    /api/patterns/:id          // Get specific pattern
POST   /api/patterns              // Create new pattern
PUT    /api/patterns/:id          // Update pattern
DELETE /api/patterns/:id          // Delete pattern
```

### 3. Device Management

**WebSocket Client:**
```typescript
class DeviceConnection {
  private ws: WebSocket;
  
  async connect(deviceIP: string) {
    this.ws = new WebSocket(`ws://${deviceIP}:80`);
  }
  
  async sendAnimation(encodedData: Uint8Array): Promise<{status: string, started_at?: string, error?: string}> {
    const message = {
      type: "play",
      data: btoa(String.fromCharCode(...encodedData))
    };
    
    return new Promise((resolve) => {
      this.ws.send(JSON.stringify(message));
      
      // Wait for synchronous response from device
      this.ws.onmessage = (event) => {
        const response = JSON.parse(event.data);
        resolve(response);
      };
    });
  }
}
```

**Device Registry:**
- Track known devices
- Handle reconnection
- Queue messages during disconnection
- Support multiple devices

### 4. Fallback Pattern Selection

When requested pattern_id is not found:
```typescript
function selectFallbackPattern(patternId: string): string {
  // Log the missing pattern for debugging
  console.warn(`Pattern not found: ${patternId}, using default`);
  
  // Always fall back to a known good pattern
  return "default_notification_v1";
}
```

## Initial Pattern Library

Create at least 10 patterns covering:
- Success (gentle, dramatic)
- Error (warning, critical)
- Info (subtle, prominent)
- Progress (building, waiting)
- Celebration (achievement, milestone)

## Development Milestones

1. **Week 1**: Basic service + device connection
2. **Week 2**: Pattern library + storage
3. **Week 3**: Queue system + reliability
4. **Week 4**: Integration with Team 1 + testing

## Testing Strategy

### Unit Tests
- Pattern storage/retrieval
- Fallback pattern selection
- Message queuing

### Integration Tests
```typescript
// Mock Team 1's encoder
const mockEncoder = (anim: Animation) => new Uint8Array([1,2,3,4]);

// Test full flow
const response = await service.notify({
  pattern_id: "gentle_success_v3"
});

expect(response.status).toBe("success");
expect(response.pattern_used).toBe("gentle_success_v3");
```

### End-to-End Test
1. Send notification request with pattern_id
2. Verify pattern loads from library
3. Check device receives encoded data
4. Confirm playback starts

## Questions to Resolve
1. How many devices to support simultaneously?
2. Message priority/queue ordering?
3. Pattern caching strategy?
4. Offline device handling?
5. Pattern versioning approach?

Remember: You're the bridge between the intelligence layer and the hardware. Make it reliable, fast, and easy to extend.
