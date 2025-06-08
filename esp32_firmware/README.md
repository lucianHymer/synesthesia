# ESP32 Firmware

Embedded firmware for ESP32 devices that controls LED strips and audio feedback based on animation data received via WebSocket.

## Features

- **WebSocket Communication**: Receives commands from notification service
- **LED Control**: Drives WS2812B LED strips (20 LEDs)
- **Audio Output**: 2-voice audio synthesis with multiple waveforms
- **Animation Playback**: Smooth 20fps animation rendering
- **Memory Management**: Efficient binary data decompression

## Hardware Requirements

- **ESP32 Development Board**: Any ESP32 variant with WiFi
- **LED Strip**: WS2812B addressable LEDs (20 LEDs maximum)  
- **Audio Output**: PWM audio via GPIO pins
- **Power Supply**: 5V for LED strip, 3.3V for ESP32

## Pin Configuration

```cpp
#define LED_PIN      5    // WS2812B LED strip data pin
#define AUDIO_PIN_0  25   // PWM audio output voice 0
#define AUDIO_PIN_1  26   // PWM audio output voice 1
```

## Protocol

The ESP32 receives binary animation data via WebSocket:

```json
{
  "type": "play",
  "data": "base64-encoded-zlib-compressed-binary"
}
```

Responds with status:

```json
{
  "status": "playing" | "error",
  "error": "invalid_data" | "out_of_memory" | "decompression_failed",
  "started_at": "2024-01-01T12:00:00Z"
}
```

## Development

```bash
# Install PlatformIO CLI
pip install platformio

# Build firmware
pio run

# Upload to device
pio run --target upload

# Monitor serial output
pio monitor

# Run tests (requires hardware)
pio test

# Clean build
pio run --target clean
```

## Configuration

Update `platformio.ini` for your setup:

```ini
[env:esp32dev]
platform = espressif32
board = esp32dev
framework = arduino

# WiFi credentials (for development)
build_flags = 
  -DWIFI_SSID='"YourWiFi"'
  -DWIFI_PASSWORD='"YourPassword"'
```

## WiFi Setup

The device creates a WiFi access point on first boot for configuration:

1. Connect to `Synesthesia-Setup` network
2. Navigate to `http://192.168.4.1`
3. Enter your WiFi credentials
4. Device will connect and display its IP address

## Animation Format

The ESP32 expects animations in the binary format produced by the animation_encoder:

- **Header**: Animation metadata (duration, fps, frame count)
- **Frames**: RGB values for each LED at specific timestamps
- **Audio**: Note data with frequency, duration, and waveform

## Memory Management

- **Maximum Animation Size**: 64KB compressed
- **Frame Buffer**: Double-buffered for smooth playback
- **Audio Buffer**: Circular buffer for real-time synthesis
- **Heap Usage**: ~30KB for typical animations

## Debugging

Enable debug output in `main.cpp`:

```cpp
#define DEBUG_ENABLED 1
```

View logs via serial monitor:

```bash
pio monitor --baud 115200
```

## Troubleshooting

**LEDs not lighting up:**
- Check LED strip power supply (5V)
- Verify data pin connection (GPIO 5)
- Test with simple color patterns

**WebSocket connection fails:**
- Check WiFi credentials
- Verify network connectivity
- Monitor serial output for error messages

**Audio not working:**
- Check PWM pin connections (GPIO 25/26)
- Verify audio output hardware
- Test with simple tone generation