# LED Status MCP Server

AI-powered LED notification system for Claude Code integration.

## Features

- **MCP Tool Integration**: Provides `update_status` tool for Claude Code
- **Context-Aware**: Automatically collects git branch, project name, and time context
- **Smart Pattern Selection**: Uses Claude CLI to select appropriate LED patterns
- **Team 2 Integration**: Sends notifications to the LED service
- **Graceful Fallbacks**: Works even when Claude CLI or APIs are unavailable

## Quick Start

```bash
# Install dependencies
npm install

# Run the MCP server
npm run dev

# Install in Claude Code
claude-code install ./led-status-server
```

## Usage in Claude Code

```typescript
// Claude Code can call this naturally
await update_status("All tests passed! 47/47 successful", "normal");
await update_status("Deployment failed - database connection timeout", "high");
await update_status("Working late again, 3rd auth bug today", "normal");
```

## Environment

Create a `.env` file:
```bash
TEAM2_URL=http://localhost:3000
```

## Testing

```bash
npm test
```

## Architecture

- **Context Collection**: Gathers git branch, project name, time of day
- **Pattern Selection**: Uses claude-code CLI to select from Team 2's pattern library
- **Notification**: Sends enriched context to Team 2's notification API
- **Caching**: 5-minute in-memory cache for pattern selections
- **Error Handling**: Graceful fallbacks at every level

The server works by collecting development context, asking Claude to select an appropriate LED pattern, and forwarding the notification to Team 2's service for display on the physical device.