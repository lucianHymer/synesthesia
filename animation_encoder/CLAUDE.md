# Animation Encoder - CLAUDE.md

Rust crate for binary animation encoding, optimized for ESP32 memory constraints.

## Development Commands

### Build
```bash
cargo build                    # Debug build
cargo build --release         # Release build
```

### Testing
```bash
cargo test                     # Run all tests
cargo test --release          # Run tests in release mode
cargo test integration_tests  # Run integration tests only
```

### Linting
```bash
cargo clippy -- -D warnings   # Lint with warnings as errors
cargo fmt                     # Format code
```

### Node.js Bindings
```bash
npm install                    # Install dependencies
npm run build                 # Build native module
npm test                      # Test Node.js bindings
```

## Architecture

### Core Components
- **lib.rs** - Main encoding/decoding logic with serde JSON support
- **build.rs** - Build configuration for native Node.js module
- **integration_tests.rs** - End-to-end encoding/decoding tests

### Key Functions
- `encode_animation()` - Converts JSON animation to binary format
- `decode_animation()` - Converts binary back to JSON (for testing)
- Binary format uses zlib compression for ESP32 efficiency

### Node.js Integration
- Native module exports for TypeScript notification service
- Type definitions in index.d.ts
- Wrapper functions in index.js

## Testing Strategy

### Unit Tests (Rust)
- Property-based testing for encode/decode round trips
- Edge case validation (empty animations, large datasets)
- Performance benchmarks for encoding speed

### Integration Tests
- Full JSON-to-binary-to-JSON verification
- Compatibility testing with ESP32 expected format
- Cross-platform build validation

## Dependencies
- **serde** - JSON serialization/deserialization
- **flate2** - zlib compression for binary output
- **napi** - Node.js native addon interface