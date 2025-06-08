#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { updateStatusTool, createUpdateStatusHandler } from "./tools.js";
import type { NotificationService } from "../services/NotificationService.js";
import type { PatternLibrary } from "../patterns/PatternLibrary.js";

export async function startMCPServer(notificationService: NotificationService, patternLibrary: PatternLibrary) {
  const mcpServer = new Server({
    name: "led-status",
    version: "1.0.0"
  }, {
    capabilities: {
      tools: {}
    }
  });

  mcpServer.setRequestHandler("tools/list", async () => ({
    tools: [updateStatusTool]
  }));

  mcpServer.setRequestHandler("tools/call", async (request: any) => {
    const { name, arguments: args } = request.params;
    
    if (name === "update_status") {
      const handleUpdateStatus = createUpdateStatusHandler(notificationService, patternLibrary);
      return await handleUpdateStatus(args as any);
    }
    
    throw new Error(`Unknown tool: ${name}`);
  });

  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
  console.error("LED Status MCP server running on stdio");
}

// Standalone mode for direct MCP usage
async function main() {
  // This would need to create its own services
  // For now, just error out since we want integrated mode
  console.error("Use the integrated server: npm start -- --mcp");
  process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}