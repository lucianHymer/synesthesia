# Integration Plan: Combining Team Branches

## Overview
Combine the three team branches into a cohesive multi-package project with clear separation between Rust and TypeScript components.

## Current State
- **Team1**: Rust encoder + ESP32 firmware (separate ecosystems)
- **Team2**: Node.js notification service 
- **Team3**: Node.js MCP server for Claude Code integration

## Target Architecture

```
synesthesia/
├── animation_encoder/          # Rust crate (team1)
│   ├── Cargo.toml
│   ├── src/lib.rs
│   ├── tests/
│   └── README.md
├── esp32_firmware/             # PlatformIO project (team1) 
│   ├── platformio.ini
│   ├── src/main.cpp
│   └── README.md
├── notification_service/       # Combined Node.js server
│   ├── package.json
│   ├── src/
│   │   ├── api/               # REST endpoints (team2)
│   │   ├── mcp/               # MCP integration (team3)
│   │   ├── device/            # WebSocket/device mgmt (team2)
│   │   ├── patterns/          # Pattern library + AI selection
│   │   ├── encoder/           # Rust FFI integration (team2)
│   │   ├── services/          # Business logic
│   │   └── index.ts
│   ├── tests/
│   └── README.md
├── README.md                   # Root project overview
└── Makefile                    # Top-level commands
```

## Integration Steps

### 1. Merge Team Branches
1. Merge `team1` branch first (foundational)
2. Merge `team2` branch (will detect team1's encoder)
3. Merge `team3` branch (MCP server)
4. Resolve conflicts:
   - Combine `.gitignore` entries (Rust + Node.js)
   - Merge README content from team2 and team3

### 2. Restructure Directories
1. Keep `animation_encoder/` and `esp32_firmware/` as-is
2. Rename team2's root structure to `notification_service/`
3. Move team3's `led-status-server/src/` into `notification_service/src/mcp/`
4. Organize remaining team2 code into logical subdirectories

### 3. Combine TypeScript Services
- **Keep separate endpoints**: `/api/notify`, `/api/patterns` (no `/api/select-pattern`)
- **Internal integration**: MCP handlers call pattern selection logic directly
- **Single server**: One Express app, one deployment

### 4. Package Structure

#### Root Package (`/`)
- **Purpose**: Orchestration, documentation, top-level commands
- **Commands**:
  ```bash
  make test          # Test all packages
  make build         # Build all packages  
  make dev           # Start dev environment
  make clean         # Clean all build artifacts
  ```

#### Animation Encoder (`/animation_encoder/`)
- **Purpose**: Rust library for binary encoding
- **Commands**:
  ```bash
  cargo test         # Run Rust tests
  cargo build        # Build library
  cargo publish      # Publish to crates.io (future)
  ```

#### ESP32 Firmware (`/esp32_firmware/`)
- **Purpose**: Device firmware for LED control
- **Commands**:
  ```bash
  pio test           # Run embedded tests
  pio run            # Build and upload firmware
  pio monitor        # Serial monitor
  ```

#### Notification Service (`/notification_service/`)
- **Purpose**: Combined Node.js server (team2 + team3)
- **Commands**:
  ```bash
  npm test           # Run all service tests
  npm run test:unit  # Unit tests only
  npm run test:integration # Integration tests
  npm run build      # TypeScript compilation
  npm run dev        # Development server
  npm start          # Production server
  npm run lint       # ESLint + type checking
  ```

### 5. Documentation Plan

#### Root README.md
- Project overview and architecture
- Quick start guide
- Links to package-specific READMEs
- Development workflow

#### Package READMEs
- **`animation_encoder/README.md`**: Rust API, binary format, usage examples
- **`esp32_firmware/README.md`**: Hardware setup, flashing, debugging
- **`notification_service/README.md`**: API docs, deployment, configuration

#### Root Makefile
```makefile
.PHONY: test build dev clean install

install:
	cd animation_encoder && cargo build
	cd notification_service && npm install

test:
	cd animation_encoder && cargo test
	cd notification_service && npm test
	# ESP32 tests require hardware

build:
	cd animation_encoder && cargo build --release
	cd notification_service && npm run build

dev:
	cd notification_service && npm run dev

clean:
	cd animation_encoder && cargo clean
	cd notification_service && npm run clean
	cd esp32_firmware && pio run --target clean

lint:
	cd animation_encoder && cargo clippy
	cd notification_service && npm run lint
```

## Interface Consistency
All packages follow `shared_interfaces_v2.md`:
- **Rust encoder**: Produces binary format for ESP32
- **ESP32 firmware**: Consumes binary animations via WebSocket
- **Node.js service**: Orchestrates encoding, device communication, and AI selection
- **MCP integration**: Calls service APIs for Claude Code integration

## Key Benefits
1. **Clear separation**: Each package has distinct responsibilities
2. **Independent testing**: Test Rust, firmware, and Node.js separately
3. **Flexible deployment**: Service can run without hardware for development
4. **Maintainable**: Package boundaries match team expertise
5. **Efficient development**: Top-level commands for common workflows

## Next Steps
1. Execute merge plan
2. Restructure directories
3. Combine TypeScript services
4. Write package READMEs
5. Create root Makefile
6. Test integration end-to-end