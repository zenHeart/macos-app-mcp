# MCP Playground

This directory contains tools and resources for testing and validating the macOS MCP Server.

## Quick Start

### 1. Using MCP Inspector (Recommended for Interactive Testing)

The MCP Inspector is an official tool for interactively testing MCP servers. It provides a web-based UI to:

- Explore available tools
- Execute tools with custom parameters
- View responses and logs

```bash
# Run the MCP Inspector with our server
pnpm run playground

# Or directly with npx
npx @modelcontextprotocol/inspector node dist/index.js
```

This will open a web interface at `http://localhost:5173` where you can interactively test all tools.

### 2. Running Integration Tests

Integration tests run real AppleScript commands against your macOS apps. **These tests will create/modify/delete real data in your Notes, Reminders, and Calendar apps.**

```bash
# Run all integration tests
pnpm run test:integration

# Run specific app integration tests
pnpm run test:integration -- --grep "Notes"
pnpm run test:integration -- --grep "Reminders"
pnpm run test:integration -- --grep "Calendar"
```

### 3. Test Scenarios

See [SCENARIOS.md](./SCENARIOS.md) for a comprehensive list of test scenarios that simulate real user workflows.

## Directory Structure

```
playground/
├── README.md              # This file
├── SCENARIOS.md           # Test scenarios and user workflows
├── integration/           # Integration test files
│   ├── notes.integration.ts
│   ├── reminders.integration.ts
│   ├── calendar.integration.ts
│   └── full-workflow.integration.ts
└── scripts/               # Helper scripts
    └── setup-test-data.ts
```

## Safety Notes

⚠️ **Important**: Integration tests interact with REAL macOS applications:

- Tests will create test items (prefixed with `[MCP-TEST]`)
- Tests will attempt to clean up after themselves
- However, if tests fail, test data may remain in your apps
- Consider using a separate macOS user account for testing

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MCP_ALLOW_DELETE` | `false` | Enable delete operations |
| `MCP_ALLOW_UPDATE` | `false` | Enable update operations |
| `MCP_NOTES_FOLDER` | - | Default notes folder |
| `MCP_REMINDERS_LIST` | - | Default reminders list |
| `MCP_CALENDAR` | - | Default calendar name |

For integration tests, these are automatically set to enable all operations.
