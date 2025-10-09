import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

export function initializeSentry() {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    
    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Profiling
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    integrations: [
      nodeProfilingIntegration(),
      
      // MCP-specific context
      Sentry.httpIntegration(),
      Sentry.fsIntegration(),
    ],

    // Security-focused configuration
    beforeSend(event) {
      // Remove sensitive data from error reports
      if (event.exception) {
        event.exception.values?.forEach(exception => {
          if (exception.stacktrace?.frames) {
            exception.stacktrace.frames.forEach(frame => {
              // Sanitize file paths
              if (frame.filename?.includes('/home/')) {
                frame.filename = frame.filename.replace(/\/home\/[^/]+/, '/home/user');
              }
            });
          }
        });
      }
      return event;
    },

    // Enhanced error filtering
    beforeSendTransaction(event) {
      // Filter out sensitive operations
      if (event.transaction?.includes('file_read') || 
          event.transaction?.includes('command_execute')) {
        return null;
      }
      return event;
    }
  });
}

// Custom error reporting for MCP tools
export function reportToolError(toolName: string, error: Error, context?: Record<string, any>) {
  Sentry.withScope(scope => {
    scope.setTag('component', 'mcp-tool');
    scope.setTag('tool', toolName);
    scope.setContext('tool_context', {
      toolName,
      ...context
    });
    Sentry.captureException(error);
  });
}

// Performance monitoring for tool execution
export function trackToolPerformance(toolName: string, operation: string) {
  return Sentry.startTransaction({
    name: `tool.${toolName}.${operation}`,
    op: 'mcp.tool.execute'
  });
}