# Test-Driven Development Plan

## Overview

This document outlines the TDD approach for building the Core Notification Service. Each component will be developed test-first, ensuring high quality and maintainability.

## Testing Framework Setup

- **Test Runner**: Jest
- **Language**: TypeScript
- **Mocking**: Jest built-in mocks
- **Coverage Target**: 90%+

## Development Order (TDD)

### Phase 1: Core Data Models and Interfaces
Start with the simplest, most foundational pieces.

#### 1.1 Pattern Model Tests
```typescript
describe('Pattern', () => {
  test('should create valid pattern from JSON');
  test('should validate required fields');
  test('should reject invalid LED arrays');
  test('should enforce 20 FPS constraint');
  test('should validate audio note frequencies');
});
```

#### 1.2 Notification Model Tests
```typescript
describe('Notification', () => {
  test('should create notification request from text');
  test('should validate text length limits');
  test('should generate proper response format');
});
```

### Phase 2: Pattern Library (File Storage)

#### 2.1 PatternLibrary Tests
```typescript
describe('PatternLibrary', () => {
  describe('loadPattern', () => {
    test('should load pattern by ID');
    test('should throw error for missing pattern');
    test('should cache loaded patterns');
  });
  
  describe('listPatterns', () => {
    test('should return all patterns with metadata');
    test('should handle empty pattern directory');
  });
  
  describe('savePattern', () => {
    test('should save new pattern to disk');
    test('should update existing pattern');
    test('should validate pattern before saving');
  });
  
  describe('searchPatterns', () => {
    test('should find patterns by tags');
    test('should search in descriptions');
    test('should handle no matches');
  });
});
```

### Phase 3: Default Pattern Selection

#### 3.1 PatternSelector Tests
```typescript
describe('PatternSelector', () => {
  describe('selectFallback', () => {
    test('should return default pattern when pattern not found');
    test('should handle missing pattern gracefully');
    test('should use configured default pattern ID');
  });
});
```

### Phase 4: Device Management

#### 4.1 DeviceConnection Tests
```typescript
describe('DeviceConnection', () => {
  test('should establish WebSocket connection');
  test('should send animation data');
  test('should handle connection errors');
  test('should reconnect on disconnect');
  test('should timeout on no response');
});
```

#### 4.2 DeviceManager Tests
```typescript
describe('DeviceManager', () => {
  test('should register new devices');
  test('should track device status');
  test('should send to all connected devices');
  test('should queue messages for offline devices');
  test('should handle device removal');
});
```

### Phase 5: External Integrations

#### 5.1 AnimationEncoder Tests
```typescript
describe('AnimationEncoder', () => {
  test('should encode valid animation to binary');
  test('should compress with zlib');
  test('should handle encoding errors');
  test('should validate animation constraints');
});
```

### Phase 6: Message Queue

#### 6.1 MessageQueue Tests
```typescript
describe('MessageQueue', () => {
  test('should enqueue messages');
  test('should process in priority order');
  test('should retry failed messages');
  test('should respect retry limits');
  test('should expire old messages');
});
```

### Phase 7: Core Service Integration

#### 7.1 NotificationService Tests
```typescript
describe('NotificationService', () => {
  describe('notify', () => {
    test('should process notification with pattern_id end-to-end');
    test('should load specified pattern from library');
    test('should fall back to default when pattern not found');
    test('should encode and send to device');
    test('should handle device offline');
    test('should return proper response');
  });
  
  describe('error handling', () => {
    test('should handle pattern not found');
    test('should handle encoding failure');
    test('should handle all devices offline');
    test('should timeout long operations');
  });
});
```

### Phase 8: API Endpoints

#### 8.1 Notify Endpoint Tests
```typescript
describe('POST /api/notify', () => {
  test('should accept notification with pattern_id');
  test('should validate pattern_id exists');
  test('should return 200 on success');
  test('should return 404 when pattern not found');
  test('should return 503 when devices offline');
  test('should handle malformed requests');
});
```

#### 8.2 Pattern Management Tests
```typescript
describe('Pattern API', () => {
  describe('GET /api/patterns', () => {
    test('should list all patterns');
    test('should support pagination');
  });
  
  describe('GET /api/patterns/:id', () => {
    test('should return pattern by ID');
    test('should return 404 for missing');
  });
  
  describe('POST /api/patterns', () => {
    test('should create new pattern');
    test('should validate pattern format');
    test('should prevent duplicate IDs');
  });
});
```

## Mock Strategies

### External Dependencies
```typescript
// Mock Team 1's encoder
jest.mock('../integrations/AnimationEncoder', () => ({
  encode: jest.fn().mockResolvedValue(new Uint8Array([1,2,3,4]))
}));

// No Team 3 integration needed - they call our API directly

// Mock WebSocket
jest.mock('ws', () => ({
  WebSocket: jest.fn().mockImplementation(() => ({
    send: jest.fn(),
    close: jest.fn(),
    on: jest.fn()
  }))
}));
```

### Test Fixtures
```typescript
// patterns/fixtures/test_pattern.json
export const testPattern = {
  pattern_id: "test_pattern",
  name: "Test Pattern",
  duration_ms: 1000,
  fps: 20,
  frames: [
    { time_ms: 0, leds: Array(20).fill([0,0,0]) },
    { time_ms: 1000, leds: Array(20).fill([255,0,0]) }
  ],
  audio: [],
  metadata: {
    id: "test_pattern",
    description: "Test pattern for unit tests",
    tags: ["test"],
    typical_use: "testing",
    intensity: "low",
    mood: "neutral"
  }
};
```

## Integration Test Scenarios

### Scenario 1: Happy Path
1. Team 3's MCP tool sends notification with pattern_id
2. Pattern loads successfully from library
3. Encoding succeeds
4. Device receives and confirms
5. MCP tool gets success response

### Scenario 2: Pattern Not Found Fallback
1. Team 3's MCP tool sends notification with invalid pattern_id
2. Pattern not found in library
3. Service falls back to default pattern
4. Rest of flow succeeds

### Scenario 3: Device Offline
1. Team 3's MCP tool sends notification with pattern_id
2. Pattern loads successfully
3. No devices connected
4. Message queued
5. MCP tool gets queued response

### Scenario 4: Encoding Failure
1. Team 3's MCP tool sends notification with pattern_id
2. Pattern loads successfully
3. Animation encoding fails
4. Service returns error response

## E2E Test Plan

```typescript
describe('E2E Notification Flow', () => {
  let app: Application;
  let mockDevice: MockWebSocketServer;
  
  beforeAll(() => {
    app = createApp();
    mockDevice = new MockWebSocketServer();
  });
  
  test('should deliver notification to device', async () => {
    // 1. Start mock device
    await mockDevice.listen(8080);
    
    // 2. Connect device to service
    await request(app)
      .post('/api/devices/register')
      .send({ ip: 'localhost:8080' });
    
    // 3. Send notification with pattern_id
    const response = await request(app)
      .post('/api/notify')
      .send({ pattern_id: 'gentle_success_v3' });
    
    // 4. Verify response
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('success');
    expect(response.body.pattern_used).toBeDefined();
    
    // 5. Verify device received data
    expect(mockDevice.lastMessage).toMatchObject({
      type: 'play',
      data: expect.any(String)
    });
  });
});
```

## Coverage Goals

- **Unit Tests**: 95%+ coverage
- **Integration Tests**: 85%+ coverage
- **E2E Tests**: Critical paths only

## CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test -- --coverage
      - run: npm run test:integration
      - run: npm run test:e2e
```

## Red-Green-Refactor Workflow

1. **Red**: Write a failing test
   - Focus on behavior, not implementation
   - One assertion per test initially
   - Use descriptive test names

2. **Green**: Make it pass
   - Write minimal code
   - Don't worry about elegance
   - Focus on making test green

3. **Refactor**: Improve the code
   - Remove duplication
   - Improve naming
   - Extract methods/classes
   - Ensure tests still pass

## Example TDD Session

```typescript
// Step 1: Red - Write failing test
test('should select gentle pattern for late night', () => {
  const selector = new PatternSelector();
  const result = selector.selectDefault("It's 11pm and the build failed");
  expect(result).toBe('gentle_notification_v1');
});

// Step 2: Green - Minimal implementation
class PatternSelector {
  selectDefault(text: string): string {
    if (text.includes('11pm')) {
      return 'gentle_notification_v1';
    }
    return 'default_notification_v1';
  }
}

// Step 3: Refactor - Improve implementation
class PatternSelector {
  private readonly LATE_NIGHT_PATTERNS = /\b(11pm|12am|1am|2am|late night)\b/i;
  
  selectDefault(text: string): string {
    if (this.isLateNight(text)) {
      return 'gentle_notification_v1';
    }
    return 'default_notification_v1';
  }
  
  private isLateNight(text: string): boolean {
    return this.LATE_NIGHT_PATTERNS.test(text);
  }
}
```