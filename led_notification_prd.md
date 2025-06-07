# Smart LED Notification System - Technical Specification

## Overview

An intelligent, WiFi-connected notification device that translates development events and text messages into expressive LED patterns and chiptune audio. The system leverages Claude AI to create contextually appropriate visual and auditory notifications, learning from user feedback to improve pattern selection over time.

**System Architecture:**
```
Claude Code → MCP Tool → Notification Service → Compression → ESP32 Device
                                    ↓
                            Pattern Library
                          (server-side only)
```

## Hardware Specification

### Core Components
- **MCU**: ESP32 Development Board (dual-core, WiFi enabled)
- **LEDs**: 20x WS2812B addressable RGB LEDs in ring configuration
- **Audio**: Dual-channel chiptune via PWM + 1W speaker with transistor amplifier
- **Power**: USB-C 5V input with 3.3V regulation
- **Enclosure**: 3D-printed clear PLA with diffusion chambers

### Electrical Schematic

```
ESP32 Pin Layout:
┌─────────────────┐
│     ESP32       │
│                 │
│ GPIO 5  ────────┼──── WS2812B Data In
│ GPIO 18 ────────┼──── Audio Channel 1 (PWM)
│ GPIO 19 ────────┼──── Audio Channel 2 (PWM)
│ 3.3V    ────────┼──── Logic Power
│ GND     ────────┼──── Ground
│ 5V      ────────┼──── LED Power (via level shifter)
└─────────────────┘

LED Ring Wiring:
┌─────────────────┐
│ WS2812B Ring    │
│                 │
│ VCC ────────────┼──── 5V (dedicated supply)
│ GND ────────────┼──── Ground
│ DIN ────────────┼──── GPIO 5 (via 74HCT245 level shifter)
└─────────────────┘

Audio Amplifier:
GPIO 18 ──┬── 1kΩ ──┬── 2N2222 Collector ── Speaker +
          │         │
GPIO 19 ──┼── 1kΩ ──┘
          │
          └── 10kΩ ── 2N2222 Base
                      │
                      └── 2N2222 Emitter ── Speaker - / GND
```

### LED Ring Layout (Top View)
```
     19  0  1
   18       2
 17           3
16             4
15             5
 14           6
   13       7
     12 11 10
      9  8
```

### Power Requirements
- **ESP32**: 80mA @ 3.3V (typical), 240mA (peak with WiFi)
- **LEDs**: 60mA per LED @ max brightness (1.2A total @ 5V)
- **Audio**: 200mA @ 5V (peak)
- **Total**: 5V @ 1.5A recommended supply

### 3D Printing Specifications

#### Enclosure Design
- **Printer**: Sovol SV06 (220x220mm build volume)
- **Material**: Clear PLA for light diffusion
- **Main Case**: 0.2mm layers, 3 perimeters, 20% infill
- **Diffusion Panels**: 0.28-0.3mm layers, 2 perimeters, 15% infill
- **Wall Thickness**: 1.0-1.5mm for optimal light diffusion

#### Print Strategy
```
Parts List:
├── base_case.stl          (Electronics housing)
├── led_ring_mount.stl     (LED positioning)
├── diffusion_top.stl      (Light diffusion chamber)
├── speaker_grille.stl     (Audio output)
└── access_panel.stl       (Programming/debugging)
```

## Communication Protocol v1.0 (Simplified)

### Message Format
All communication uses compressed binary data over WebSocket on port 80.

#### Single Message Type

**Play Animation Command:**
```json
{
  "type": "play",
  "data": "<base64_encoded_compressed_animation>"  // ~300-500 bytes
}
```

That's it! The ESP32:
1. Receives the compressed animation data
2. Decompresses it to RAM
3. Plays the animation immediately
4. Discards when complete

### Compression Details
- Server converts JSON animation to binary format
- Compresses with zlib level 1 (fast)
- Typical compression: 95%+ reduction
- 3-second animation: ~24KB JSON → ~300-500 bytes compressed

See `led_binary_protocol.md` for detailed binary format specification.

#### Animation Data Structure (Server-Side JSON)

```json
{
  "name": "gentle_success",       // Human readable
  "duration_ms": 3000,           // Total animation length
  "fps": 20,                     // Fixed frame rate
  "frames": [
    {
      "time_ms": 0,
      "leds": [
        [0, 0, 0],               // LED 0: [R, G, B] (0-255)
        [0, 0, 0],               // LED 1
        // ... 20 total LEDs
      ]
    },
    {
      "time_ms": 1500,
      "leds": [
        [0, 255, 100],           // Bright green
        [0, 255, 100],
        // ...
      ]
    },
    {
      "time_ms": 3000,
      "leds": [
        [0, 64, 0],              // Fade to dim
        [0, 64, 0],
        // ...
      ]
    }
  ],
  "audio": [
    {
      "time_ms": 0,              // Start time
      "duration_ms": 200,        // Note duration
      "freq": 523,               // C5 frequency in Hz
      "voice": 0                 // Channel 0 or 1
    },
    {
      "time_ms": 200,
      "duration_ms": 300,
      "freq": 659,               // E5
      "voice": 0
    },
    {
      "time_ms": 200,            // Can overlap for harmony
      "duration_ms": 300,
      "freq": 330,               // E4 (octave below)
      "voice": 1                 // Second channel
    }
  ]
}
```

**Note**: Server automatically converts this JSON to compressed binary format before sending to ESP32. Claude and pattern designers only work with this clean JSON format.

## Software Architecture

### ESP32 Firmware Structure

```cpp
// Core system configuration
#define LED_PIN 5
#define AUDIO_PIN_1 18
#define AUDIO_PIN_2 19
#define NUM_LEDS 20
#define FPS 20                    // Fixed frame rate
#define DECOMPRESS_BUFFER_SIZE 8192

// Main loop architecture
void setup() {
    FastLED.addLeds<WS2812B, LED_PIN, GRB>(leds, NUM_LEDS);
    WiFi.begin(ssid, password);
    wsServer.begin();            // WebSocket server
    setupAudioPWM();
}

void loop() {
    wsServer.loop();             // Handle WebSocket messages
    
    if (newAnimationReceived) {
        decompressAnimation();
        startAnimation();
        newAnimationReceived = false;
    }
    
    updateLEDFrame();            // Interpolate and display current frame
    updateAudio();               // Play current audio notes
    
    delay(1000/FPS);             // Maintain frame rate
}
```

### Animation Engine

#### Keyframe Interpolation
```cpp
struct KeyFrame {
    unsigned long ms;
    CRGB leds[NUM_LEDS];
};

void interpolateLEDs(KeyFrame &prev, KeyFrame &next, float progress) {
    for(int i = 0; i < NUM_LEDS; i++) {
        leds[i].r = lerp(prev.leds[i].r, next.leds[i].r, progress);
        leds[i].g = lerp(prev.leds[i].g, next.leds[i].g, progress);
        leds[i].b = lerp(prev.leds[i].b, next.leds[i].b, progress);
    }
}

void updateLEDPattern() {
    if (!currentAnimation) return;
    
    unsigned long now = millis() - animationStartTime;
    KeyFrame *prev = findPreviousKeyframe(now);
    KeyFrame *next = findNextKeyframe(now);
    
    if (prev && next) {
        float progress = (now - prev->ms) / (float)(next->ms - prev->ms);
        interpolateLEDs(*prev, *next, progress);
        FastLED.show();
    }
}
```

#### Audio Synthesis
```cpp
struct AudioNote {
    unsigned long start_ms;
    unsigned long duration;
    float frequency;
    WaveType wave;
    int duty_cycle;
};

void updateAudio() {
    unsigned long now = millis() - animationStartTime;
    
    for (auto &note : currentAnimation->audio) {
        if (now >= note.start_ms && now < note.start_ms + note.duration) {
            playNote(note, now - note.start_ms);
        }
    }
}

void playNote(AudioNote &note, unsigned long elapsed) {
    float freq = note.frequency;
    
    // Handle frequency sweeps
    if (note.freq_end != note.freq_start) {
        float progress = elapsed / (float)note.duration;
        freq = note.freq_start + (note.freq_end - note.freq_start) * progress;
    }
    
    // Generate waveforms
    switch (note.wave) {
        case SQUARE:
            ledcSetup(0, freq, 8);
            ledcAttachPin(AUDIO_PIN_1, 0);
            ledcWrite(0, note.duty_cycle * 255 / 100);
            break;
            
        case TRIANGLE:
            // Two pins with 180° phase offset
            generateTriangleWave(freq);
            break;
            
        case SAWTOOTH:
            generateSawtoothWave(freq);
            break;
            
        case NOISE:
            generateNoise();
            break;
    }
}
```

### Memory Management (Simplified)

```cpp
// Single animation buffer in RAM
struct Animation {
    uint16_t duration_ms;
    uint16_t frame_count;
    Frame* frames;           // Dynamically allocated
    uint16_t note_count;
    AudioNote* notes;        // Dynamically allocated
};

Animation currentAnimation;

// Decompression
void decompressAnimation(uint8_t* compressed, size_t compressedSize) {
    // Free previous animation
    if (currentAnimation.frames) free(currentAnimation.frames);
    if (currentAnimation.notes) free(currentAnimation.notes);
    
    // Decompress to buffer
    uint8_t buffer[DECOMPRESS_BUFFER_SIZE];
    size_t decompressedSize;
    mz_uncompress(buffer, &decompressedSize, compressed, compressedSize);
    
    // Parse binary data into Animation struct
    parseAnimation(buffer, &currentAnimation);
}
```

**No storage needed!** Animations are always sent fresh from the server.

## MCP Tool Interface

### Function Definition
```python
from mcp import Tool

@Tool
def update_status(message: str, urgency: str = "normal") -> dict:
    """
    Report a development event for visual notification
    
    Args:
        message: Natural language description of what happened
        urgency: "low" | "normal" | "high" | "urgent"
    
    Returns:
        {"status": "queued", "estimated_display_time": "2025-06-06T14:30:15Z"}
    """
    
    # Automatic context collection
    context = {
        "message": message,
        "urgency": urgency,
        "auto_context": {
            "project": get_project_name(),
            "git_branch": get_current_branch(),
            "working_dir": os.getcwd(),
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "time_of_day": datetime.now().hour,
            "git_status": get_git_status()
        }
    }
    
    # Send to notification service
    response = requests.post(f"{NOTIFICATION_SERVICE_URL}/notify", json=context)
    return response.json()
```

### Usage Examples
```python
# Simple notifications
update_status("Tests passed, all 47 cases successful!")
update_status("Build failed: missing dependency 'requests'", urgency="high")
update_status("Deployment complete, 1,247 users migrated")

# Context-rich notifications  
update_status("Authentication tests failing again, 4th attempt today", urgency="high")
update_status("Performance improved: API response time down 40%")
update_status("Code review approved, ready for merge")
```

## Notification Service Architecture

### Pattern Library Schema
```json
{
  "animation_id": "gentle_success_v3",
  "keyframes": [...],
  "audio_sequence": [...],
  "metadata": {
    "tags": ["success", "gentle", "green", "celebration"],
    "created": "2025-06-06T10:15:00Z",
    "parent_animation": "basic_success_v1", 
    "usage_count": 23,
    "effectiveness_score": 8.7,
    "user_feedback": ["perfect timing", "love the green"],
    "contexts": ["test_success", "build_success", "deployment_success"],
    "size_bytes": 1420
  }
}
```

### Claude Integration Pipeline
```python
class NotificationService:
    def process_message(self, context):
        # 1. Analyze context and emotional tone
        analysis = claude.analyze_context(context)
        
        # 2. Search pattern library
        candidates = self.pattern_library.search(analysis.tags)
        
        # 3. Select or create pattern
        if candidates:
            pattern = claude.select_best_pattern(candidates, context)
        else:
            pattern = claude.create_new_pattern(analysis)
        
        # 4. Send to device
        self.send_to_device(pattern)
        
        # 5. Track for learning
        self.track_usage(pattern, context)
```

## Performance Specifications

### Timing Requirements
- **LED Update Rate**: 20 FPS fixed (50ms intervals)
- **Audio Latency**: <10ms for note changes
- **Network Transfer**: ~50ms for typical animation (300-500 bytes)
- **Decompression Time**: <20ms for 3-second animation
- **Animation Start**: <100ms from command receipt
- **Memory Usage**: ~8KB decompression buffer + current animation

### Network Protocol
- **Transport**: WebSocket binary frames only
- **Compression**: zlib level 1 (fast)
- **Typical sizes**: 300-500 bytes for 3-second animation
- **Reconnection**: Exponential backoff (1s, 2s, 4s, 8s, max 30s)
- **Offline Mode**: Continue current animation, drop new commands

### Benefits of Compression
- **No storage needed**: All animations streamed on-demand
- **Unlimited patterns**: Server can store thousands
- **Real-time generation**: Claude can create new patterns instantly
- **Bandwidth efficient**: 95%+ compression ratio

## Testing & Validation

### Hardware Testing
```cpp
// LED ring test pattern
void testLEDRing() {
    for (int i = 0; i < NUM_LEDS; i++) {
        fill_solid(leds, NUM_LEDS, CRGB::Black);
        leds[i] = CRGB::Red;
        FastLED.show();
        delay(100);
    }
}

// Audio channel test
void testAudio() {
    int frequencies[] = {261, 294, 330, 349, 392, 440, 494, 523};
    for (int freq : frequencies) {
        ledcWriteTone(0, freq);
        delay(250);
    }
    ledcWriteTone(0, 0);
}
```

### Protocol Validation
```python
def test_protocol_compliance():
    # Test message structure
    assert message["protocol"] == "1.0"
    assert "action" in message
    assert "command_id" in message
    
    # Test animation format
    animation = message["animations"]["add"][0]
    assert len(animation["keyframes"][0]["leds"]) == 20
    assert all(0 <= color <= 255 for led in animation["keyframes"][0]["leds"] for color in led)
```

## Implementation Checklist

### Phase 1: Hardware & Basic Firmware
- [ ] ESP32 breadboard prototype with LED ring
- [ ] Audio amplifier circuit testing  
- [ ] WS2812B control with FastLED
- [ ] Basic WiFi connectivity and WebSocket server
- [ ] Binary protocol decoder
- [ ] zlib decompression (miniz library)
- [ ] LED frame interpolation (20 FPS)
- [ ] PWM audio generation (square waves initially)
- [ ] 3D printed enclosure v1

### Phase 2: Server & Integration  
- [ ] Animation JSON format definition
- [ ] Binary encoder and zlib compression
- [ ] WebSocket server for animation delivery
- [ ] MCP tool for Claude Code
- [ ] Basic notification service
- [ ] Pattern library with 10+ animations
- [ ] End-to-end testing (<100ms latency)

### Phase 3: Intelligence & Polish
- [ ] Claude integration for pattern selection
- [ ] Claude-generated custom animations
- [ ] More audio waveforms (triangle, sawtooth)
- [ ] Time-of-day aware brightness
- [ ] Smooth animation transitions
- [ ] OTA firmware updates

---

**Protocol Version**: 1.0  
**Firmware Version**: 1.0.0  
**Last Updated**: June 6, 2025