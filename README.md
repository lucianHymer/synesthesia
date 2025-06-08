# Team 3: AI Developer Tools - Simple Prototype

## Mission
Build a simple MCP tool for Claude Code that captures development events and uses Claude CLI to select appropriate LED notification patterns.

## What We're Building
- **MCP Tool**: `update_status` tool for Claude Code integration
- **Pattern Selection**: Use `claude-code -p` to intelligently select LED patterns
- **Context Collection**: Auto-gather git branch, project name, time
- **Team 2 Integration**: Send selected patterns to Team 2's notification service

## Key Files
- `SIMPLE_PROTOTYPE_PLAN.md` - Complete implementation plan
- `team3_ai_developer_tools.md` - Original requirements
- `shared_interfaces_v2.md` - Data structures and APIs

## Next Steps
1. Read `SIMPLE_PROTOTYPE_PLAN.md` for full implementation details
2. Create the `led-status-server` project with MCP tool
3. Implement basic context collection (git, project detection)
4. Add pattern selection using `claude-code -p` CLI
5. Test integration with Claude Code

## Architecture (Simple)
```
Claude Code → MCP Tool → Pattern Selection (claude-code CLI) → Team 2 API
```

Just one server, library functions, and Claude CLI integration. Keep it simple!