# Team 1: Embedded Device

## Mission
Build a WiFi-connected ESP32 device that receives compressed animation data over WebSocket and plays synchronized LED patterns with chiptune audio.

## Your Ownership
- Complete ESP32 firmware
- Binary protocol definition (you define the format)
- Rust library that encodes JSON animations to your binary format
- Hardware implementation and testing

## What You Receive
Nothing! You define the interface that others must follow.

## What You Deliver

### 1. Working ESP32 Device
- WebSocket server on port 80
- Accepts messages: `{"type": "play", "data": "<base64_compressed>"}`
- Responds synchronously: `{"status": "playing", "started_at": "..."}` or `{"status": "error", "error": "..."}`
- Decompresses zlib data to your binary format
- Plays animations on 20 WS2812B LEDs in ring configuration
- Dual-channel PWM audio with multiple waveforms (square/triangle/sawtooth/noise)

### 2. Binary Protocol Definition
Your exact binary format (see shared_interfaces_v2.md):
```c
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

### 3. Rust Encoder Library
```rust
// animation_encoder/src/lib.rs
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
    pub waveform: Waveform,
}

pub enum Waveform {
    Square = 0,
    Triangle = 1,
    Sawtooth = 2,
    Noise = 3,
}

// Returns zlib-compressed binary data
pub fn encode_animation(anim: &Animation) -> Result<Vec<u8>, Error> {
    // Convert to binary format exactly matching your struct layout
    // Compress with zlib
    // Return compressed bytes
}
```

## Hardware Specifications

### Components
- ESP32 Development Board
- 20x WS2812B LEDs in ring configuration
- 2x PWM audio channels → amplifier → speaker
- USB-C power (5V @ 1.5A)

### Pin Assignments
- GPIO 5: WS2812B Data (via level shifter)
- GPIO 18: Audio Channel 1 (PWM)
- GPIO 19: Audio Channel 2 (PWM)

### Key Requirements
- 20 FPS fixed frame rate
- Smooth keyframe interpolation
- <100ms from message receipt to animation start
- ~8KB RAM for decompression buffer

## Testing Your Delivery

### Standalone Test
```rust
// Create test animation
let test_anim = Animation {
    duration_ms: 1000,
    fps: 20,
    frames: vec![
        Frame { time_ms: 0, leds: [[0,0,0]; 20] },
        Frame { time_ms: 1000, leds: [[255,0,0]; 20] },
    ],
    audio: vec![
        AudioNote { start_ms: 0, duration_ms: 500, frequency: 440, voice: 0, waveform: Waveform::Square },
    ],
};

// Encode it
let compressed = encode_animation(&test_anim)?;
let message = json!({
    "type": "play",
    "data": base64::encode(&compressed)
});

// Send to your device
ws.send(message.to_string());
```

### Success Criteria
1. Device accepts WebSocket connections
2. Plays animations within 100ms of receipt
3. Smooth 20 FPS playback
4. Audio stays synchronized with visuals
5. Your Rust library produces valid compressed data

## Development Tips
- Start with LED control only, add audio later
- Test with hardcoded animations first
- Use FastLED library for WS2812B control
- miniz library works well for ESP32 zlib decompression
- Keep animations under 3 seconds for reasonable memory usage
- Put pins in easy-to-change variables, those aren't the final assignments

## Questions You Need to Answer
1. Exact binary format layout (byte alignment, endianness)
2. Maximum animation size you can handle
3. How to handle animations currently playing when new one arrives
4. Error handling for corrupted data

Remember: You own the protocol. The other teams will adapt to whatever format you define, so make it efficient for your ESP32 constraints.
