# ESP32 Firmware - CLAUDE.md

PlatformIO C++ firmware for ESP32 devices with LED control and WebSocket communication.

## Development Commands

### Build & Upload
```bash
pio run                       # Build firmware
pio run --target upload       # Upload to connected ESP32
pio run --target clean        # Clean build files
```

### Testing & Monitoring
```bash
pio test                      # Run tests (requires hardware)
pio device monitor            # Serial monitor for debugging
pio device monitor --baud 115200  # Monitor with specific baud rate
```

### Environment Management
```bash
pio run -e esp32dev           # Build for specific environment
pio device list               # List connected devices
pio device monitor            # Interactive device monitoring
```

## Architecture

### Core Components
- **main.cpp** - Main application loop and initialization
- WiFi connection management
- WebSocket client for notification service communication
- LED strip control using FastLED library

### Key Features
- **LED Control** - FastLED-based RGB LED strip management
- **WebSocket Client** - Real-time communication with notification service
- **Binary Protocol** - Efficient animation data decoding
- **WiFi Management** - Automatic connection and reconnection

### Communication Protocol
- WebSocket connection to notification service
- Binary animation data from Rust encoder
- Compressed format with zlib decompression
- Real-time LED pattern updates

## Hardware Configuration

### Supported Boards
- ESP32 DevKit V1
- ESP32-WROOM-32
- Other ESP32 variants (modify platformio.ini)

### LED Strip Connection
- Data pin: GPIO pin (configurable in main.cpp)
- Power: 5V external supply recommended
- Ground: Common ground with ESP32

### Pin Configuration
- Configure LED data pin in main.cpp
- Optional status LED for connection indication
- Serial output on GPIO1/GPIO3 for debugging

## Testing Strategy

### Hardware Tests
- Requires physical ESP32 and LED strip
- `pio test` runs on-device validation
- Serial monitor for runtime debugging

### Integration Testing
- WebSocket connection to notification service
- Binary animation decoding verification
- LED pattern rendering validation

## Configuration

### WiFi Setup
- Configure SSID and password in main.cpp
- Automatic reconnection on connection loss
- Status indicators via LED or serial output

### Build Configuration
- **platformio.ini** - Build settings and dependencies
- Framework: Arduino for ESP32
- Libraries: FastLED, WebSocket client
- Board configuration and upload settings