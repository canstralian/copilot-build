import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';
import { BaseToolHandler, ToolResult, SecurityContext } from '../types/index.js';

const FileOperationToolSchema = z.object({
  operation: z.enum(['read', 'write', 'list']).describe('File operation to perform'),
  path: z.string().describe('File or directory path'),
  content: z.string().optional().describe('Content to write (only for write operation)'),
});

export class FileOperationToolHandler extends BaseToolHandler {
  constructor(security: SecurityContext) {
    super(
      'file_operation',
      'Perform secure file operations (read, write, list) within workspace only',
      {
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
      security
    );
  }

  async execute(args: any): Promise<ToolResult> {
    try {
      const { operation, path: requestedPath, content } = FileOperationToolSchema.parse(args);

      // Validate operation
      if (!this.security.allowedOperations.includes(operation)) {
        throw new Error(`Invalid operation: ${operation}`);
      }

      // Validate and resolve path with security checks
      const safePath = this.security.validatePath(requestedPath);

      console.error(`[FileOp] Operation: ${operation}, Path: ${requestedPath}`);

      switch (operation) {
        case 'read':
          return await this.handleRead(safePath, requestedPath);
        case 'write':
          return await this.handleWrite(safePath, requestedPath, content);
        case 'list':
          return await this.handleList(safePath, requestedPath);
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Operation failed';
      console.error(`[FileOp Error] ${errorMessage}`);
      
      // Sanitize error message to avoid exposing internal paths
      const safeErrorMessage = errorMessage.replace(this.security.workspaceRoot, '[workspace]');
      return this.createErrorResult(safeErrorMessage);
    }
  }

  private async handleRead(safePath: string, requestedPath: string): Promise<ToolResult> {
    const stats = await fs.stat(safePath);
    if (!stats.isFile()) {
      throw new Error('Path is not a file');
    }

    await this.security.validateFileSize(safePath);
    const fileContent = await fs.readFile(safePath, 'utf-8');

    console.error(`[FileOp] Read ${fileContent.length} bytes from ${requestedPath}`);
    return this.createSuccessResult(`Content of ${requestedPath}:\n${fileContent}`);
  }

  private async handleWrite(safePath: string, requestedPath: string, content?: string): Promise<ToolResult> {
    if (!content) {
      throw new Error('Content is required for write operation');
    }

    if (content.length > this.security.maxFileSize) {
      throw new Error(`Content too large: ${content.length} bytes (max ${this.security.maxFileSize})`);
    }

    // Ensure parent directory exists
    const parentDir = path.dirname(safePath);
    await fs.mkdir(parentDir, { recursive: true });

    await fs.writeFile(safePath, content, 'utf-8');

    console.error(`[FileOp] Wrote ${content.length} bytes to ${requestedPath}`);
    return this.createSuccessResult(`Successfully wrote ${content.length} bytes to ${requestedPath}`);
  }

  private async handleList(safePath: string, requestedPath: string): Promise<ToolResult> {
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

    const resultText = `Contents of ${requestedPath} (${items.length} items):\n${displayItems.join('\n')}${
      truncated ? '\n... (truncated)' : ''
    }`;

    return this.createSuccessResult(resultText);
  }
}
