#!/bin/bash
# Security Test Suite for MCP Server

echo "======= SECURITY TEST SUITE ======="
echo ""

echo "1. Absolute path attack (/etc/passwd):"
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"file_operation","arguments":{"operation":"read","path":"/etc/passwd"}}}' | node out/mcpServer.js 2>&1 | grep -o '"text":"[^"]*"' | head -1
echo ""

echo "2. Path traversal attack (../):"
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"file_operation","arguments":{"operation":"read","path":"../../../etc/passwd"}}}' | node out/mcpServer.js 2>&1 | grep -o '"text":"[^"]*"' | head -1
echo ""

echo "3. Path with ./ prefix:"
echo '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"file_operation","arguments":{"operation":"read","path":"./package.json"}}}' | node out/mcpServer.js 2>&1 | grep -o '"text":"[^"]*"' | head -1
echo ""

echo "4. Valid workspace file:"
echo '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"file_operation","arguments":{"operation":"read","path":"package.json"}}}' | node out/mcpServer.js 2>&1 | grep '"name"' | head -1
echo ""

echo "5. Calculator injection (semicolon):"
echo '{"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"calculate","arguments":{"expression":"2+2; process.exit()"}}}' | node out/mcpServer.js 2>&1 | grep -o '"text":"[^"]*"' | head -1
echo ""

echo "6. Calculator injection (eval):"
echo '{"jsonrpc":"2.0","id":6,"method":"tools/call","params":{"name":"calculate","arguments":{"expression":"eval(123)"}}}' | node out/mcpServer.js 2>&1 | grep -o '"text":"[^"]*"' | head -1
echo ""

echo "7. Valid calculation:"
echo '{"jsonrpc":"2.0","id":7,"method":"tools/call","params":{"name":"calculate","arguments":{"expression":"(10+5)*2"}}}' | node out/mcpServer.js 2>&1 | grep -o '"text":"[^"]*"' | head -1
echo ""

echo "======= END TEST SUITE ======="
