# Test-Driven Development Plan for Team 1

## TDD Philosophy
Write tests first, then implement minimal code to make tests pass, then refactor.

## Testing Layers

### 1. Rust Encoder Library Tests

#### Unit Tests Structure
```
animation_encoder/
├── src/
│   ├── lib.rs
│   ├── binary.rs      # Binary encoding logic
│   ├── compression.rs # Zlib compression
│   └── validation.rs  # Input validation
└── tests/
    ├── unit/
    │   ├── binary_test.rs
    │   ├── compression_test.rs
    │   └── validation_test.rs
    └── integration/
        └── round_trip_test.rs
```

#### Test Cases - Priority Order

##### Phase 1: Basic Structure Tests
```rust
// Test 1: Empty animation encoding
#[test]
fn test_encode_empty_animation() {
    let anim = Animation {
        duration_ms: 0,
        fps: 20,
        frames: vec![],
        audio: vec![],
    };
    let result = encode_animation(&anim).unwrap();
    // Verify header bytes
}

// Test 2: Single frame encoding
#[test]
fn test_encode_single_frame() {
    let anim = Animation {
        duration_ms: 1000,
        fps: 20,
        frames: vec![Frame {
            time_ms: 0,
            leds: [[0, 0, 0]; 20],
        }],
        audio: vec![],
    };
    let result = encode_animation(&anim).unwrap();
    // Verify header + frame data
}

// Test 3: Header format validation
#[test]
fn test_header_format() {
    // Test version, duration, fps encoding
    // Verify little-endian byte order
}
```

##### Phase 2: Complex Animation Tests
```rust
// Test 4: Multi-frame animation
#[test]
fn test_encode_multiple_frames() {
    // 2-second animation with keyframes
}

// Test 5: Audio note encoding
#[test]
fn test_encode_audio_notes() {
    // Single and multiple audio notes
}

// Test 6: Full animation with audio
#[test]
fn test_encode_complete_animation() {
    // Frames + audio notes
}
```

##### Phase 3: Edge Cases & Validation
```rust
// Test 7: Maximum size limits
#[test]
fn test_maximum_animation_size() {
    // 10-second animation at 20 FPS
}

// Test 8: Invalid input handling
#[test]
fn test_invalid_fps() {
    // fps != 20 should error
}

// Test 9: Compression verification
#[test]
fn test_compression_ratio() {
    // Verify zlib compression works
}
```

### 2. ESP32 Firmware Tests

#### Test Structure
```
esp32_firmware/
├── src/
│   ├── main.cpp
│   ├── websocket.cpp
│   ├── decoder.cpp
│   ├── animation.cpp
│   └── audio.cpp
└── test/
    ├── test_decoder.cpp
    ├── test_animation.cpp
    └── test_integration.cpp
```

#### Test Cases

##### Phase 1: Core Functionality
```cpp
// Test 1: Binary header parsing
void test_parse_header() {
    uint8_t data[] = {0x01, 0x00, 0xE8, 0x03, 0x14, 0x00, 0x02, 0x00, 0x01, 0x00};
    AnimationHeader header;
    assert(parse_header(data, &header) == true);
    assert(header.version == 0x0001);
    assert(header.duration_ms == 1000);
}

// Test 2: Frame data extraction
void test_parse_frame() {
    // Test frame timestamp and LED data
}

// Test 3: Memory bounds checking
void test_buffer_overflow_protection() {
    // Ensure we don't read past buffer
}
```

##### Phase 2: WebSocket Tests
```cpp
// Test 4: JSON message parsing
void test_parse_websocket_message() {
    const char* msg = "{\"type\":\"play\",\"data\":\"base64data\"}";
    // Verify extraction of type and data
}

// Test 5: Base64 decoding
void test_base64_decode() {
    // Test valid and invalid base64
}

// Test 6: Error response generation
void test_error_response() {
    // Verify JSON error formatting
}
```

### 3. Integration Test Suite

#### Round-Trip Tests
```rust
// Test complete flow: JSON → Binary → Compressed → Decompressed → Parsed
#[test]
fn test_full_round_trip() {
    // 1. Create animation in Rust
    let original = create_test_animation();
    
    // 2. Encode to binary
    let encoded = encode_animation(&original)?;
    
    // 3. Simulate ESP32 decompression
    let decompressed = decompress(encoded)?;
    
    // 4. Parse binary back to structures
    let parsed = parse_animation(decompressed)?;
    
    // 5. Verify data integrity
    assert_eq!(original, parsed);
}
```

#### Performance Tests
```rust
#[test]
fn test_encoding_performance() {
    let anim = create_large_animation(); // 10 seconds
    let start = Instant::now();
    let _ = encode_animation(&anim).unwrap();
    let duration = start.elapsed();
    assert!(duration.as_millis() < 50); // Must encode in <50ms
}
```

### 4. Hardware-in-Loop Tests

#### LED Pattern Verification
```python
# test_led_patterns.py
def test_fade_animation():
    # Send fade animation
    # Capture LED output with camera/sensor
    # Verify color transitions
    pass

def test_animation_timing():
    # Send timed pattern
    # Measure actual frame rate
    # Verify 20 FPS ± 5%
    pass
```

#### Audio Waveform Tests
```python
def test_audio_waveforms():
    # Generate each waveform type
    # Record audio output
    # FFT analysis to verify frequency
    pass

def test_audio_sync():
    # Send animation with synchronized audio
    # Verify audio starts with LED changes
    pass
```

## Test Execution Plan

### Development Workflow
1. **Write failing test** for next feature
2. **Implement minimal code** to pass test
3. **Refactor** for clarity/performance
4. **Run all tests** to ensure no regression
5. **Commit** with test and implementation

### Continuous Integration
```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]

jobs:
  rust-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: cd animation_encoder && cargo test
      
  esp32-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: platformio test -e native
```

### Test Coverage Goals
- Rust encoder: 95% coverage
- ESP32 decoder: 90% coverage
- Integration: All critical paths
- Hardware: Manual verification checklist

## Mock Data for Testing

### Test Animations
```rust
// Simple test animation
pub fn create_simple_animation() -> Animation {
    Animation {
        duration_ms: 1000,
        fps: 20,
        frames: vec![
            Frame { time_ms: 0, leds: [[0, 0, 0]; 20] },
            Frame { time_ms: 500, leds: [[255, 0, 0]; 20] },
            Frame { time_ms: 1000, leds: [[0, 0, 0]; 20] },
        ],
        audio: vec![
            AudioNote {
                start_ms: 0,
                duration_ms: 200,
                frequency: 440,
                voice: 0,
                waveform: Waveform::Square,
            },
        ],
    }
}

// Edge case animations
pub fn create_maximum_animation() -> Animation {
    // 10-second animation at 20 FPS = 200 frames
}

pub fn create_minimum_animation() -> Animation {
    // Single frame, no audio
}
```

## Success Metrics

### Test Quality
- Clear test names describing behavior
- Single assertion per test when possible
- Fast execution (<1s per test)
- Deterministic results

### Coverage Targets
- Statement coverage: >90%
- Branch coverage: >85%
- Critical path coverage: 100%

### Performance Benchmarks
- Encoding time: <50ms for 10s animation
- Decoding time: <30ms for 10s animation  
- Memory usage: <8KB peak
- Latency: <100ms end-to-end