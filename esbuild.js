const esbuild = require("esbuild");

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
	name: 'esbuild-problem-matcher',

	setup(build) {
		build.onStart(() => {
			console.log('[watch] build started');
		});
		build.onEnd((result) => {
			result.errors.forEach(({ text, location }) => {
				console.error(`✘ [ERROR] ${text}`);
				console.error(`    ${location.file}:${location.line}:${location.column}:`);
			});
			console.log('[watch] build finished');
		});
	},
};

async function main() {
	// Build extension
	const extensionCtx = await esbuild.context({
		entryPoints: [
			'src/extension.ts'
		],
		bundle: true,
		format: 'cjs',
		minify: production,
		sourcemap: !production,
		sourcesContent: false,
		platform: 'node',
		outfile: 'dist/extension.js',
		external: ['vscode'],
		logLevel: 'silent',
		plugins: [
			esbuildProblemMatcherPlugin,
		],
	});

	// Build MCP server
	const serverCtx = await esbuild.context({
		entryPoints: [
			'src/ModularMcpServer.ts' // Updated entry point
		],
		bundle: true,
		format: 'esm',
		minify: production,
		sourcemap: !production,
		sourcesContent: false,
		platform: 'node',
		outfile: 'out/mcpServer.js',
		external: [],
		logLevel: 'silent',
		banner: {
			js: '#!/usr/bin/env node',
		},
		plugins: [
			esbuildProblemMatcherPlugin,
		],
	});

	if (watch) {
		await Promise.all([
			extensionCtx.watch(),
			serverCtx.watch()
		]);
	} else {
		await Promise.all([
			extensionCtx.rebuild(),
			serverCtx.rebuild()
		]);
		await Promise.all([
			extensionCtx.dispose(),
			serverCtx.dispose()
		]);
	}
}

main().catch(e => {
	console.error(e);
	process.exit(1);
});
