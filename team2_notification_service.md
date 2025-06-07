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

### From Team 3: Pattern Selection API
```typescript
// Team 3 provides endpoint
POST /api/select-pattern
{
  "text": string,  // Free-form text description
  "available_patterns": PatternWithMetadata[]  // Full pattern info
}

Response:
{
  "pattern_id": string,
  "confidence": number,
  "reasoning": string
}
```

## What You Deliver

### 1. Notification Service (TypeScript or Rust)

**Core API Endpoint:**
```typescript
POST /api/notify
{
  "text": "All 247 tests passed! First successful run after yesterday's auth failures. Feels great!"
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
    // 1. Get pattern recommendation from Team 3 (or use default)
    const selected = await getPatternSelection(request);
    
    // 2. Load pattern from library
    const pattern = await loadPattern(selected.pattern_id);
    
    // 3. Convert to binary using Team 1's encoder
    const encoded = encodeAnimation(pattern);
    
    // 4. Send to device(s)
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

### 4. Default Pattern Selection

When Team 3's AI service is unavailable:
```typescript
function selectDefaultPattern(text: string): string {
  // Simple rule-based selection based on text content
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes("success") || lowerText.includes("passed") || lowerText.includes("complete")) {
    return "gentle_success_v3";
  }
  if (lowerText.includes("error") || lowerText.includes("failed") || lowerText.includes("urgent")) {
    return "urgent_alert_v1";
  }
  if (lowerText.includes("11pm") || lowerText.includes("late night") || lowerText.includes("tired")) {
    return "gentle_notification_v1";  // Softer for late night
  }
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
4. **Week 4**: Integration with Teams 1 & 3

## Testing Strategy

### Unit Tests
- Pattern storage/retrieval
- Default selection logic
- Message queuing

### Integration Tests
```typescript
// Mock Team 1's encoder
const mockEncoder = (anim: Animation) => new Uint8Array([1,2,3,4]);

// Mock Team 3's selector
const mockSelector = async (req: PatternRequest) => ({
  pattern_id: "test_pattern",
  confidence: 0.95
});

// Test full flow
const response = await service.notify({
  message: "Build successful!",
  urgency: "normal"
});
```

### End-to-End Test
1. Send notification request
2. Verify pattern selection
3. Check device receives data
4. Confirm playback starts

## Questions to Resolve
1. How many devices to support simultaneously?
2. Message priority/queue ordering?
3. Pattern caching strategy?
4. Offline device handling?
5. Pattern versioning approach?

Remember: You're the bridge between the intelligence layer and the hardware. Make it reliable, fast, and easy to extend.
