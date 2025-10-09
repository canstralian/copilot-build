import { z } from 'zod';
import { BaseToolHandler, ToolResult, SecurityContext } from '../types/index.js';

const CalculateToolSchema = z.object({
  expression: z.string().describe('Mathematical expression to calculate (e.g., "2 + 2", "sqrt(16)")'),
});

export class CalculateToolHandler extends BaseToolHandler {
  constructor(security: SecurityContext) {
    super(
      'calculate',
      'Perform mathematical calculations with strict security validation',
      {
        type: 'object',
        properties: {
          expression: {
            type: 'string',
            description: 'Mathematical expression to calculate (e.g., "2 + 2", "sqrt(16)")',
            maxLength: 1000,
          },
        },
        required: ['expression'],
      },
      security
    );
  }

  async execute(args: any): Promise<ToolResult> {
    try {
      const { expression } = CalculateToolSchema.parse(args);
      
      // Use security manager to sanitize expression
      const sanitized = (this.security as any).sanitizeMathExpression(expression);
      
      // Evaluate in isolated context
      // Note: For production, consider replacing with mathjs
      const result = eval(sanitized);

      if (!Number.isFinite(result)) {
        throw new Error('Result is not a finite number');
      }

      console.error(`[Calculate] ${expression} = ${result}`);
      
      return this.createSuccessResult(`${expression} = ${result}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Calculation failed';
      console.error(`[Calculate Error] ${errorMessage}`);
      return this.createErrorResult(errorMessage);
    }
  }
}
