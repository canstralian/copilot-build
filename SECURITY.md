# Security Policy

## Supported Versions

We actively support the following versions with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 2.x.x   | :white_check_mark: |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security vulnerability in the Hacker Logic MCP Server Extension, please report it responsibly.

### How to Report

1. **DO NOT** create a public GitHub issue for security vulnerabilities
2. Email us directly at: <dejager.sa@gmail.com>
3. Include the following information:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested mitigation (if any)

### What to Expect

- **Acknowledgment**: We'll acknowledge receipt within 24 hours
- **Initial Assessment**: We'll provide an initial assessment within 72 hours
- **Progress Updates**: We'll keep you informed of our progress
- **Resolution**: We aim to resolve critical vulnerabilities within 7 days

### Security Features

Our extension includes several security measures:

- **Path Traversal Protection**: Prevents access outside workspace boundaries
- **Input Sanitization**: All user inputs are validated and sanitized
- **Resource Limits**: File size limits and operation timeouts
- **Safe Command Execution**: Whitelisted commands only
- **Process Isolation**: Secure subprocess management

### Security Best Practices

When using this extension:

1. Keep the extension updated to the latest version
2. Review workspace permissions carefully
3. Monitor MCP server logs for suspicious activity
4. Use the extension only in trusted workspaces
5. Report any security concerns immediately

### Coordinated Disclosure

We follow a coordinated disclosure process:

1. Report received and acknowledged
2. Vulnerability confirmed and assessed
3. Fix developed and tested
4. Security advisory published
5. Fix released to users
6. Public disclosure (if appropriate)

## Security Contact

- **Email**: <dejager.sa@gmail.com>
- **GPG Key**: Available upon request
- **Response Time**: 24-72 hours

Thank you for helping keep the Hacker Logic MCP Server Extension secure!
