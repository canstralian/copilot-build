import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';
import { BaseToolHandler, ToolResult, SecurityContext } from '../types/index.js';

const execAsync = promisify(exec);

const SystemInfoToolSchema = z.object({
  type: z.enum(['os', 'cpu', 'memory', 'disk', 'network', 'all']).describe('Type of system information to retrieve'),
});

export class SystemInfoToolHandler extends BaseToolHandler {
  private readonly allowedCommands = {
    os: 'uname -a',
    cpu: 'cat /proc/cpuinfo | grep "model name" | head -1',
    memory: 'free -h',
    disk: 'df -h /',
    network: 'ip route | head -5',
  };

  constructor(security: SecurityContext) {
    super(
      'system_info',
      'Get system information (OS, CPU, memory, disk, network)',
      {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['os', 'cpu', 'memory', 'disk', 'network', 'all'],
            description: 'Type of system information to retrieve',
          },
        },
        required: ['type'],
      },
      security
    );
  }

  async execute(args: any): Promise<ToolResult> {
    try {
      const { type } = SystemInfoToolSchema.parse(args);

      if (type === 'all') {
        return await this.getAllSystemInfo();
      }

      const command = this.allowedCommands[type as keyof typeof this.allowedCommands];
      if (!command) {
        throw new Error(`Unknown system info type: ${type}`);
      }

      const { stdout, stderr } = await execAsync(command, { 
        timeout: 5000,
        maxBuffer: 1024 * 1024 // 1MB max output
      });

      if (stderr) {
        console.error(`[SystemInfo] Warning: ${stderr}`);
      }

      console.error(`[SystemInfo] Retrieved ${type} information`);
      return this.createSuccessResult(`System ${type} information:\n${stdout.trim()}`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get system info';
      console.error(`[SystemInfo Error] ${errorMessage}`);
      return this.createErrorResult(errorMessage);
    }
  }

  private async getAllSystemInfo(): Promise<ToolResult> {
    const results: string[] = [];
    
    for (const [type, command] of Object.entries(this.allowedCommands)) {
      try {
        const { stdout } = await execAsync(command, { 
          timeout: 5000,
          maxBuffer: 1024 * 1024
        });
        results.push(`=== ${type.toUpperCase()} ===\n${stdout.trim()}`);
      } catch (error) {
        results.push(`=== ${type.toUpperCase()} ===\nError: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.error('[SystemInfo] Retrieved all system information');
    return this.createSuccessResult(`Complete System Information:\n\n${results.join('\n\n')}`);
  }
}
