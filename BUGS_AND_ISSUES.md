# Bugs and Issues Found

## Critical Security Issues

### 🔴 CRITICAL: Path Traversal Vulnerability (src/mcpServer.ts:216-248)
**Severity:** CRITICAL
**Location:** `handleFileOperation` method
**Issue:** The file operation tool allows reading ANY file on the system without path validation.

**Evidence:**
```bash
# Successfully read /etc/passwd
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"file_operation","arguments":{"operation":"read","path":"/etc/passwd"}}}' | node out/mcpServer.js
```

**Impact:**
- Attackers can read sensitive files (credentials, keys, etc.)
- Can write to arbitrary locations on the filesystem
- No sandboxing or path restrictions

**Recommendation:**
- Implement a whitelist of allowed directories
- Use `path.resolve()` and validate paths are within allowed boundaries
- Add path traversal detection (e.g., reject `..` in paths)
- Consider using a workspace root restriction

**Fix Example:**
```typescript
private async handleFileOperation(args: any) {
  const { operation, path: requestedPath, content } = FileOperationToolSchema.parse(args);

  // Resolve and validate path
  const workspaceRoot = process.cwd(); // or from config
  const resolvedPath = path.resolve(workspaceRoot, requestedPath);

  // Prevent path traversal
  if (!resolvedPath.startsWith(workspaceRoot)) {
    throw new Error('Access denied: Path is outside workspace');
  }

  // ... rest of implementation
}
```

---

### 🟡 MEDIUM: Use of eval() in Calculator (src/mcpServer.ts:186)
**Severity:** MEDIUM
**Location:** `handleCalculate` method
**Issue:** Uses `eval()` which is dangerous even with sanitization.

**Current Protection:**
- Regex sanitization removes non-math characters
- Catches injection attempts (tested successfully)

**Evidence:**
```bash
# Injection blocked correctly
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"calculate","arguments":{"expression":"2+2; console.log(\"pwned\")"}}}' | node out/mcpServer.js
# Returns: "Error: Expression contains invalid characters"
```

**Recommendation:**
- Replace with a proper math library (mathjs, math-expression-evaluator)
- Current sanitization is good but eval() is still risky

**Fix Example:**
```typescript
import { create, all } from 'mathjs';
const math = create(all);

const result = math.evaluate(expression);
```

---

## High Priority Bugs

### 🔴 Bug: No Process Cleanup (src/extension.ts:82-96)
**Severity:** HIGH
**Location:** `startMcpServer` function
**Issue:** Server process is spawned but never tracked or cleaned up.

**Problems:**
1. No reference stored to kill the process later
2. Multiple calls create orphaned processes
3. No cleanup in `deactivate()` function
4. Processes continue running after extension unload

**Fix:**
```typescript
let serverProcess: childProcess.ChildProcess | null = null;

function startMcpServer(context: vscode.ExtensionContext) {
  // Kill existing process if running
  if (serverProcess) {
    serverProcess.kill();
  }

  const serverPath = path.join(context.extensionPath, 'out', 'mcpServer.js');

  try {
    serverProcess = childProcess.spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    // ... event handlers
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to start MCP Server: ${error}`);
  }
}

export function deactivate() {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
}
```

---

### 🟡 Bug: EventEmitter Never Fires (src/extension.ts:8)
**Severity:** MEDIUM
**Location:** `McpServerProvider` class
**Issue:** `_onDidChangeMcpServerDefinitions` EventEmitter is created but never fired.

**Impact:**
- VS Code won't know when MCP servers change
- Dynamic server updates won't work
- Dead code that serves no purpose

**Fix:**
Either implement it or remove it:
```typescript
// Option 1: Remove if not needed
// Option 2: Fire when servers change
refreshServers() {
  this._onDidChangeMcpServerDefinitions.fire();
}
```

---

### 🟡 Bug: Hardcoded Extension ID (src/extension.ts:12)
**Severity:** LOW
**Location:** `provideMcpServerDefinitions` method
**Issue:** Extension ID is hardcoded instead of using `context.extension.id`

**Current:**
```typescript
const extensionPath = vscode.extensions.getExtension('hacker-logic.hacker-logic')?.extensionPath;
```

**Issue:**
- Won't work if extension ID changes
- Can fail in development mode
- Less maintainable

**Fix:**
```typescript
provideMcpServerDefinitions(token: vscode.CancellationToken): vscode.ProviderResult<vscode.McpServerDefinition[]> {
  // Get extension path from context passed in constructor
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
```

---

## Warnings and Code Quality Issues

### ⚠️ Warning: Module Type Warning
**Severity:** LOW
**Location:** Build output
**Issue:** Node.js warns about missing "type" field in package.json

**Output:**
```
Warning: Module type of file:///home/canstralian/Documents/copilot-build/out/mcpServer.js is not specified
```

**Fix:**
Add to package.json (but this changes the extension to ESM, which requires more changes):
```json
{
  "type": "commonjs"
}
```
Or better: configure esbuild to output proper format markers.

---

### ⚠️ Code Quality: Unused Context Parameter (src/extension.ts:104)
**Severity:** LOW
**Location:** `testMcpServer` function
**Issue:** `context` parameter is never used

**Fix:**
```typescript
async function testMcpServer() {  // Remove context parameter
  // ... implementation
}
```

---

### ⚠️ Code Quality: Error Messages Inconsistent (src/mcpServer.ts:161-169)
**Severity:** LOW
**Location:** Error handling across all handlers
**Issue:** Error messages expose internal details

**Current:**
```typescript
text: `Error getting time for timezone ${timezone}: ${error}`
```

**Recommendation:**
- Log full errors to stderr for debugging
- Return user-friendly messages
- Don't expose stack traces or system paths

---

## Error Handling Tests Results

### ✅ Calculator Security - PASS
- Injection attempts blocked correctly
- Regex sanitization working
- Error messages appropriate

### ❌ File Operations Security - FAIL
- **No path validation**
- Can read system files
- Can write anywhere with permissions

### ✅ Invalid Timezone Handling - PASS
- Gracefully handles invalid timezones
- Returns error message instead of crashing

---

## Summary

### Critical (Fix Immediately):
1. Path traversal vulnerability in file operations
2. No process cleanup causing resource leaks

### High Priority:
3. Replace eval() with math library
4. Fix EventEmitter implementation or remove it

### Medium Priority:
5. Fix hardcoded extension ID
6. Improve error messages
7. Add module type to package.json

### Low Priority:
8. Remove unused parameters
9. Add comprehensive input validation
10. Add logging/telemetry

---

## Testing Performed

```bash
# Security test - Calculator injection (BLOCKED ✅)
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"calculate","arguments":{"expression":"2+2; console.log(\"pwned\")"}}}' | node out/mcpServer.js

# Security test - Path traversal (VULNERABLE ❌)
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"file_operation","arguments":{"operation":"read","path":"/etc/passwd"}}}' | node out/mcpServer.js

# Error handling - Invalid timezone (HANDLED ✅)
echo '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"get_time","arguments":{"timezone":"Invalid/Timezone"}}}' | node out/mcpServer.js

# Functionality - Calculator (WORKS ✅)
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"calculate","arguments":{"expression":"2+2"}}}' | node out/mcpServer.js
```

---

**Generated:** 2025-10-09
**Tool:** Claude Code Analysis
