# LED Notification Binary Protocol v1.0

## Overview

Binary protocol for efficiently transmitting LED animations and audio from server to ESP32. Assumes fixed 20 FPS playback rate.

## Protocol Structure

### Wire Format
```
WebSocket Binary Frame containing:
[Compressed Data] = zlib.compress(Binary Animation Data, level=1)
```

### Binary Animation Data Format

```
[Header: 4 bytes]
├─ Magic Number: 0xED01 (2 bytes) - identifies valid animation data
├─ Version: 0x01 (1 byte) - protocol version
└─ Flags: (1 byte)
   ├─ Bit 0: Has audio data (0 = no audio, 1 = audio included)
   ├─ Bit 1: Loop animation (0 = play once, 1 = loop)
   └─ Bits 2-7: Reserved for future use

[Animation Metadata: 4 bytes]
├─ Duration: (2 bytes) - total animation duration in milliseconds
└─ Frame Count: (2 bytes) - number of frames in animation

[Frame Data: Variable length]
└─ For each frame:
   ├─ Timestamp: (2 bytes) - milliseconds from start
   └─ LED Data: (60 bytes) - 20 LEDs × 3 bytes (R, G, B)

[Audio Data: Variable length] - only if audio flag is set
├─ Note Count: (2 bytes) - number of audio notes
└─ For each note:
   ├─ Start Time: (2 bytes) - milliseconds from start
   ├─ Duration: (2 bytes) - note duration in milliseconds
   ├─ Frequency: (2 bytes) - frequency in Hz (0-20000)
   └─ Voice/Channel: (1 byte) - 0 or 1 for dual channel audio
```

## Data Types

- **All multi-byte integers**: Little-endian byte order
- **RGB values**: 0-255 per channel
- **Timestamps**: Milliseconds, relative to animation start
- **Frequencies**: Hz units, 0 = silence

## Example Binary Layout

For a 1-second animation with 2 frames and 2 notes:

```
Offset  Value           Description
------  --------------  -----------
0x0000  ED 01          Magic number
0x0002  01             Version 1
0x0003  01             Flags (has audio)
0x0004  E8 03          1000ms duration
0x0006  14 00          20 frames
0x0008  00 00          Frame 1: time = 0ms
0x000A  FF 00 00 ...   Frame 1: 20 LEDs (60 bytes)
0x0046  32 00          Frame 2: time = 50ms  
0x0048  80 00 00 ...   Frame 2: 20 LEDs (60 bytes)
...
0x02F8  02 00          2 audio notes
0x02FA  00 00          Note 1: start = 0ms
0x02FC  C8 00          Note 1: duration = 200ms
0x02FE  B8 01          Note 1: freq = 440Hz
0x0300  00             Note 1: voice 0
0x0301  C8 00          Note 2: start = 200ms
0x0303  C8 00          Note 2: duration = 200ms
0x0305  70 03          Note 2: freq = 880Hz
0x0307  00             Note 2: voice 0
```

## Compression

- Use zlib compression level 1 (fastest)
- Typical compression ratios: 85-95% reduction
- Uncompressed: ~1.2KB → Compressed: ~150-300 bytes

## Implementation Notes

### Server-Side Encoder (Python)
```python
import struct
import zlib

def encode_animation(animation_json):
    # Header
    data = struct.pack('<HBB', 0xED01, 1, flags)
    
    # Metadata
    data += struct.pack('<HH', duration_ms, frame_count)
    
    # Frames
    for frame in frames:
        data += struct.pack('<H', frame['time_ms'])
        for led in frame['leds']:
            data += struct.pack('BBB', led[0], led[1], led[2])
    
    # Audio (if present)
    if has_audio:
        data += struct.pack('<H', len(audio_notes))
        for note in audio_notes:
            data += struct.pack('<HHHB', 
                note['start_ms'], 
                note['duration_ms'],
                note['freq_hz'], 
                note['voice'])
    
    return zlib.compress(data, 1)
```

### ESP32 Decoder (C++)
```cpp
struct AnimationHeader {
    uint16_t magic;
    uint8_t version;
    uint8_t flags;
    uint16_t duration_ms;
    uint16_t frame_count;
} __attribute__((packed));

struct Frame {
    uint16_t timestamp;
    uint8_t leds[20][3];
} __attribute__((packed));

struct AudioNote {
    uint16_t start_ms;
    uint16_t duration_ms;
    uint16_t frequency;
    uint8_t voice;
} __attribute__((packed));
```

## Benefits

1. **Efficient**: ~300 bytes for typical 3-second animation
2. **Simple**: Fixed structure, easy to parse
3. **Fast**: Minimal processing required on ESP32
4. **Flexible**: Supports audio and future extensions via flags