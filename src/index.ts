#!/usr/bin/env node

import path from "node:path";
import os from "node:os";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { TaskFlowServer } from "./server/TaskFlowServer.js";
import { TaskFlowService } from "./services/TaskFlowService.js";

async function main() {
  try {
    // Instantiate the service
    const service = new TaskFlowService();

    // Create the TaskFlow server
    const server = new TaskFlowServer(service);

    // Connect to stdio transport
    const transport = new StdioServerTransport();
    await server.connect(transport);
    await server.run();
  } catch (error) {
    console.error("Fatal error in TaskFlow MCP server:", error);
    process.exit(1);
  }
}

// Run the server
main().catch((error) => {
  console.error("Failed to start TaskFlow MCP server:", error);
  process.exit(1);
});
