import { z } from 'zod';
import { BaseToolHandler, ToolResult } from '../types/index.js';

const GetTimeToolSchema = z.object({
  timezone: z.string().optional().describe('Timezone to get time for (e.g., UTC, EST, PST)'),
});

export class TimeToolHandler extends BaseToolHandler {
  constructor() {
    super(
      'get_time',
      'Get current time for a specific timezone',
      {
        type: 'object',
        properties: {
          timezone: {
            type: 'string',
            description: 'Timezone to get time for (e.g., UTC, EST, PST)',
          },
        },
      },
      {} as any // Security context not needed for time operations
    );
  }

  async execute(args: any): Promise<ToolResult> {
    try {
      const { timezone = 'UTC' } = GetTimeToolSchema.parse(args);
      
      const now = new Date();
      const timeString = timezone === 'UTC' 
        ? now.toUTCString()
        : now.toLocaleString('en-US', { timeZone: timezone });
      
      console.error(`[TimeOp] Generated time for ${timezone}: ${timeString}`);
      
      return this.createSuccessResult(`Current time in ${timezone}: ${timeString}`);
    } catch (error) {
      console.error(`[TimeOp Error] ${error instanceof Error ? error.message : error}`);
      return this.createErrorResult(`Failed to get time: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
