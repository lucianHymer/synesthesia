# Notification Service - CLAUDE.md

Node.js TypeScript service providing REST API and MCP integration for LED notifications.

## Development Commands

### Build
```bash
npm run build                  # TypeScript compilation
npm run dev                   # Development mode with hot reload
npm run dev -- --mcp         # Development with MCP integration
```

### Testing
```bash
npm test                      # Run Jest tests
npm test -- --coverage       # Run tests with coverage report
npm test -- --watch          # Watch mode for development
```

### Linting & Type Checking
```bash
npm run lint                  # ESLint
npm run typecheck             # TypeScript compiler check
npm run lint:fix              # Auto-fix linting issues
```

## Architecture

### Core Services
- **NotificationService.ts** - Main orchestration and business logic
- **DeviceManager.ts** - WebSocket connections to ESP32 devices
- **PatternLibrary.ts** - LED animation pattern storage and retrieval

### API Layer
- **api/routes.ts** - Express REST endpoints
- `POST /api/notify` - Send notification with pattern_id
- `GET /api/patterns` - List available patterns
- `GET /health` - Service health check

### MCP Integration
- **mcp/index.ts** - MCP server implementation
- **mcp/tools.ts** - Claude Code tool definitions
- **mcp/patterns.ts** - Pattern management tools
- **mcp/context.ts** - Shared MCP context

### Device Communication
- **device/DeviceConnection.ts** - Individual device WebSocket wrapper
- **device/DeviceManager.ts** - Multi-device connection management
- WebSocket protocol for real-time LED control

### Animation Encoding
- **encoder/encoderIntegration.ts** - Rust encoder wrapper
- **encoder/mockEncoder.ts** - Test double for development
- Binary format optimized for ESP32 transmission

## Testing Strategy

### Unit Tests
- Service method isolation with dependency injection
- Mock encoder for testing without Rust dependency
- Pattern library CRUD operations

### Integration Tests
- Full API endpoint testing
- WebSocket device communication
- MCP tool integration (excluding from coverage)

### Test Configuration
- Jest with ESM support (jest.config.js)
- Setup file: jest.setup.js
- TypeScript paths resolved for imports

## Configuration

### Environment Variables
- `PORT` - HTTP server port (default: 3000)
- `NODE_ENV` - Environment mode
- `LOG_LEVEL` - Logging verbosity

### TypeScript Setup
- ES modules (type: "module" in package.json)
- Strict type checking enabled
- Path mapping for clean imports