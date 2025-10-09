import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';
import { BaseToolHandler, ToolResult, SecurityContext } from '../types/index.js';

const execAsync = promisify(exec);

const GitToolSchema = z.object({
  operation: z.enum(['status', 'log', 'branch', 'diff', 'add', 'commit', 'push', 'pull']).describe('Git operation to perform'),
  args: z.array(z.string()).optional().describe('Additional arguments for the git command'),
  message: z.string().optional().describe('Commit message (required for commit operation)'),
});

export class GitToolHandler extends BaseToolHandler {
  constructor(security: SecurityContext) {
    super(
      'git',
      'Perform Git operations (status, log, branch, diff, add, commit, push, pull)',
      {
        type: 'object',
        properties: {
          operation: {
            type: 'string',
            enum: ['status', 'log', 'branch', 'diff', 'add', 'commit', 'push', 'pull'],
            description: 'Git operation to perform',
          },
          args: {
            type: 'array',
            items: { type: 'string' },
            description: 'Additional arguments for the git command',
          },
          message: {
            type: 'string',
            description: 'Commit message (required for commit operation)',
          },
        },
        required: ['operation'],
      },
      security
    );
  }

  async execute(args: any): Promise<ToolResult> {
    try {
      const { operation, args: additionalArgs = [], message } = GitToolSchema.parse(args);

      // Build git command
      let command = `git ${operation}`;
      
      // Handle special cases
      switch (operation) {
        case 'commit':
          if (!message) {
            throw new Error('Commit message is required for commit operation');
          }
          command += ` -m "${message.replace(/"/g, '\\"')}"`;
          break;
        case 'log':
          command += ' --oneline -10'; // Limit to 10 recent commits
          break;
        case 'diff':
          command += ' --stat'; // Show stats instead of full diff for safety
          break;
      }

      // Add additional arguments (with basic sanitization)
      if (additionalArgs.length > 0) {
        const sanitizedArgs = additionalArgs
          .filter(arg => typeof arg === 'string' && arg.length > 0)
          .map(arg => arg.replace(/[;&|`$()]/g, '')) // Remove dangerous characters
          .join(' ');
        if (sanitizedArgs) {
          command += ` ${sanitizedArgs}`;
        }
      }

      console.error(`[Git] Executing: ${command}`);

      const { stdout, stderr } = await execAsync(command, {
        cwd: this.security.workspaceRoot,
        timeout: 15000, // 15 second timeout
        maxBuffer: 1024 * 1024 // 1MB max output
      });

      let output = stdout.trim();
      if (stderr) {
        output += stderr ? `\nWarnings/Errors:\n${stderr}` : '';
      }

      if (!output) {
        output = `Git ${operation} completed successfully (no output)`;
      }

      console.error(`[Git] Operation ${operation} completed`);
      return this.createSuccessResult(`Git ${operation} result:\n${output}`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Git operation failed';
      console.error(`[Git Error] ${errorMessage}`);
      
      // Provide helpful error messages
      if (errorMessage.includes('not a git repository')) {
        return this.createErrorResult('This directory is not a Git repository. Run "git init" to initialize one.');
      }
      
      return this.createErrorResult(`Git operation failed: ${errorMessage}`);
    }
  }
}
