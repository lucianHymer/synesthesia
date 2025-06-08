#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { updateStatusTool, handleUpdateStatus } from "./tools.js";

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

mcpServer.setRequestHandler("tools/call", async (request) => {
  const { name, arguments: args } = request.params;
  
  if (name === "update_status") {
    return await handleUpdateStatus(args as any);
  }
  
  throw new Error(`Unknown tool: ${name}`);
});

async function main() {
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
  console.error("LED Status MCP server running on stdio");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}