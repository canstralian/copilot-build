import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { SecurityManager } from './security/SecurityManager.js';
import { TimeToolHandler } from './tools/TimeToolHandler.js';
import { CalculateToolHandler } from './tools/CalculateToolHandler.js';
import { FileOperationToolHandler } from './tools/FileOperationToolHandler.js';
import { ToolHandler, McpServerConfig } from './types/index.js';

export class ModularMcpServer {
  private server: Server;
  private security: SecurityManager;
  private toolHandlers: Map<string, ToolHandler>;

  constructor(config: McpServerConfig = {}) {
    const {
      name = 'hacker-logic-mcp-server',
      version = '1.0.0',
      workspaceRoot = process.cwd(),
      maxFileSize = 10 * 1024 * 1024,
      enabledTools = ['get_time', 'calculate', 'file_operation']
    } = config;

    this.server = new Server(
      { name, version },
      { capabilities: { tools: {} } }
    );

    this.security = new SecurityManager(workspaceRoot, maxFileSize);
    this.toolHandlers = new Map();

    this.initializeTools(enabledTools);
    this.setupRequestHandlers();
    this.setupErrorHandling();

    console.error(`[Server] Initialized ${name} v${version}`);
    console.error(`[Server] Enabled tools: ${enabledTools.join(', ')}`);
  }

  private initializeTools(enabledTools: string[]): void {
    const availableTools = {
      'get_time': () => new TimeToolHandler(),
      'calculate': () => new CalculateToolHandler(this.security),
      'file_operation': () => new FileOperationToolHandler(this.security),
    };

    for (const toolName of enabledTools) {
      const toolFactory = availableTools[toolName as keyof typeof availableTools];
      if (toolFactory) {
        const handler = toolFactory();
        this.toolHandlers.set(toolName, handler);
        console.error(`[Server] Registered tool: ${toolName}`);
      } else {
        console.error(`[Server] Warning: Unknown tool "${toolName}" skipped`);
      }
    }
  }

  private setupRequestHandlers(): void {
    // Handle tools list request
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = Array.from(this.toolHandlers.values()).map(handler => ({
        name: handler.name,
        description: handler.description,
        inputSchema: handler.inputSchema,
      }));

      console.error(`[Server] Listed ${tools.length} available tools`);
      return { tools };
    });

    // Handle tool execution requests
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const startTime = Date.now();
      
      try {
        const { name, arguments: args } = request.params;
        
        const handler = this.toolHandlers.get(name);
        if (!handler) {
          throw new Error(`Unknown tool: ${name}`);
        }

        console.error(`[Server] Executing tool: ${name}`);
        const result = await handler.execute(args);
        
        const duration = Date.now() - startTime;
        console.error(`[Server] Tool ${name} completed in ${duration}ms`);
        
        return result as any; // Type assertion for MCP SDK compatibility
      } catch (error) {
        const duration = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        
        console.error(`[Server] Tool execution failed after ${duration}ms: ${errorMessage}`);
        
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${errorMessage}`,
            },
          ],
        } as any;
      }
    });
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error('[Server Error]', error);
    };

    const gracefulShutdown = async (signal: string) => {
      console.error(`[Server] Received ${signal}, shutting down gracefully...`);
      try {
        await this.server.close();
        console.error('[Server] Server closed successfully');
        process.exit(0);
      } catch (error) {
        console.error('[Server] Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('[Server] Hacker Logic MCP Server running on stdio');
  }

  // Public API for adding custom tools
  registerTool(handler: ToolHandler): void {
    this.toolHandlers.set(handler.name, handler);
    console.error(`[Server] Registered custom tool: ${handler.name}`);
  }

  // Public API for removing tools
  unregisterTool(name: string): boolean {
    const removed = this.toolHandlers.delete(name);
    if (removed) {
      console.error(`[Server] Unregistered tool: ${name}`);
    }
    return removed;
  }
}

// Start the server when run directly
const isMainModule = process.argv[1] && process.argv[1].endsWith('ModularMcpServer.js');

if (isMainModule) {
  const config: McpServerConfig = {
    name: process.env.MCP_SERVER_NAME || 'hacker-logic-mcp-server',
    version: process.env.MCP_SERVER_VERSION || '2.0.0',
    workspaceRoot: process.env.MCP_WORKSPACE_ROOT,
    maxFileSize: process.env.MCP_MAX_FILE_SIZE ? parseInt(process.env.MCP_MAX_FILE_SIZE) : undefined,
  };

  const server = new ModularMcpServer(config);
  server.run().catch((error) => {
    console.error('[Fatal Error]', error);
    process.exit(1);
  });
}
