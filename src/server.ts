import { initializeSentry, reportToolError, trackToolPerformance } from './utils/sentry.js';

// Initialize Sentry early
initializeSentry();

export class HackerLogicMcpServer {
  // ...existing code...

  async execute(args: any): Promise<ToolResult> {
    const transaction = trackToolPerformance(this.name, 'execute');
    
    try {
      // ...existing tool execution logic...
      
      const result = await this.performOperation(validated);
      transaction.setStatus('ok');
      return this.createSuccessResult(result);
      
    } catch (error) {
      transaction.setStatus('internal_error');
      
      // Report to Sentry with context
      reportToolError(this.name, error as Error, {
        args: this.sanitizeArgs(args),
        operation: 'execute'
      });
      
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[${this.name}] Error: ${message}`);
      return this.createErrorResult(message);
    } finally {
      transaction.finish();
    }
  }

  private sanitizeArgs(args: any): any {
    // Remove sensitive data before sending to Sentry
    const sanitized = { ...args };
    delete sanitized.token;
    delete sanitized.password;
    delete sanitized.secret;
    return sanitized;
  }
}