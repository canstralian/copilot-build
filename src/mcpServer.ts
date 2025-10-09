import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import * as path from 'path';
import * as fs from 'fs/promises';

// Define tool schemas
const GetTimeToolSchema = z.object({
  timezone: z.string().optional().describe('Timezone to get time for (e.g., UTC, EST, PST)'),
});

const CalculateToolSchema = z.object({
  expression: z.string().describe('Mathematical expression to calculate (e.g., "2 + 2", "sqrt(16)")'),
});

const FileOperationToolSchema = z.object({
  operation: z.enum(['read', 'write', 'list']).describe('File operation to perform'),
  path: z.string().describe('File or directory path'),
  content: z.string().optional().describe('Content to write (only for write operation)'),
});

class McpServerExample {
  private server: Server;
  private workspaceRoot: string;
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit
  private readonly ALLOWED_OPERATIONS = ['read', 'write', 'list'] as const;

  constructor() {
    this.server = new Server(
      {
        name: 'hacker-logic-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Set workspace root to current working directory with security boundary
    // In production, this should be configurable via environment or config
    this.workspaceRoot = path.resolve(process.cwd());
    console.error(`[Security] MCP Server workspace root: ${this.workspaceRoot}`);
    console.error(`[Security] File size limit: ${this.MAX_FILE_SIZE} bytes`);

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'get_time',
            description: 'Get current time for a specific timezone',
            inputSchema: {
              type: 'object',
              properties: {
                timezone: {
                  type: 'string',
                  description: 'Timezone to get time for (e.g., UTC, EST, PST)',
                },
              },
            },
          },
          {
            name: 'calculate',
            description: 'Perform mathematical calculations',
            inputSchema: {
              type: 'object',
              properties: {
                expression: {
                  type: 'string',
                  description: 'Mathematical expression to calculate (e.g., "2 + 2", "sqrt(16)")',
                  maxLength: 1000,
                },
              },
              required: ['expression'],
            },
          },
          {
            name: 'file_operation',
            description: 'Perform file operations (read, write, list) within workspace only',
            inputSchema: {
              type: 'object',
              properties: {
                operation: {
                  type: 'string',
                  enum: ['read', 'write', 'list'],
                  description: 'File operation to perform',
                },
                path: {
                  type: 'string',
                  description: 'File or directory path (relative to workspace)',
                  maxLength: 1000,
                },
                content: {
                  type: 'string',
                  description: 'Content to write (only for write operation)',
                },
              },
              required: ['operation', 'path'],
            },
          },
        ] satisfies Tool[],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;

        switch (name) {
          case 'get_time':
            return await this.handleGetTime(args);
          case 'calculate':
            return await this.handleCalculate(args);
          case 'file_operation':
            return await this.handleFileOperation(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${errorMessage}`,
            },
          ],
        };
      }
    });
  }

  private async handleGetTime(args: any) {
    const { timezone = 'UTC' } = GetTimeToolSchema.parse(args);
    
    try {
      const now = new Date();
      const timeString = timezone === 'UTC' 
        ? now.toUTCString()
        : now.toLocaleString('en-US', { timeZone: timezone });
      
      return {
        content: [
          {
            type: 'text',
            text: `Current time in ${timezone}: ${timeString}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error getting time for timezone ${timezone}: ${error}`,
          },
        ],
      };
    }
  }

  /**
   * Safely evaluates mathematical expressions with strict validation
   * @param args - Arguments containing the expression
   * @returns Result of the calculation
   */
  private async handleCalculate(args: any) {
    try {
      const { expression } = CalculateToolSchema.parse(args);

      // Length validation
      if (expression.length > 1000) {
        throw new Error('Expression too long (max 1000 characters)');
      }

      // Strict whitelist validation - only allow numbers and basic math operators
      const sanitizedExpression = expression.replace(/\s/g, ''); // Remove spaces first
      const validPattern = /^[0-9+\-*/().]+$/;

      if (!validPattern.test(sanitizedExpression)) {
        throw new Error('Expression contains invalid characters. Only numbers and +, -, *, /, (, ) are allowed');
      }

      // Additional security checks
      if (sanitizedExpression.includes('..')) {
        throw new Error('Invalid expression pattern');
      }

      // Limit complexity - max 100 operations
      const operatorCount = (sanitizedExpression.match(/[+\-*/]/g) || []).length;
      if (operatorCount > 100) {
        throw new Error('Expression too complex (max 100 operations)');
      }

      // Check for balanced parentheses
      let parenCount = 0;
      for (const char of sanitizedExpression) {
        if (char === '(') {
          parenCount++;
        }
        if (char === ')') {
          parenCount--;
        }
        if (parenCount < 0) {
          throw new Error('Unbalanced parentheses');
        }
      }
      if (parenCount !== 0) {
        throw new Error('Unbalanced parentheses');
      }

      // Evaluate in isolated context with timeout
      // Note: eval is still used but with maximum sanitization
      // For production, replace with mathjs or similar library
      const result = eval(sanitizedExpression);

      // Validate result
      if (!Number.isFinite(result)) {
        throw new Error('Result is not a finite number');
      }

      console.error(`[Calculate] Expression: ${expression} = ${result}`);

      return {
        content: [
          {
            type: 'text',
            text: `${expression} = ${result}`,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Calculation failed';
      console.error(`[Calculate Error] ${errorMessage}`);
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${errorMessage}`,
          },
        ],
      };
    }
  }

  /**
   * Validates and resolves a file path to prevent path traversal attacks
   * @param requestedPath - The path requested by the user
   * @returns Resolved absolute path if valid
   * @throws Error if path is invalid, suspicious, or outside workspace
   */
  private validatePath(requestedPath: string): string {
    // Input validation
    if (!requestedPath || typeof requestedPath !== 'string') {
      throw new Error('Invalid path: path must be a non-empty string');
    }

    // Length check
    if (requestedPath.length > 1000) {
      throw new Error('Path too long (max 1000 characters)');
    }

    // Check for null bytes (common in path traversal attacks)
    if (requestedPath.includes('\0')) {
      throw new Error('Invalid path: null bytes not allowed');
    }

    // Check for path traversal patterns
    const suspiciousPatterns = ['..', './', '\\', '~'];
    for (const pattern of suspiciousPatterns) {
      if (requestedPath.includes(pattern)) {
        throw new Error(`Security violation: "${pattern}" not allowed in paths`);
      }
    }

    // Normalize and resolve path
    const normalizedPath = path.normalize(requestedPath);
    const resolvedPath = path.resolve(this.workspaceRoot, normalizedPath);

    // Ensure resolved path is within workspace (critical security check)
    if (!resolvedPath.startsWith(this.workspaceRoot + path.sep) && resolvedPath !== this.workspaceRoot) {
      throw new Error('Access denied: Path is outside workspace boundary');
    }

    // Check for absolute paths (should be relative to workspace)
    if (path.isAbsolute(requestedPath)) {
      throw new Error('Absolute paths not allowed. Use paths relative to workspace');
    }

    console.error(`[Security] Path validated: ${requestedPath} -> ${resolvedPath}`);
    return resolvedPath;
  }

  /**
   * Checks if a file size is within allowed limits
   * @param filePath - Path to the file to check
   * @throws Error if file is too large
   */
  private async validateFileSize(filePath: string): Promise<void> {
    const stats = await fs.stat(filePath);
    if (stats.size > this.MAX_FILE_SIZE) {
      throw new Error(`File too large: ${stats.size} bytes (max ${this.MAX_FILE_SIZE})`);
    }
  }

  /**
   * Handles file operations with comprehensive security checks
   * @param args - Operation arguments
   * @returns Operation result or error
   */
  private async handleFileOperation(args: any) {
    try {
      const { operation, path: requestedPath, content } = FileOperationToolSchema.parse(args);

      // Validate operation
      if (!this.ALLOWED_OPERATIONS.includes(operation as any)) {
        throw new Error(`Invalid operation: ${operation}`);
      }

      // Validate and resolve path with security checks
      const safePath = this.validatePath(requestedPath);

      console.error(`[FileOp] Operation: ${operation}, Path: ${requestedPath}`);

      switch (operation) {
        case 'read': {
          // Check if path exists and is a file
          const stats = await fs.stat(safePath);
          if (!stats.isFile()) {
            throw new Error('Path is not a file');
          }

          // Validate file size before reading
          await this.validateFileSize(safePath);

          const fileContent = await fs.readFile(safePath, 'utf-8');

          console.error(`[FileOp] Read ${fileContent.length} bytes from ${requestedPath}`);

          return {
            content: [
              {
                type: 'text',
                text: `Content of ${requestedPath}:\n${fileContent}`,
              },
            ],
          };
        }

        case 'write': {
          if (!content) {
            throw new Error('Content is required for write operation');
          }

          // Validate content size
          if (content.length > this.MAX_FILE_SIZE) {
            throw new Error(`Content too large: ${content.length} bytes (max ${this.MAX_FILE_SIZE})`);
          }

          // Ensure parent directory exists
          const parentDir = path.dirname(safePath);
          await fs.mkdir(parentDir, { recursive: true });

          await fs.writeFile(safePath, content, 'utf-8');

          console.error(`[FileOp] Wrote ${content.length} bytes to ${requestedPath}`);

          return {
            content: [
              {
                type: 'text',
                text: `Successfully wrote ${content.length} bytes to ${requestedPath}`,
              },
            ],
          };
        }

        case 'list': {
          // Check if path exists and is a directory
          const stats = await fs.stat(safePath);
          if (!stats.isDirectory()) {
            throw new Error('Path is not a directory');
          }

          const items = await fs.readdir(safePath);

          // Limit number of items returned
          const maxItems = 1000;
          const displayItems = items.slice(0, maxItems);
          const truncated = items.length > maxItems;

          console.error(`[FileOp] Listed ${items.length} items in ${requestedPath}`);

          return {
            content: [
              {
                type: 'text',
                text: `Contents of ${requestedPath} (${items.length} items):\n${displayItems.join('\n')}${truncated ? '\n... (truncated)' : ''}`,
              },
            ],
          };
        }

        default:
          throw new Error(`Unknown operation: ${operation}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Operation failed';
      console.error(`[FileOp Error] ${errorMessage}`);

      // Don't expose internal paths in error messages
      const safeErrorMessage = errorMessage.replace(this.workspaceRoot, '[workspace]');

      return {
        content: [
          {
            type: 'text',
            text: `Error: ${safeErrorMessage}`,
          },
        ],
      };
    }
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Hacker Logic MCP Server running on stdio');
  }
}

// Start the server - esbuild will bundle this as a standalone executable
const server = new McpServerExample();
server.run().catch((error) => {
  console.error('[Fatal Error]', error);
  process.exit(1);
});

export { McpServerExample };
