<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Hacker Logic MCP Server Extension - Development Guidelines

## Project Overview
This is a VS Code extension project that provides a comprehensive Model Context Protocol (MCP) server with advanced tool capabilities. The project uses TypeScript with strict type checking and follows security-first development practices.

## Architecture Principles

### 1. Modular Design
- Each tool is implemented as a separate handler class extending `BaseToolHandler`
- Security is centralized in `SecurityManager` class
- Clear separation between extension logic and MCP server logic

### 2. Security First
- **ALWAYS** validate file paths to prevent path traversal attacks
- **ALWAYS** sanitize user inputs before command execution
- **ALWAYS** enforce resource limits (file size, timeouts, etc.)
- **NEVER** use `eval()` without strict input validation
- **NEVER** execute arbitrary commands without whitelisting

### 3. Error Handling
- All errors should be caught and logged appropriately
- Error messages should not expose internal paths or sensitive information
- Use structured logging with operation context

## Code Standards

### TypeScript Guidelines
```typescript
// ✅ Good: Proper interface usage
interface ToolConfig {
  readonly name: string;
  readonly enabled: boolean;
}

// ✅ Good: Strict null checking
function processFile(path: string | null): string {
  if (!path) {
    throw new Error('Path is required');
  }
  return validatePath(path);
}

// ❌ Bad: Using 'any' type
function handleData(data: any): any {
  return data.whatever;
}
```

### Security Guidelines
```typescript
// ✅ Good: Path validation
private validatePath(requestedPath: string): string {
  if (requestedPath.includes('..')) {
    throw new Error('Path traversal not allowed');
  }
  const resolved = path.resolve(this.workspaceRoot, requestedPath);
  if (!resolved.startsWith(this.workspaceRoot)) {
    throw new Error('Access denied');
  }
  return resolved;
}

// ✅ Good: Input sanitization
private sanitizeCommand(cmd: string): string {
  return cmd.replace(/[;&|`$()]/g, '');
}

// ❌ Bad: Direct command execution
exec(userInput); // Never do this!
```

### Error Handling Patterns
```typescript
// ✅ Good: Comprehensive error handling
async execute(args: any): Promise<ToolResult> {
  try {
    const validated = this.validateInput(args);
    const result = await this.performOperation(validated);
    return this.createSuccessResult(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[ToolName] Error: ${message}`);
    return this.createErrorResult(message);
  }
}

// ❌ Bad: Unhandled errors
async execute(args: any): Promise<ToolResult> {
  const result = await someOperation(args); // Could throw
  return { content: [{ type: 'text', text: result }] };
}
```

## Tool Development

### Creating New Tools
1. **Extend BaseToolHandler**: All tools must extend the base class
2. **Define Schema**: Use Zod for input validation
3. **Implement Security**: Follow security guidelines for all operations
4. **Add Tests**: Include unit tests for the tool
5. **Update Documentation**: Add tool to README and configuration

### Tool Handler Template
```typescript
import { z } from 'zod';
import { BaseToolHandler, ToolResult, SecurityContext } from '../types/index.js';

const MyToolSchema = z.object({
  param: z.string().describe('Parameter description'),
});

export class MyToolHandler extends BaseToolHandler {
  constructor(security: SecurityContext) {
    super(
      'my_tool',
      'Tool description',
      {
        type: 'object',
        properties: {
          param: {
            type: 'string',
            description: 'Parameter description',
          },
        },
        required: ['param'],
      },
      security
    );
  }

  async execute(args: any): Promise<ToolResult> {
    try {
      const { param } = MyToolSchema.parse(args);
      
      // Tool implementation here
      const result = await this.performOperation(param);
      
      console.error(`[MyTool] Operation completed: ${param}`);
      return this.createSuccessResult(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Operation failed';
      console.error(`[MyTool] Error: ${message}`);
      return this.createErrorResult(message);
    }
  }

  private async performOperation(param: string): Promise<string> {
    // Implementation details
    return `Result for ${param}`;
  }
}
```

## VS Code Extension Guidelines

### Command Registration
```typescript
// ✅ Good: Proper command registration with cleanup
const disposable = vscode.commands.registerCommand('extension.command', handler);
context.subscriptions.push(disposable);

// ✅ Good: Error handling in commands
vscode.commands.registerCommand('extension.command', async () => {
  try {
    await performOperation();
    vscode.window.showInformationMessage('Success!');
  } catch (error) {
    vscode.window.showErrorMessage(`Error: ${error.message}`);
  }
});
```

### Process Management
```typescript
// ✅ Good: Process lifecycle management
let serverProcess: ChildProcess | null = null;

function startServer() {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
  
  serverProcess = spawn('node', ['server.js']);
  
  serverProcess.on('exit', () => {
    serverProcess = null;
  });
}

export function deactivate() {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
}
```

## Testing Guidelines

### Unit Tests
- Test all tool handlers individually
- Mock external dependencies
- Test error conditions
- Verify security validations

### Integration Tests
- Test MCP server communication
- Test VS Code extension integration
- Test end-to-end workflows

### Security Tests
- Test path traversal prevention
- Test input sanitization
- Test resource limits
- Test command injection prevention

## Build and Development

### Scripts Usage
```bash
# Development
npm run watch          # Watch mode for development
npm run dev:server     # Test MCP server directly
npm run test:mcp       # Quick MCP functionality test

# Quality Assurance
npm run lint           # Check code quality
npm run check-types    # TypeScript validation
npm run test           # Run all tests
npm run security:audit # Security audit

# Release
npm run package        # Production build
npm run release:patch  # Version bump and build
```

## Configuration Management

### Environment Variables
- Use `.env.example` as template
- Document all environment variables
- Provide sensible defaults
- Validate configuration on startup

### VS Code Settings
- Use `contributes.configuration` for user settings
- Provide clear descriptions
- Include validation where possible
- Support workspace-level overrides

## Performance Considerations

### Resource Management
- Implement timeouts for all operations
- Limit file sizes and operation complexity
- Use streaming for large data processing
- Clean up resources properly

### Memory Management
- Avoid memory leaks in long-running processes
- Use streaming for large files
- Implement garbage collection hints where appropriate

## Documentation Standards

### Code Documentation
- Use JSDoc for all public APIs
- Document security considerations
- Include usage examples
- Explain error conditions

### User Documentation
- Keep README up to date
- Include configuration examples
- Provide troubleshooting guides
- Document all available tools

## Common Patterns to Follow

### Async Operations
```typescript
// ✅ Good: Proper async/await with timeout
async function operationWithTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number = 5000
): Promise<T> {
  return Promise.race([
    operation(),
    new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Operation timeout')), timeoutMs)
    )
  ]);
}
```

### Logging
```typescript
// ✅ Good: Structured logging
console.error(`[${toolName}] ${operation}: ${details}`);

// Examples:
console.error(`[FileOp] Read 1024 bytes from config.json`);
console.error(`[Git] Operation status completed in 150ms`);
console.error(`[Security] Path validated: src/file.ts -> /workspace/src/file.ts`);
```

## References

- [VS Code Extension API](https://code.visualstudio.com/api)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

---

**Remember**: Security is paramount. When in doubt, err on the side of caution and implement additional validation.
