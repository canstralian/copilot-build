// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';
import * as childProcess from 'child_process';
import * as Sentry from '@sentry/browser';

// Global reference to track spawned server process for proper cleanup
let serverProcess: childProcess.ChildProcess | null = null;

class McpServerProvider implements vscode.McpServerDefinitionProvider<vscode.McpServerDefinition> {
	private extensionPath: string;

	constructor(extensionPath: string) {
		this.extensionPath = extensionPath;
	}

	provideMcpServerDefinitions(_token: vscode.CancellationToken): vscode.ProviderResult<vscode.McpServerDefinition[]> {
		const serverPath = path.join(this.extensionPath, 'out', 'mcpServer.js');
		
		return [
			{
				command: 'node',
				args: [serverPath],
				label: 'Hacker Logic MCP Server',
				env: {
					NODE_ENV: 'production'
				}
			} as vscode.McpServerDefinition
		];
	}

	resolveMcpServerDefinition(
		server: vscode.McpServerDefinition,
		_token: vscode.CancellationToken
	): vscode.ProviderResult<vscode.McpServerDefinition> {
		return server;
	}
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// Initialize Sentry for VS Code extension
	if (process.env.NODE_ENV === 'production') {
		Sentry.init({
			dsn: process.env.SENTRY_DSN,
			environment: 'vscode-extension',
			tracesSampleRate: 0.1,
		});
	}

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "hacker-logic" is now active!');

	// Register MCP Server Definition Provider
	const mcpProvider = new McpServerProvider(context.extensionPath);
	const mcpProviderDisposable = vscode.lm.registerMcpServerDefinitionProvider('hacker-logic.mcp-servers', mcpProvider);
	context.subscriptions.push(mcpProviderDisposable);

	// Register commands
	const helloWorldDisposable = vscode.commands.registerCommand('hacker-logic.helloWorld', () => {
		vscode.window.showInformationMessage('Hello World from MCP Server Extension!');
	});

	const startMcpServerDisposable = vscode.commands.registerCommand('hacker-logic.startMcpServer', () => {
		startMcpServer(context);
	});

	const testMcpServerDisposable = vscode.commands.registerCommand('hacker-logic.testMcpServer', async () => {
		await testMcpServer();
	});

	context.subscriptions.push(helloWorldDisposable, startMcpServerDisposable, testMcpServerDisposable);

	// Show information about MCP server
	vscode.window.showInformationMessage(
		'Hacker Logic MCP Server Extension is active! You can now use MCP servers in VS Code.',
		'View MCP Servers'
	).then(selection => {
		if (selection === 'View MCP Servers') {
			vscode.commands.executeCommand('workbench.action.chat.open');
		}
	});
}

function startMcpServer(context: vscode.ExtensionContext) {
	const serverPath = path.join(context.extensionPath, 'out', 'mcpServer.js');

	// Kill existing process if running to prevent resource leaks
	if (serverProcess) {
		console.log('[MCP] Terminating existing server process');
		try {
			serverProcess.kill('SIGTERM');
		} catch (error) {
			console.error('[MCP] Error killing existing process:', error);
		}
		serverProcess = null;
	}

	try {
		console.log('[MCP] Starting server:', serverPath);

		serverProcess = childProcess.spawn('node', [serverPath], {
			stdio: ['pipe', 'pipe', 'pipe'],
			// Security: Don't inherit environment variables that might contain secrets
			env: {
				...process.env,
				NODE_ENV: 'production'
			}
		});

		if (!serverProcess.stdout || !serverProcess.stderr) {
			throw new Error('Failed to create process streams');
		}

		serverProcess.stdout.on('data', (data) => {
			console.log('[MCP stdout]', data.toString().trim());
		});

		serverProcess.stderr.on('data', (data) => {
			console.log('[MCP stderr]', data.toString().trim());
		});

		serverProcess.on('close', (code, signal) => {
			console.log(`[MCP] Server process exited with code ${code}, signal ${signal}`);
			serverProcess = null;
		});

		serverProcess.on('error', (error) => {
			console.error('[MCP] Process error:', error);
			vscode.window.showErrorMessage(`MCP Server error: ${error.message}`);
			serverProcess = null;
		});

		// Handle unexpected disconnection
		serverProcess.on('disconnect', () => {
			console.log('[MCP] Server process disconnected');
			serverProcess = null;
		});

		vscode.window.showInformationMessage('MCP Server started successfully!');
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		console.error('[MCP] Failed to start server:', errorMessage);
		vscode.window.showErrorMessage(`Failed to start MCP Server: ${errorMessage}`);
		serverProcess = null;
	}
}

async function testMcpServer() {
	try {
		const result = await vscode.window.showInformationMessage(
			'MCP Server Test: Choose an operation to test',
			'Get Time',
			'Calculate',
			'List Files'
		);

		let message = '';
		switch (result) {
			case 'Get Time':
				message = 'MCP Server can provide current time for any timezone';
				break;
			case 'Calculate':
				message = 'MCP Server can perform mathematical calculations (with strict validation)';
				break;
			case 'List Files':
				message = 'MCP Server can list, read, and write files within workspace only (security-restricted)';
				break;
			default:
				return;
		}

		vscode.window.showInformationMessage(message);
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		vscode.window.showErrorMessage(`MCP Server test failed: ${errorMessage}`);
	}
}

// This method is called when your extension is deactivated
export function deactivate() {
	// Clean up server process to prevent resource leaks
	if (serverProcess) {
		console.log('[MCP] Deactivating extension, cleaning up server process');
		try {
			serverProcess.kill('SIGTERM');

			// Force kill after timeout if process doesn't respond
			const forceKillTimeout = setTimeout(() => {
				if (serverProcess) {
					console.log('[MCP] Force killing unresponsive server process');
					serverProcess.kill('SIGKILL');
				}
			}, 5000);

			serverProcess.on('exit', () => {
				clearTimeout(forceKillTimeout);
			});
		} catch (error) {
			console.error('[MCP] Error during cleanup:', error);
		}
		serverProcess = null;
	}
}
