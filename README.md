# 🚀 Hacker Logic MCP Server Extension

A powerful VS Code extension that provides a comprehensive Model Context Protocol (MCP) server with advanced tool capabilities, security-first design, and modular architecture.

## ✨ Features

### 🔧 Advanced MCP Tools
- **⏰ Time Operations**: Get current time for any timezone with full timezone support
- **🧮 Mathematical Calculator**: Safe expression evaluation with comprehensive security validation
- **📁 File Operations**: Secure file read/write/list operations within workspace boundaries
- **💻 System Information**: Retrieve OS, CPU, memory, disk, and network information
- **🔄 Git Integration**: Complete Git operations (status, commit, push, pull, branch, diff)
- **⚡ Process Management**: List, monitor, and safely manage system processes

### 🛡️ Security Features
- **Path Traversal Protection**: Prevents access outside workspace boundaries
- **Input Sanitization**: Strict validation and sanitization for all user inputs
- **Resource Limits**: Configurable file size limits and operation timeouts
- **Safe Command Execution**: Whitelisted commands with argument sanitization
- **Process Isolation**: Secure subprocess management with proper cleanup
- **Security Logging**: Comprehensive audit trail of all operations

### 🏗️ Architecture
- **Modular Design**: Plugin-based architecture for easy tool extension
- **TypeScript**: Full type safety with strict mode enabled
- **Error Handling**: Comprehensive error handling with structured logging
- **Configuration**: Flexible configuration through VS Code settings and environment variables
- **CI/CD Ready**: Complete GitHub Actions workflows with security scanning

## � Quick Start

### Installation

1. **Install from VS Code Marketplace** (when published):
   - Open VS Code
   - Go to Extensions (Ctrl+Shift+X)
   - Search for "Hacker Logic MCP Server"
   - Click Install

2. **Development Installation**:

   ```bash
   git clone https://github.com/canstralian/copilot-build.git
   cd copilot-build
   npm install
   npm run compile
   ```

3. **Launch Extension**:
   - Press `F5` in VS Code to open Extension Development Host
   - The MCP server will start automatically

### First Steps

1. Open VS Code's chat interface (Ctrl+Shift+I)
2. The Hacker Logic MCP tools will be available automatically
3. Try asking: "What time is it in Tokyo?" or "Calculate 2+2*3"

## 🔧 Available Tools

### ⏰ Time Tool (`get_time`)

Get current time for any timezone with full timezone support.

**Usage:**
```json
{
  "name": "get_time",
  "arguments": {
    "timezone": "America/New_York"
  }
}
```

### 🧮 Calculator Tool (`calculate`)

Safe mathematical expression evaluation with security validation.

**Usage:**
```json
{
  "name": "calculate", 
  "arguments": {
    "expression": "(10 + 5) * 2"
  }
}
```

### 📁 File Operations Tool (`file_operation`)

Secure file operations within workspace boundaries.

**Read File:**
```json
{
  "name": "file_operation",
  "arguments": {
    "operation": "read",
    "path": "README.md"
  }
}
```

**Write File:**
```json
{
  "name": "file_operation",
  "arguments": {
    "operation": "write", 
    "path": "output.txt",
    "content": "Hello, World!"
  }
}
```

**List Directory:**
```json
{
  "name": "file_operation",
  "arguments": {
    "operation": "list",
    "path": "src/"
  }
}
```

### 💻 System Information Tool (`system_info`)

Retrieve comprehensive system information.

**Usage:**
```json
{
  "name": "system_info",
  "arguments": {
    "type": "all"
  }
}
```

### 🔄 Git Tool (`git`)

Complete Git operations for repository management.

**Usage:**
```json
{
  "name": "git",
  "arguments": {
    "operation": "status"
  }
}
```

### ⚡ Process Tool (`process`)

Safe process management and monitoring.

**Usage:**
```json
{
  "name": "process",
  "arguments": {
    "operation": "list",
    "filter": "node"
  }
}
```

## ⚙️ Configuration

### VS Code Settings

Configure the extension through VS Code settings:

```json
{
  "hackerLogic.mcp.enabledTools": [
    "get_time",
    "calculate", 
    "file_operation",
    "system_info",
    "git"
  ],
  "hackerLogic.mcp.maxFileSize": 10485760,
  "hackerLogic.mcp.autoStart": true,
  "hackerLogic.debug.verbose": false
}
```

### Environment Variables

```bash
MCP_SERVER_NAME=hacker-logic-mcp-server
MCP_WORKSPACE_ROOT=/path/to/workspace
MCP_MAX_FILE_SIZE=10485760
MCP_ENABLED_TOOLS=get_time,calculate,file_operation
```

## 🛠️ Development

### Requirements

- VS Code version 1.104.0 or higher
- Node.js 18.x or 20.x
- TypeScript 5.9.3 or higher
- Git for version control

### Project Structure

```
copilot-build/
├── .github/                 # GitHub workflows and templates
│   ├── workflows/          # CI/CD pipelines
│   ├── ISSUE_TEMPLATE/     # Issue templates
│   └── copilot-instructions.md
├── src/
│   ├── types/              # TypeScript interfaces
│   ├── security/           # Security managers
│   ├── tools/              # Individual tool handlers
│   ├── extension.ts        # VS Code extension entry point
│   └── ModularMcpServer.ts # Main MCP server implementation
├── .vscode/                # VS Code configuration
├── dist/                   # Compiled extension code
├── out/                    # Compiled MCP server code
└── package.json            # Extension manifest
```

### Available Scripts

```bash
# Development
npm run watch              # Watch mode for development
npm run dev:server         # Test MCP server directly
npm run test:mcp          # Quick MCP functionality test

# Quality Assurance
npm run lint              # Check code quality
npm run lint:fix          # Fix linting issues
npm run check-types       # TypeScript validation
npm run test              # Run all tests
npm run security:audit    # Security audit

# Build & Release
npm run package           # Production build
npm run release:patch     # Version bump and build
npm run clean             # Clean build artifacts
```

### Testing

```bash
# Test MCP server directly
npm run test:mcp

# Run comprehensive tests
npm test

# Test specific tool
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_time","arguments":{"timezone":"UTC"}}}' | node out/mcpServer.js
```

### Architecture

#### Modular Design

The extension follows a modular architecture with clear separation of concerns:

**Core Components:**
- `BaseToolHandler`: Abstract base class for all tools
- `SecurityManager`: Centralized security validation and sanitization
- `ModularMcpServer`: Main server with plugin architecture
- `McpServerProvider`: VS Code integration layer

**Tool Handlers:**
- `TimeToolHandler`: Timezone-aware time operations
- `CalculateToolHandler`: Safe mathematical expression evaluation
- `FileOperationToolHandler`: Secure file system operations
- `SystemInfoToolHandler`: System information retrieval
- `GitToolHandler`: Git repository operations
- `ProcessToolHandler`: Process management and monitoring

#### Security Architecture

- **Input Validation**: All inputs validated with Zod schemas
- **Path Security**: Workspace-restricted file operations
- **Command Sanitization**: Whitelisted commands with argument filtering
- **Resource Limits**: Configurable timeouts and size limits
- **Audit Logging**: Comprehensive operation logging

## 🧪 Testing & Quality

### Automated Testing

The project includes comprehensive CI/CD pipelines:

- **Code Quality**: ESLint, TypeScript strict mode
- **Security Scanning**: CodeQL, Snyk, npm audit
- **Dependency Management**: Dependabot automation
- **Cross-platform Testing**: Linux, macOS, Windows

### Manual Testing

```bash
# Start development server
npm run dev:server

# Test in separate terminal
npm run test:mcp
```

## 🚀 Deployment

### GitHub Actions

The project includes automated workflows for:

- **Continuous Integration**: Code quality, testing, security scanning
- **Deployment**: Staging and production environments
- **Release Management**: Automated versioning and publishing
- **Security**: CodeQL analysis and dependency scanning

### Environments

- **Development**: Full tool set, verbose logging
- **Staging**: Reduced tool set, testing environment
- **Production**: Minimal tool set, optimized for performance

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Quick Start for Contributors

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes following our coding standards
4. Add tests for new functionality
5. Run quality checks: `npm run lint && npm run check-types && npm test`
6. Commit your changes: `git commit -m 'Add amazing feature'`
7. Push to the branch: `git push origin feature/amazing-feature`
8. Open a Pull Request

### Development Guidelines

- Follow TypeScript strict mode
- Add comprehensive error handling
- Include security considerations
- Write tests for new features
- Update documentation

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔒 Security

Security is our top priority. Please see our [Security Policy](SECURITY.md) for:

- Vulnerability reporting process
- Security features overview
- Best practices for users
- Supported versions

## 📊 Performance

- **Startup Time**: < 500ms
- **Memory Usage**: < 50MB baseline
- **File Operations**: Up to 10MB files (configurable)
- **Process Timeout**: 15 seconds max (configurable)
- **Concurrent Operations**: 5 max (configurable)

## 🆘 Support

- **GitHub Issues**: [Report bugs and request features](https://github.com/canstralian/copilot-build/issues)
- **Discussions**: [Community discussions](https://github.com/canstralian/copilot-build/discussions)
- **Documentation**: [Wiki and guides](https://github.com/canstralian/copilot-build/wiki)
- **Security**: [Security policy](SECURITY.md)

## 🔗 Resources

- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
- [VS Code Extension API](https://code.visualstudio.com/api)
- [MCP SDK on npm](https://www.npmjs.com/package/@modelcontextprotocol/sdk)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## 📈 Roadmap

### Version 2.1 (Next Release)
- [ ] Enhanced Git operations
- [ ] Database connectivity tools
- [ ] REST API client tool
- [ ] Performance optimizations

### Version 2.2 (Future)
- [ ] Plugin marketplace
- [ ] Custom tool development SDK
- [ ] Advanced security features
- [ ] Multi-workspace support

## 🏆 Acknowledgments

- Model Context Protocol team for the excellent SDK
- VS Code team for the extensibility platform  
- Security researchers for responsible disclosure
- Community contributors and testers

---

**Made with ❤️ for the VS Code community**

*Hacker Logic MCP Server Extension - Empowering developers with intelligent tooling*
