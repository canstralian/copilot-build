import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';
import { BaseToolHandler, ToolResult, SecurityContext } from '../types/index.js';

const execAsync = promisify(exec);

const ProcessToolSchema = z.object({
  operation: z.enum(['list', 'info', 'kill']).describe('Process operation to perform'),
  filter: z.string().optional().describe('Filter processes by name or pattern'),
  pid: z.number().optional().describe('Process ID (required for kill operation)'),
  signal: z.string().optional().describe('Signal to send (default: TERM)'),
});

export class ProcessToolHandler extends BaseToolHandler {
  private readonly allowedSignals = ['TERM', 'KILL', 'HUP', 'INT', 'QUIT', 'USR1', 'USR2'];

  constructor(security: SecurityContext) {
    super(
      'process',
      'Manage system processes (list, info, kill) with safety restrictions',
      {
        type: 'object',
        properties: {
          operation: {
            type: 'string',
            enum: ['list', 'info', 'kill'],
            description: 'Process operation to perform',
          },
          filter: {
            type: 'string',
            description: 'Filter processes by name or pattern',
          },
          pid: {
            type: 'number',
            description: 'Process ID (required for kill operation)',
          },
          signal: {
            type: 'string',
            description: 'Signal to send (default: TERM)',
          },
        },
        required: ['operation'],
      },
      security
    );
  }

  async execute(args: any): Promise<ToolResult> {
    try {
      const { operation, filter, pid, signal = 'TERM' } = ProcessToolSchema.parse(args);

      switch (operation) {
        case 'list':
          return await this.listProcesses(filter);
        case 'info':
          return await this.getProcessInfo(filter || 'node');
        case 'kill':
          return await this.killProcess(pid, signal);
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Process operation failed';
      console.error(`[Process Error] ${errorMessage}`);
      return this.createErrorResult(errorMessage);
    }
  }

  private async listProcesses(filter?: string): Promise<ToolResult> {
    let command = 'ps aux --sort=-%cpu | head -20'; // Top 20 CPU-using processes
    
    if (filter) {
      // Sanitize filter to prevent command injection
      const sanitizedFilter = filter.replace(/[;&|`$()]/g, '');
      command = `ps aux | grep "${sanitizedFilter}" | grep -v grep | head -10`;
    }

    const { stdout } = await execAsync(command, {
      timeout: 5000,
      maxBuffer: 1024 * 1024
    });

    console.error(`[Process] Listed processes${filter ? ` (filtered: ${filter})` : ''}`);
    return this.createSuccessResult(
      `Process List${filter ? ` (filtered: ${filter})` : ' (top 20 by CPU)'}:\n${stdout.trim()}`
    );
  }

  private async getProcessInfo(filter: string): Promise<ToolResult> {
    const sanitizedFilter = filter.replace(/[;&|`$()]/g, '');
    const command = `ps aux | grep "${sanitizedFilter}" | grep -v grep`;

    const { stdout } = await execAsync(command, {
      timeout: 5000,
      maxBuffer: 1024 * 1024
    });

    if (!stdout.trim()) {
      return this.createSuccessResult(`No processes found matching: ${filter}`);
    }

    console.error(`[Process] Retrieved info for processes matching: ${filter}`);
    return this.createSuccessResult(`Process Info (${filter}):\n${stdout.trim()}`);
  }

  private async killProcess(pid?: number, signal: string = 'TERM'): Promise<ToolResult> {
    if (!pid) {
      throw new Error('Process ID (pid) is required for kill operation');
    }

    if (pid <= 0 || pid > 999999) {
      throw new Error('Invalid process ID');
    }

    if (!this.allowedSignals.includes(signal)) {
      throw new Error(`Invalid signal: ${signal}. Allowed: ${this.allowedSignals.join(', ')}`);
    }

    // Safety check: don't kill critical system processes
    const criticalPids = [1, 2]; // init, kthreadd
    if (criticalPids.includes(pid)) {
      throw new Error('Cannot kill critical system processes');
    }

    // Check if process exists and get info before killing
    try {
      const { stdout: processInfo } = await execAsync(`ps -p ${pid} -o pid,ppid,cmd`, {
        timeout: 2000
      });

      if (!processInfo.trim().split('\n')[1]) {
        throw new Error(`Process ${pid} not found`);
      }

      // Proceed with kill
      const command = `kill -${signal} ${pid}`;
      await execAsync(command, { timeout: 5000 });

      console.error(`[Process] Sent ${signal} signal to process ${pid}`);
      return this.createSuccessResult(
        `Successfully sent ${signal} signal to process ${pid}\nProcess info:\n${processInfo.trim()}`
      );

    } catch (error) {
      if (error instanceof Error && error.message.includes('No such process')) {
        throw new Error(`Process ${pid} not found or already terminated`);
      }
      throw error;
    }
  }
}
