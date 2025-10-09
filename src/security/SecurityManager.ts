import * as path from 'path';
import * as fs from 'fs/promises';
import { SecurityContext } from '../types/index.js';

export class SecurityManager implements SecurityContext {
  public readonly workspaceRoot: string;
  public readonly maxFileSize: number;
  public readonly allowedOperations: readonly string[];

  constructor(
    workspaceRoot: string = process.cwd(),
    maxFileSize: number = 10 * 1024 * 1024, // 10MB
    allowedOperations: readonly string[] = ['read', 'write', 'list']
  ) {
    this.workspaceRoot = path.resolve(workspaceRoot);
    this.maxFileSize = maxFileSize;
    this.allowedOperations = allowedOperations;
    
    console.error(`[Security] Workspace root: ${this.workspaceRoot}`);
    console.error(`[Security] Max file size: ${this.maxFileSize} bytes`);
  }

  /**
   * Validates and resolves a file path to prevent path traversal attacks
   */
  validatePath(requestedPath: string): string {
    if (!requestedPath || typeof requestedPath !== 'string') {
      throw new Error('Invalid path: path must be a non-empty string');
    }

    if (requestedPath.length > 1000) {
      throw new Error('Path too long (max 1000 characters)');
    }

    if (requestedPath.includes('\0')) {
      throw new Error('Invalid path: null bytes not allowed');
    }

    const suspiciousPatterns = ['..', './', '\\', '~'];
    for (const pattern of suspiciousPatterns) {
      if (requestedPath.includes(pattern)) {
        throw new Error(`Security violation: "${pattern}" not allowed in paths`);
      }
    }

    const normalizedPath = path.normalize(requestedPath);
    const resolvedPath = path.resolve(this.workspaceRoot, normalizedPath);

    if (!resolvedPath.startsWith(this.workspaceRoot + path.sep) && resolvedPath !== this.workspaceRoot) {
      throw new Error('Access denied: Path is outside workspace boundary');
    }

    if (path.isAbsolute(requestedPath)) {
      throw new Error('Absolute paths not allowed. Use paths relative to workspace');
    }

    console.error(`[Security] Path validated: ${requestedPath} -> ${resolvedPath}`);
    return resolvedPath;
  }

  /**
   * Validates file size against security limits
   */
  async validateFileSize(filePath: string): Promise<void> {
    const stats = await fs.stat(filePath);
    if (stats.size > this.maxFileSize) {
      throw new Error(`File too large: ${stats.size} bytes (max ${this.maxFileSize})`);
    }
  }

  /**
   * Sanitizes mathematical expressions for safe evaluation
   */
  sanitizeMathExpression(expression: string): string {
    if (expression.length > 1000) {
      throw new Error('Expression too long (max 1000 characters)');
    }

    const sanitized = expression.replace(/\s/g, '');
    const validPattern = /^[0-9+\-*/().]+$/;

    if (!validPattern.test(sanitized)) {
      throw new Error('Expression contains invalid characters');
    }

    if (sanitized.includes('..')) {
      throw new Error('Invalid expression pattern');
    }

    const operatorCount = (sanitized.match(/[+\-*/]/g) || []).length;
    if (operatorCount > 100) {
      throw new Error('Expression too complex (max 100 operations)');
    }

    // Check balanced parentheses
    let parenCount = 0;
    for (const char of sanitized) {
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

    return sanitized;
  }
}
