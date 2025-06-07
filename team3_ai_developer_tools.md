# Team 3: AI & Developer Tools

## Mission
Build the intelligence layer that makes LED notifications contextually aware and emotionally appropriate, plus provide the developer tools for easy integration with Claude Code.

## Your Ownership
- MCP tool for Claude Code integration
- Claude-powered pattern selection
- Context analysis
- Pattern usage tracking

## What You Receive

### From Team 2: Pattern Library API
```typescript
// Get available patterns with rich metadata
GET /api/patterns
Response: PatternWithMetadata[]

interface PatternWithMetadata {
  animation: Animation
  metadata: {
    id: string
    description: string  // "Soft green fade with pleasant chimes"
    tags: string[]      // ["success", "gentle", "calm", "green"]
    typical_use: string // "test passes, build success"
    intensity: "low" | "medium" | "high"
    mood: string        // "celebratory", "urgent", "calming"
  }
}
```

### From Team 2: Notification Endpoint
```typescript
// Where MCP tool sends notifications (now text-based)
POST /api/notify
{
  "text": string  // Free-form description of everything
}

Response (synchronous):
{
  "status": "success" | "error",
  "started_at"?: string,
  "pattern_used"?: string,
  "error"?: string
}
```

## What You Deliver

### 1. MCP Tool for Claude Code

**Tool Definition (TypeScript):**
```typescript
import { Tool } from "@modelcontextprotocol/sdk";

export const updateStatus: Tool = {
  name: "update_status",
  description: "Report a development event for visual notification",
  parameters: {
    type: "object",
    properties: {
      message: {
        type: "string",
        description: "Natural language description of what happened"
      },
      urgency: {
        type: "string",
        enum: ["low", "normal", "high", "urgent"],
        default: "normal"
      }
    },
    required: ["message"]
  },
  execute: async ({ message, urgency = "normal" }) => {
    // Build rich text description with auto-collected context
    const context = {
      project: await getProjectName(),
      git_branch: await getCurrentBranch(),
      working_dir: process.cwd(),
      timestamp: new Date().toISOString(),
      time_of_day: new Date().getHours(),
      recent_commands: await getRecentCommands(),
      file_changes: await getRecentFileChanges()
    };
    
    // Create free-form text that includes everything
    const text = `${message}. Working on ${context.project} project, branch ${context.git_branch}. Time: ${context.time_of_day}:00. ${urgency} urgency.`;
    
    // Send to notification service
    const response = await fetch(`${SERVICE_URL}/api/notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });
    
    return response.json();
  }
};
```

**Usage in Claude Code:**
```typescript
// Claude Code can call this naturally
await update_status("All tests passed! 47/47 successful", "normal");
await update_status("Deployment failed - database connection timeout", "high");
await update_status("Working late again, 3rd auth bug today, getting frustrated", "normal");
```

### 2. Pattern Selection Service

**API Endpoint:**
```typescript
POST /api/select-pattern
{
  "text": "Build failed with 3 type errors. Working on synesthesia project, branch feature/auth. Time: 22:00. high urgency."
}

Response:
{
  "pattern_id": "error_pulse_v3",
  "confidence": 0.85,
  "reasoning": "Late night error with moderate urgency suggests clear but not jarring pattern"
}
```

**Claude Integration:**
```typescript
async function selectPattern(request: PatternRequest): Promise<PatternResponse> {
  // Get available patterns from Team 2
  const patterns = await fetchAvailablePatterns();
  
  // Ask Claude to select best match
  const prompt = `
    Select the most appropriate LED notification pattern:
    
    Context: ${request.text}
    
    Available patterns:
    ${patterns.map(p => `- ${p.metadata.id}: ${p.metadata.description}\n  Tags: ${p.metadata.tags.join(", ")}\n  Typical use: ${p.metadata.typical_use}\n  Intensity: ${p.metadata.intensity}\n  Mood: ${p.metadata.mood}`).join("\n\n")}
    
    Consider:
    - Time of day (don't be too bright/loud at night)
    - Message sentiment and emotional tone
    - User's likely emotional state
    - Pattern appropriateness for the situation
    - Professional vs personal context
  `;
  
  const selection = await claude.complete(prompt);
  return parseClaudeResponse(selection);
}
```

### 3. Future Enhancements

Pattern generation and usage analytics will be added in a future phase.

## Development Strategy

### Phase 1: Basic MCP Tool
1. Implement `update_status` tool
2. Auto-collect context
3. Forward to Team 2's service
4. Test with Claude Code

### Phase 2: Smart Selection
1. Build pattern selection endpoint
2. Integrate Claude for selection
3. Add context awareness
4. Handle edge cases

### Phase 3: Usage Analytics
1. Track pattern selections
2. Analyze context patterns
3. Report usage metrics to Team 2

## Testing Approach

### MCP Tool Testing
```bash
# Install in Claude Code
claude-code install ./mcp-led-status

# Test usage
echo "Test the update_status tool with various messages"
```

### Selection Testing
```typescript
// Test context sensitivity
const testCases = [
  { message: "Deploy failed", time: 23, expected: "gentle_error" },
  { message: "CRITICAL: Server down", time: 14, expected: "urgent_alert" },
  { message: "First commit!", time: 9, expected: "celebration_morning" }
];
```

## Success Metrics
1. MCP tool works seamlessly in Claude Code
2. Pattern selection feels contextually appropriate
3. System tracks usage patterns effectively
4. <200ms selection latency

## Questions to Consider
1. How to handle Claude API failures?
2. Caching strategy for common selections?
3. How much context is too much?
4. Privacy considerations for context data?

Remember: You're making the LED notifications feel intelligent and contextually aware. Focus on selecting the perfect pattern from what's available.
