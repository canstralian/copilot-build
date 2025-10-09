import * as fs from 'fs/promises';
import * as path from 'path';
import { z } from 'zod';

const SecurityConfigSchema = z.object({
  workspaceRoot: z.string().min(1),
  maxFileSize: z.number().positive().default(10 * 1024 * 1024),
  strictPathValidation: z.boolean().default(true),
  allowAbsolutePaths: z.boolean().default(false),
  allowedOperations: z.array(z.string()).default([]),
});

const McpConfigSchema = z.object({
  name: z.string().default('hacker-logic-mcp-server'),
  version: z.string().default('1.0.0'),
  port: z.number().positive().default(3000),
  logLevel: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

const GitHubConfigSchema = z.object({
  personalAccessToken: z.string().optional(),
  toolsets: z.string().optional().default(''),
  readOnly: z.boolean().default(true),
});

export const ConfigSchema = z.object({
  security: SecurityConfigSchema,
  mcp: McpConfigSchema,
  github: GitHubConfigSchema,
});

export type Config = z.infer<typeof ConfigSchema>;

export class ConfigManager {
  private static instance: ConfigManager;
  private config: Config | null = null;

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  async loadConfig(configPath?: string): Promise<Config> {
    if (this.config) {
      return this.config;
    }

    try {
      // Load from environment variables first (most secure)
      const envConfig = this.loadFromEnvironment();
      
      // Load from config file if provided
      const fileConfig = configPath ? await this.loadFromFile(configPath) : {};
      
      // Merge configurations (env variables take precedence)
      const rawConfig = {
        security: {
          workspaceRoot: envConfig.WORKSPACE_ROOT || process.cwd(),
          maxFileSize: envConfig.MAX_FILE_SIZE ? parseInt(envConfig.MAX_FILE_SIZE) : undefined,
          strictPathValidation: envConfig.STRICT_PATH_VALIDATION === 'true',
          allowAbsolutePaths: envConfig.ALLOW_ABSOLUTE_PATHS === 'true',
          allowedOperations: envConfig.ALLOWED_OPERATIONS?.split(',') || [],
          ...fileConfig.security,
        },
        mcp: {
          name: envConfig.MCP_SERVER_NAME,
          version: envConfig.MCP_SERVER_VERSION,
          port: envConfig.MCP_SERVER_PORT ? parseInt(envConfig.MCP_SERVER_PORT) : undefined,
          logLevel: envConfig.MCP_LOG_LEVEL,
          ...fileConfig.mcp,
        },
        github: {
          personalAccessToken: envConfig.GITHUB_PERSONAL_ACCESS_TOKEN,
          toolsets: envConfig.GITHUB_TOOLSETS,
          readOnly: envConfig.GITHUB_READ_ONLY === 'true',
          ...fileConfig.github,
        },
      };

      // Validate configuration
      this.config = ConfigSchema.parse(rawConfig);
      
      // Log configuration loading (without sensitive data)
      console.error('[ConfigManager] Configuration loaded successfully');
      console.error(`[ConfigManager] Workspace: ${this.getRelativePath(this.config.security.workspaceRoot)}`);
      console.error(`[ConfigManager] GitHub integration: ${this.config.github.personalAccessToken ? 'enabled' : 'disabled'}`);
      
      return this.config;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Configuration loading failed';
      console.error(`[ConfigManager] Error loading configuration: ${message}`);
      throw new Error(`Configuration error: ${message}`);
    }
  }

  private loadFromEnvironment(): Record<string, string | undefined> {
    return {
      // Security configuration
      WORKSPACE_ROOT: process.env.WORKSPACE_ROOT,
      MAX_FILE_SIZE: process.env.MAX_FILE_SIZE,
      STRICT_PATH_VALIDATION: process.env.STRICT_PATH_VALIDATION,
      ALLOW_ABSOLUTE_PATHS: process.env.ALLOW_ABSOLUTE_PATHS,
      ALLOWED_OPERATIONS: process.env.ALLOWED_OPERATIONS,
      
      // MCP configuration
      MCP_SERVER_NAME: process.env.MCP_SERVER_NAME,
      MCP_SERVER_VERSION: process.env.MCP_SERVER_VERSION,
      MCP_SERVER_PORT: process.env.MCP_SERVER_PORT,
      MCP_LOG_LEVEL: process.env.MCP_LOG_LEVEL,
      
      // GitHub configuration (NEVER log these)
      GITHUB_PERSONAL_ACCESS_TOKEN: process.env.GITHUB_PERSONAL_ACCESS_TOKEN,
      GITHUB_TOOLSETS: process.env.GITHUB_TOOLSETS,
      GITHUB_READ_ONLY: process.env.GITHUB_READ_ONLY,
    };
  }

  private async loadFromFile(configPath: string): Promise<any> {
    try {
      const configContent = await fs.readFile(configPath, 'utf-8');
      return JSON.parse(configContent);
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.error(`[ConfigManager] Config file not found: ${configPath}`);
        return {};
      }
      throw error;
    }
  }

  getConfig(): Config {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call loadConfig() first.');
    }
    return this.config;
  }

  /**
   * Get sanitized configuration for logging (removes sensitive data)
   */
  getSanitizedConfig(): Record<string, any> {
    if (!this.config) {
      return {};
    }

    return {
      security: {
        ...this.config.security,
        workspaceRoot: this.getRelativePath(this.config.security.workspaceRoot),
      },
      mcp: this.config.mcp,
      github: {
        hasToken: !!this.config.github.personalAccessToken,
        toolsets: this.config.github.toolsets,
        readOnly: this.config.github.readOnly,
      },
    };
  }

  private getRelativePath(absolutePath: string): string {
    const cwd = process.cwd();
    if (absolutePath.startsWith(cwd)) {
      return './' + path.relative(cwd, absolutePath);
    }
    return '[EXTERNAL_PATH]';
  }

  /**
   * Validate that required environment variables are set
   */
  validateEnvironment(): string[] {
    const warnings: string[] = [];
    
    if (!process.env.GITHUB_PERSONAL_ACCESS_TOKEN) {
      warnings.push('GITHUB_PERSONAL_ACCESS_TOKEN not set - GitHub integration will be disabled');
    }
    
    if (!process.env.WORKSPACE_ROOT) {
      warnings.push('WORKSPACE_ROOT not set - using current directory');
    }
    
    return warnings;
  }
}

// Singleton instance
export const configManager = ConfigManager.getInstance();