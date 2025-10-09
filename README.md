# Hacker Logic - MCP Server Extension for VS Code

A Visual Studio Code extension that integrates the Model Context Protocol (MCP) to provide powerful tools for time management, calculations, and file operations through VS Code's AI-powered features.

## Features

This extension provides an MCP server with three powerful tools:

### 🕒 Time Tool
Get current time for any timezone:
- Supports all standard timezones (UTC, EST, PST, etc.)
- Returns formatted time strings
- Perfect for coordinating across time zones

### 🧮 Calculator Tool
Perform mathematical calculations:
- Evaluate mathematical expressions
- Supports basic operations: `+`, `-`, `*`, `/`
- Works with parentheses for complex calculations
- Example: `(10 + 5) * 2` returns `30`

### 📁 File Operations Tool
Manage files and directories:
- **Read**: View file contents
- **Write**: Create or update files
- **List**: Browse directory contents

## Installation

1. Clone this repository:
   ```bash
   git clone <repository-url>
   cd copilot-build
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the extension:
   ```bash
   npm run compile
   ```

4. Open the project in VS Code and press `F5` to launch the Extension Development Host

## Requirements

- VS Code version 1.104.0 or higher
- Node.js 22.x or higher
- TypeScript 5.9.3 or higher

## Extension Commands

This extension contributes the following commands:

- `Hacker Logic: Hello World` - Display a welcome message
- `Hacker Logic: Start MCP Server` - Manually start the MCP server
- `Hacker Logic: Test MCP Server` - Test MCP server functionality

## MCP Server Tools

The MCP server automatically registers with VS Code and provides the following tools:

### get_time
Get the current time for a specific timezone.

**Parameters:**
- `timezone` (optional): Timezone identifier (e.g., "UTC", "America/New_York", "Europe/London")

**Example:**
```json
{
  "name": "get_time",
  "arguments": {
    "timezone": "America/New_York"
  }
}
```

### calculate
Perform mathematical calculations.

**Parameters:**
- `expression` (required): Mathematical expression to evaluate

**Example:**
```json
{
  "name": "calculate",
  "arguments": {
    "expression": "2 + 2"
  }
}
```

### file_operation
Perform file operations (read, write, list).

**Parameters:**
- `operation` (required): One of "read", "write", or "list"
- `path` (required): File or directory path
- `content` (optional): Content to write (only for write operation)

**Example - Read:**
```json
{
  "name": "file_operation",
  "arguments": {
    "operation": "read",
    "path": "/path/to/file.txt"
  }
}
```

**Example - Write:**
```json
{
  "name": "file_operation",
  "arguments": {
    "operation": "write",
    "path": "/path/to/file.txt",
    "content": "Hello, World!"
  }
}
```

**Example - List:**
```json
{
  "name": "file_operation",
  "arguments": {
    "operation": "list",
    "path": "/path/to/directory"
  }
}
```

## Development

### Project Structure

```
copilot-build/
├── src/
│   ├── extension.ts      # VS Code extension entry point
│   ├── mcpServer.ts      # MCP server implementation
│   └── test/             # Test files
├── dist/                 # Compiled extension code
├── out/                  # Compiled MCP server code
├── package.json          # Extension manifest
├── tsconfig.json         # TypeScript configuration
└── esbuild.js           # Build configuration
```

### Available Scripts

- `npm run compile` - Build the extension and MCP server
- `npm run watch` - Watch for changes and rebuild automatically
- `npm run check-types` - Run TypeScript type checking
- `npm run lint` - Run ESLint
- `npm run test` - Run tests
- `npm run package` - Package the extension for production

### Build Configuration

The project uses esbuild for fast compilation:
- Extension: Bundled as CommonJS (`dist/extension.js`)
- MCP Server: Bundled as ESM (`out/mcpServer.js`)

### TypeScript Configuration

- **Module System:** Node16 (CommonJS via package.json)
- **Target:** ES2022
- **Strict Mode:** Enabled
- **Source Maps:** Generated for debugging

## Testing the MCP Server

You can test the MCP server directly from the command line:

```bash
# List available tools
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | node out/mcpServer.js

# Call the calculator
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"calculate","arguments":{"expression":"2+2"}}}' | node out/mcpServer.js

# Get current time
echo '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"get_time","arguments":{"timezone":"UTC"}}}' | node out/mcpServer.js
```

## Architecture

### Extension (extension.ts)
The VS Code extension provides:
- MCP Server Definition Provider that registers the server with VS Code
- Commands for managing and testing the server
- Integration with VS Code's language model features

### MCP Server (mcpServer.ts)
The MCP server:
- Implements the Model Context Protocol using `@modelcontextprotocol/sdk`
- Uses Zod for input validation
- Communicates via stdio transport
- Provides three tools: time, calculator, and file operations

## Security Notes

- File operations are restricted to paths you provide - use with caution
- The calculator uses basic sanitization but only allows mathematical expressions
- The MCP server runs with the same permissions as VS Code

## Known Issues

- The calculator tool uses `eval()` for demonstration purposes. In production, consider using a proper math library like `mathjs`.
- File operations don't have path restrictions - ensure you validate paths in production use.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `npm run check-types` and `npm run lint`
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Release Notes

### 0.0.1

Initial release of Hacker Logic MCP Server Extension:
- MCP server integration with VS Code
- Time tool for timezone conversions
- Calculator tool for mathematical expressions
- File operation tool for read/write/list operations
- Complete TypeScript implementation with strict type checking

## Resources

- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
- [VS Code Extension API](https://code.visualstudio.com/api)
- [MCP SDK on npm](https://www.npmjs.com/package/@modelcontextprotocol/sdk)

---

**Enjoy using Hacker Logic!**
