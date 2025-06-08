# Shared Interfaces v2 - Strict Device API + Vibes LLM API

Philosophy: Device communication is strict and reliable. LLM communication is flexible and contextual.

## 1. Binary Animation Format (ESP32 ← Encoder)

```c
// Fixed binary layout (little-endian)
struct AnimationHeader {
    uint16_t version;        // = 0x0001
    uint16_t duration_ms;    
    uint8_t  fps;           // = 20
    uint8_t  reserved;      
    uint16_t frame_count;
    uint16_t note_count;
    // Followed by frames[], then notes[]
};

struct Frame {
    uint16_t time_ms;
    uint8_t  leds[20][3];   // RGB values
};

struct AudioNote {
    uint16_t start_ms;
    uint16_t duration_ms;
    uint16_t frequency_hz;
    uint8_t  voice;         // 0 or 1
    uint8_t  waveform;      // 0=square, 1=triangle, 2=sawtooth, 3=noise
    uint8_t  reserved;
};
```

## 2. WebSocket Protocol (Service ↔ ESP32) - STRICT

```typescript
// Service → ESP32
interface PlayCommand {
  type: "play"
  data: string  // base64 encoded zlib-compressed binary
}

// ESP32 → Service (synchronous response)
interface PlayResponse {
  status: "playing" | "error"
  error?: "invalid_data" | "out_of_memory" | "decompression_failed"
  started_at?: string  // ISO timestamp when animation began
}
```

## 3. JSON Animation Format (Service ↔ AI) - DESCRIPTIVE

```typescript
interface Animation {
  name: string
  duration_ms: number
  fps: 20  // Always 20
  frames: {
    time_ms: number
    leds: [number, number, number][]  // 20 RGB arrays
  }[]
  audio: {
    start_ms: number
    duration_ms: number
    frequency: number
    voice: 0 | 1
    waveform: "square" | "triangle" | "sawtooth" | "noise"
  }[]
}

interface PatternWithMetadata {
  animation: Animation
  metadata: {
    id: string
    description: string  // "Soft green fade with pleasant chimes"
    tags: string[]      // ["success", "gentle", "calm", "green"]
    typical_use: string // "test passes, build success"
    intensity: "low" | "medium" | "high"
    mood: string        // "celebratory", "urgent", "calming"
  }
}
```

## 4. Notification API (MCP Tool → Service) - SYNCHRONOUS

```typescript
POST /api/notify
{
  "pattern_id": string  // Animation ID to play
}

// Examples:
{
  "pattern_id": "gentle_success_v3"
}

{
  "pattern_id": "urgent_alert_v1"
}

{
  "pattern_id": "celebration_milestone_v2"
}

Response (waits for device confirmation):
{
  "status": "success" | "error",
  "started_at"?: string,    // When animation began on device
  "error"?: string,         // "device_offline" | "pattern_not_found" | etc
  "pattern_used"?: string   // Which pattern was selected
}
```

## 5. Pattern Selection API (Service → AI) - VIBES-BASED

```typescript
POST /api/select-pattern
{
  "text": string  // Same free-form text from notification
}

Response:
{
  "pattern_id": string,
  "confidence": number,     // 0.0 - 1.0
  "reasoning": string       // "Late night error suggests gentle warning rather than harsh alert"
}
```

## 6. Pattern Library API (Service ↔ AI)

```typescript
// Get all patterns with metadata
GET /api/patterns
Response: PatternWithMetadata[]

// Get specific pattern
GET /api/patterns/:id  
Response: PatternWithMetadata

// Create new pattern (Future: AI will generate these)
// NOT IN INITIAL SCOPE - patterns created manually for now
POST /api/patterns
Body: PatternWithMetadata
Response: { id: string }

// Search patterns by vibe
GET /api/patterns/search?q=gentle%20success%20green
Response: PatternWithMetadata[]
```

## 7. Encoder Library Interface

```rust
// Rust crate: animation_encoder

pub struct Animation {
    pub duration_ms: u16,
    pub fps: u8,
    pub frames: Vec<Frame>,
    pub audio: Vec<AudioNote>,
}

pub struct Frame {
    pub time_ms: u16,
    pub leds: [[u8; 3]; 20],
}

pub struct AudioNote {
    pub start_ms: u16,
    pub duration_ms: u16,
    pub frequency: u16,
    pub voice: u8,
    pub waveform: Waveform,  // enum
}

pub enum Waveform {
    Square = 0,
    Triangle = 1,
    Sawtooth = 2,
    Noise = 3,
}

// Returns zlib-compressed binary data
pub fn encode_animation(anim: &Animation) -> Result<Vec<u8>, Error>;
```

## Key Design Decisions

1. **Strict Device Layer**: ESP32 gets predictable binary format, simple commands, clear errors
2. **Flexible AI Layer**: LLM processes natural language, makes contextual decisions
3. **Synchronous Confirmation**: Service waits for device to confirm animation started
4. **Rich Metadata**: AI has full context about patterns to make intelligent choices
5. **Text-First**: Everything is described in human language for the LLM to understand

## Mock Data for Development

```typescript
// Sample rich pattern metadata
const samplePattern: PatternWithMetadata = {
  animation: {
    name: "gentle_success_v3",
    duration_ms: 3000,
    fps: 20,
    frames: [
      { time_ms: 0, leds: Array(20).fill([0,0,0]) },
      { time_ms: 1500, leds: Array(20).fill([0,255,100]) },
      { time_ms: 3000, leds: Array(20).fill([0,64,0]) }
    ],
    audio: [
      { start_ms: 0, duration_ms: 200, frequency: 523, voice: 0, waveform: "square" }
    ]
  },
  metadata: {
    id: "gentle_success_v3",
    description: "Soft green fade with pleasant ascending chimes",
    tags: ["success", "gentle", "celebration", "green", "calm"],
    typical_use: "test passes, build success, minor achievements",
    intensity: "low",
    mood: "quietly celebratory"
  }
};
```

This gives teams everything they need to work independently while maintaining the strict/vibes distinction!