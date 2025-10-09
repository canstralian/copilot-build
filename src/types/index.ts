// Core interfaces and types for the MCP server tools
export interface ToolHandler {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: any;
  execute(args: any): Promise<ToolResult>;
}

export interface ToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
}

export interface SecurityContext {
  readonly workspaceRoot: string;
  readonly maxFileSize: number;
  readonly allowedOperations: readonly string[];
  validatePath(path: string): string;
  validateFileSize(path: string): Promise<void>;
}

export interface McpServerConfig {
  name?: string;
  version?: string;
  workspaceRoot?: string;
  maxFileSize?: number;
  enabledTools?: string[];
  security?: {
    strictPathValidation?: boolean;
    allowAbsolutePaths?: boolean;
    maxExpressionLength?: number;
  };
}

export abstract class BaseToolHandler implements ToolHandler {
  constructor(
    public readonly name: string,
    public readonly description: string,
    public readonly inputSchema: any,
    protected readonly security: SecurityContext
  ) {}

  abstract execute(args: any): Promise<ToolResult>;

  protected createSuccessResult(text: string): ToolResult {
    return {
      content: [{
        type: 'text',
        text
      }]
    };
  }

  protected createErrorResult(error: string | Error): ToolResult {
    const message = error instanceof Error ? error.message : error;
    return {
      content: [{
        type: 'text',
        text: `Error: ${message}`
      }]
    };
  }
}
