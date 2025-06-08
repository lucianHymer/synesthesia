# Team 3 Simple Prototype Plan

## Overview
One MCP server that collects context and uses Claude CLI for pattern selection. Keep it simple, get it working.

## Single Server Architecture

```
Claude Code → MCP Tool → Pattern Selection (claude-code CLI) → Team 2 API
```

## Project Structure
```
led-status-server/
├── src/
│   ├── index.ts          # MCP server
│   ├── tools.ts          # update_status tool
│   ├── patterns.ts       # Pattern selection via claude-code CLI
│   ├── context.ts        # Basic context collection
│   └── types.ts          # Shared interfaces
├── tests/
│   └── basic.test.ts     # Essential tests only
├── package.json
└── README.md
```

## Core Implementation

### 1. MCP Server (`src/index.ts`)
```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { updateStatusTool, handleUpdateStatus } from "./tools.js";

const mcpServer = new Server({
  name: "led-status",
  version: "1.0.0"
});

mcpServer.setRequestHandler("tools/list", async () => ({
  tools: [updateStatusTool]
}));

mcpServer.setRequestHandler("tools/call", async (request) => {
  if (request.params.name === "update_status") {
    return await handleUpdateStatus(request.params.arguments);
  }
  throw new Error(`Unknown tool: ${request.params.name}`);
});

// Start MCP server
const transport = new StdioServerTransport();
await mcpServer.connect(transport);
```

### 2. Tool Implementation (`src/tools.ts`)
```typescript
import { collectContext } from "./context.js";
import { selectPattern } from "./patterns.js";

export const updateStatusTool = {
  name: "update_status",
  description: "Report a development event for visual LED notification",
  inputSchema: {
    type: "object",
    properties: {
      message: { type: "string" },
      urgency: { type: "string", enum: ["low", "normal", "high", "urgent"] }
    },
    required: ["message"]
  }
};

export async function handleUpdateStatus({ message, urgency = "normal" }) {
  // Get basic context
  const context = await collectContext();
  
  // Build text description
  const text = `${message}. Working on ${context.project}, branch ${context.branch}. Time: ${context.time}. ${urgency} urgency.`;
  
  // Select pattern using Claude CLI
  const selection = await selectPattern(text);
  
  // Send to Team 2 with pattern selection
  try {
    const response = await fetch(`${process.env.TEAM2_URL}/api/notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        text,
        pattern_id: selection.pattern_id
      })
    });
    
    const result = await response.json();
    return {
      content: [{
        type: "text",
        text: `✅ LED notification sent: ${result.pattern_used || selection.pattern_id}`
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `❌ LED notification failed: ${error.message}`
      }]
    };
  }
}
```

### 3. Basic Context Collection (`src/context.ts`)
```typescript
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";

const execAsync = promisify(exec);

export async function collectContext() {
  const [branch, project] = await Promise.all([
    getBranch().catch(() => "unknown"),
    getProject().catch(() => "unknown-project")
  ]);

  return {
    branch,
    project,
    time: new Date().getHours(),
    workingDir: process.cwd()
  };
}

async function getBranch() {
  const { stdout } = await execAsync("git rev-parse --abbrev-ref HEAD");
  return stdout.trim();
}

async function getProject() {
  try {
    const pkg = await fs.readFile("package.json", "utf-8");
    return JSON.parse(pkg).name;
  } catch {
    return process.cwd().split("/").pop();
  }
}
```

### 4. Pattern Selection via Claude CLI (`src/patterns.ts`)
```typescript
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";

const execAsync = promisify(exec);

// Simple in-memory cache
const patternCache = new Map();
let cachedPatterns = null;

export async function selectPattern(text: string) {
  // Check cache
  if (patternCache.has(text)) {
    return patternCache.get(text);
  }

  // Get patterns from Team 2
  if (!cachedPatterns) {
    const response = await fetch(`${process.env.TEAM2_URL}/api/patterns`);
    cachedPatterns = await response.json();
  }

  // Ask Claude via claude-code CLI
  try {
    const prompt = `Select the best LED pattern for this context: "${text}"

Available patterns:
${cachedPatterns.map(p => `- ${p.metadata.id}: ${p.metadata.description}`).join("\n")}

Respond with just the pattern_id.`;

    // Write prompt to temp file
    const tempFile = `/tmp/pattern-prompt-${Date.now()}.txt`;
    await fs.writeFile(tempFile, prompt);

    // Call claude-code CLI
    const { stdout } = await execAsync(`claude-code -p "${tempFile}"`);
    const patternId = stdout.trim();

    // Cleanup temp file
    await fs.unlink(tempFile);

    const result = {
      pattern_id: patternId,
      confidence: 0.8,
      reasoning: "Claude CLI selection"
    };

    // Cache for 5 minutes
    patternCache.set(text, result);
    setTimeout(() => patternCache.delete(text), 5 * 60 * 1000);

    return result;
  } catch (error) {
    // Simple fallback
    return {
      pattern_id: text.includes("error") ? "error_pulse" : "success_gentle",
      confidence: 0.5,
      reasoning: "Fallback selection"
    };
  }
}
```

## Testing Strategy (Minimal)

### Basic Tests (`tests/basic.test.ts`)
```typescript
describe("LED Status Server", () => {
  it("should handle update_status tool", async () => {
    const result = await handleUpdateStatus({
      message: "Tests passed",
      urgency: "normal"
    });
    expect(result.content[0].text).toContain("LED notification");
  });

  it("should select patterns", async () => {
    const result = await selectPattern("Build failed with errors");
    expect(result.pattern_id).toBeDefined();
  });
});
```

## Environment Setup

### `.env`
```bash
TEAM2_URL=http://localhost:3000
```

### `package.json`
```json
{
  "name": "led-status-server",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "test": "jest"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.x"
  },
  "devDependencies": {
    "tsx": "^4.x",
    "jest": "^29.x",
    "@types/node": "^20.x"
  }
}
```

## Quick Start

```bash
# Install dependencies
npm install

# Run MCP server
npm run dev

# Install in Claude Code
claude-code install ./led-status-server
```

## That's It!

- One MCP server only
- Basic context collection (git branch, project name)
- Pattern selection via `claude-code -p` CLI
- Minimal caching (5-minute in-memory)
- Just enough error handling to not crash
- No API endpoints - just library functions

This prototype focuses on getting something working quickly using the Claude CLI instead of API calls.