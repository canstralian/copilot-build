# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TypeScript project configured to use the Model Context Protocol (MCP) SDK. The project uses CommonJS module format with strict TypeScript configuration.

## Build and Development

**TypeScript Compilation:**
```bash
npx tsc
```

**Type Checking:**
```bash
npx tsc --noEmit
```

Note: The project currently has no build scripts configured in package.json. Add appropriate scripts as needed when implementing features.

## TypeScript Configuration

- **Module System:** nodenext (CommonJS via `type: "commonjs"` in package.json)
- **Target:** esnext
- **Strict Mode:** Enabled with additional strictness:
  - `noUncheckedIndexedAccess: true` - Array/object access requires null checks
  - `exactOptionalPropertyTypes: true` - Optional properties must match exactly (no undefined hack)
- **JSX:** react-jsx (though this appears to be an MCP server project)
- **Outputs:** Source maps, declaration files, and declaration maps are generated

## Dependencies

- **@modelcontextprotocol/sdk** (^1.19.1): Core SDK for building MCP servers
- **zod** (^3.25.76): Schema validation library

## Architecture Notes

The project structure is currently minimal. When implementing MCP servers:

1. MCP servers expose tools, resources, and prompts to MCP clients
2. Use Zod schemas for input validation with MCP tool definitions
3. The SDK handles the JSON-RPC communication protocol
4. Server implementations typically export a main server instance with registered handlers
