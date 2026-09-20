#!/usr/bin/env node
/**
 * stdio entrypoint for the Deal Brain MCP server (F11′). Register with
 * Claude Code via `claude mcp add deal-brain -- node <path-to-this-file>`
 * (see docs/user-guide.md).
 */
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";

async function main() {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("[deal-brain-mcp] Fatal error starting the MCP server.", error);
  process.exitCode = 1;
});
