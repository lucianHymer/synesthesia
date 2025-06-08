# Team 1: Embedded Device Design Document

## Architecture Overview

### System Components
1. **ESP32 Firmware** (C/C++)
   - WebSocket server on port 80
   - Binary protocol decoder
   - LED animation player
   - Audio synthesizer
   - Memory-efficient buffering

2. **Rust Encoder Library** (`animation_encoder`)
   - Converts JSON animations to binary format
   - Applies zlib compression
   - Validates data constraints

3. **Test Infrastructure**
   - Unit tests for each component
   - Integration tests for end-to-end flow
   - Hardware test fixtures

## Binary Protocol Definition

### Design Decisions
- **Byte Order**: Little-endian (matches ESP32 native)
- **Alignment**: Packed structs (no padding) to minimize size
- **Version**: 0x0001 for initial protocol
- **Maximum Size**: 8KB compressed (fits in ESP32 RAM)

### Exact Binary Layout

```c
// All structs are packed (no padding)
#pragma pack(push, 1)

struct AnimationHeader {
    uint16_t version;        // 0x0001 (little-endian)
    uint16_t duration_ms;    // Max 65535ms (~65 seconds)
    uint8_t  fps;           // Fixed at 20
    uint8_t  reserved;      // For future use, must be 0
    uint16_t frame_count;   // Number of frames following
    uint16_t note_count;    // Number of audio notes following
};

struct Frame {
    uint16_t time_ms;       // Timestamp from animation start
    uint8_t  leds[20][3];   // RGB values for 20 LEDs
};

struct AudioNote {
    uint16_t start_ms;      // Start time from animation start
    uint16_t duration_ms;   // Note duration
    uint16_t frequency_hz;  // 0-20000 Hz
    uint8_t  voice;         // 0 or 1 (dual channel)
    uint8_t  waveform;      // 0=square, 1=triangle, 2=sawtooth, 3=noise
    uint8_t  reserved;      // For alignment, must be 0
};

#pragma pack(pop)
```

### Memory Layout Example
```
Offset  Size  Field
------  ----  -----
0x0000  2     version (0x0001)
0x0002  2     duration_ms
0x0004  1     fps (20)
0x0005  1     reserved
0x0006  2     frame_count
0x0008  2     note_count
0x000A  var   Frame array
0x????  var   AudioNote array
```

## Implementation Strategy

### Phase 1: Foundation (TDD Approach)
1. Create Rust encoder with comprehensive tests
2. Set up ESP32 WebSocket server
3. Implement basic LED control

### Phase 2: Core Features
1. Binary protocol encoding/decoding
2. Animation playback engine
3. Basic audio synthesis

### Phase 3: Advanced Features
1. Frame interpolation
2. Audio-visual synchronization
3. Performance optimization

## Key Design Answers

### 1. Exact Binary Format Layout
- Little-endian byte order
- Packed structs (no padding)
- Fixed header size: 10 bytes
- Frame size: 62 bytes each
- AudioNote size: 9 bytes each

### 2. Maximum Animation Size
- Uncompressed: ~8KB (safe limit)
- Compressed: ~2KB typical
- Maximum duration: 10 seconds
- Maximum frames: 200 (20 FPS × 10s)
- Maximum audio notes: 100

### 3. Animation Replacement Policy
- New animation immediately stops current
- Clean transition (no visual glitches)
- Current audio fades out over 50ms
- Response sent after new animation starts

### 4. Error Handling
- CRC check on decompressed data (optional)
- Version validation
- Size bounds checking
- Graceful degradation (play without audio if audio corrupted)

## Memory Management

### ESP32 Constraints
- Total RAM: ~320KB
- Available for animations: ~50KB
- Decompression buffer: 8KB
- Double buffering for smooth playback

### Buffer Strategy
```
[Compressed Input] → [Decompression Buffer] → [Animation Buffer]
     ~2KB                    8KB                    8KB
```

## Performance Requirements

### Latency Budget (100ms total)
- WebSocket receive: 5ms
- Base64 decode: 5ms
- Zlib decompress: 20ms
- Binary parse: 5ms
- Animation start: 5ms
- **Margin**: 60ms

### Frame Timing
- Target: 50ms per frame (20 FPS)
- Actual: 49-51ms (±2% tolerance)
- Interpolation for smooth transitions

## Testing Strategy

### Unit Tests (Rust)
- Binary encoding correctness
- Compression/decompression
- Edge cases and invalid data

### Integration Tests
- Round-trip encoding/decoding
- WebSocket communication
- Timing accuracy

### Hardware Tests
- LED pattern verification
- Audio waveform validation
- Latency measurements

## Development Priorities

### Must Have (MVP)
- WebSocket server
- Binary protocol implementation
- LED animation playback
- Basic error handling

### Should Have
- Audio playback
- Smooth interpolation
- Comprehensive error messages

## API Contracts

### WebSocket Input
```json
{
  "type": "play",
  "data": "<base64_encoded_compressed_binary>"
}
```

### WebSocket Output
```json
// Success
{
  "status": "playing",
  "started_at": "2024-01-07T15:30:45.123Z"
}

// Error
{
  "status": "error",
  "error": "invalid_data" | "out_of_memory" | "decompression_failed"
}
```

## Hardware Configuration

### Pin Assignments (Configurable)
```c
#define LED_DATA_PIN    5   // WS2812B data line
#define AUDIO_PIN_1     18  // PWM channel 1
#define AUDIO_PIN_2     19  // PWM channel 2
```

### Power Requirements
- LEDs: 20 × 60mA = 1.2A max
- ESP32: 200mA
- Audio: 100mA
- **Total**: 1.5A @ 5V (USB-C)

## Next Steps

1. Set up development environment
2. Create Rust library structure with tests
3. Implement binary encoding with TDD
4. Create ESP32 project scaffold
5. Build incrementally with continuous testing
