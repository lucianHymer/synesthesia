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
pio device monitor

# Run tests (requires hardware)
pio test

# Clean build
pio run --target clean
```

## Configuration

The device configuration is managed through the WiFi portal. No hardcoded credentials needed!

For development, you can modify default values in `main.cpp`:

```cpp
const char* notificationHost = "192.168.1.100"; // Your notification service IP
const int notificationPort = 3001;
String deviceId = "esp32_led_strip_01";
```

## WiFi Setup

The device uses WiFiManager for easy WiFi configuration:

### First Time Setup

1. Power on the device - LEDs will turn blue indicating setup mode
2. On your phone/computer, connect to WiFi network "ESP32_LED_Setup" (password: "setup123")
3. A configuration portal should open automatically
   - If not, open browser to http://192.168.4.1
4. Click "Configure WiFi" and enter:
   - Select your WiFi network from the scan list
   - Enter WiFi password
   - Notification Host IP (default: 192.168.1.100)
   - Notification Port (default: 3001)
   - Device ID (default: esp32_led_strip_01)
5. Click Save - LEDs will flash green briefly
6. Device will restart and connect to your WiFi

### LED Status Indicators

- **Blue solid**: Configuration/AP mode active
- **Green solid**: Connected to WiFi successfully  
- **Green flash**: Configuration saved
- **Red solid**: Connection failed (will restart)
- **Animation Playing**: Pattern-specific colors

### Operation

Once WiFi is configured, the device always operates as a client connecting to the notification service. If WiFi connection is lost, the device will automatically restart and attempt to reconnect.

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
pio device monitor --baud 115200
```

## Troubleshooting

**LEDs not lighting up:**
- Check LED strip power supply (5V)
- Verify data pin connection (GPIO 5)
- Test with simple color patterns

**WebSocket connection fails:**
- Ensure WiFi is properly configured via portal
- Verify notification service is running
- Check notification host IP and port settings
- Monitor serial output for connection status

**WiFi Configuration Issues:**
- Portal timeout is 3 minutes - reconnect if needed
- Device restarts automatically after timeout
- Blue LED indicates configuration mode
- Check serial monitor for portal IP address

**Audio not working:**
- Check PWM pin connections (GPIO 25/26)
- Verify audio output hardware
- Test with simple tone generation

**Reset WiFi Settings:**
- Power cycle device twice within 10 seconds
- Or add a reset button to trigger `wifiManager.resetSettings()`