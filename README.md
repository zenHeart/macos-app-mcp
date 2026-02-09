# macOS MCP Server

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)

Production-ready Model Context Protocol (MCP) server for deep macOS integration: **Notes, Reminders, Calendar, Contacts, and Messages.**

## ✨ Features

- 🗒️ **Notes** - Full CRUD with hierarchical folder support
- ✅ **Reminders** - Manage tasks across multiple lists
- 📅 **Calendar** - View, create, and manage events
- 👥 **Contacts** - Deep search and detailed information retrieval
- 💬 **Communication** - Send iMessages and initiate phone calls
- 🛡️ **Recovery** - High-fidelity "Recently Deleted" restorer and version rollback
- 🔒 **Security** - Safety locks for destructive operations and ID-based confirmation

## 🚀 Quick Start

### 1. Configure Your MCP Client

Add this to your MCP configuration:

```json
{
  "mcpServers": {
    "macos": {
      "command": "npx",
      "args": ["-y", "macos-app-mcp"],
      "env": {
        "MCP_NOTES_FOLDER": "ai",
        "MCP_REMINDERS_LIST": "ai",
        "MCP_ALLOW_DELETE": "false"
      }
    }
  }
}
```

| Client | Config Location |
| :--- | :--- |
| **Cursor** | `Settings > Features > MCP` |
| **Claude Desktop** | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| **Windsurf** | `Settings > Extensions > MCP` |
| **Gemini CLI** | `~/.gemini/config.json` |

### 2. Start Using

Once configured, you can ask your AI assistant:

- `What's on my calendar today?`
- `Create a note titled 'Meeting Notes' with today's action items`
- `Add a reminder to call John tomorrow at 10am`
- `Find contact info for Alice`

## 🛠️ Available Tools (29 total)

| App | Tool Name | Description |
| :--- | :--- | :--- |
| **Notes** | `notes_query` | Search or list notes from macOS Notes app |
| | `notes_get` | Read note content as plain text (HTML stripped) |
| | `notes_create` | Create a new note with title and content |
| | `notes_update` | Update an existing note's content |
| | `notes_delete` | Delete a note (requires title confirmation) |
| | `notes_list_folders` | List all available note folders |
| **Reminders** | `reminders_list` | List incomplete reminders (filterable by list) |
| | `reminders_add` | Add a new reminder to a specific list |
| | `reminders_complete` | Mark a reminder as completed |
| | `reminders_update` | Update a reminder's text or due date |
| | `reminders_delete` | Delete a reminder (requires text confirmation) |
| | `reminders_list_lists` | List all available reminder lists |
| **Calendar** | `calendar_list` | List events for a specific date |
| | `calendar_create_event` | Create a new calendar event |
| | `calendar_delete_event` | Delete an event (requires summary confirmation) |
| | `calendar_list_calendars` | List all available calendars |
| **Contacts** | `contacts_search` | Search for contact info (phone/email) by name |
| | `contacts_list` | List all contacts (limited output) |
| | `contacts_get_details` | Get comprehensive contact info by exact name |
| | `contacts_search_by_phone` | Search for a contact by phone number |
| | `contacts_search_by_email` | Search for a contact by email address |
| **Messages** | `call_number` | Initiate a phone call via FaceTime or iPhone |
| | `message_send` | Send an iMessage to a contact or number |
| **Recovery** | `recovery_list` | List recoverable (deleted/modified) items |
| | `recovery_details` | Get operation details for recovery assessment |
| | `recovery_recover` | Perform native or log-based restoration |
| | `recovery_stats` | View recovery system health and capacity |
| **Logs** | `logs_recent` | View a chronological log of recent activity |
| | `logs_by_app` | Filter operation logs by specific application |

## ⚙️ Configuration

| Variable | Default | Description |
| :--- | :--- | :--- |
| `MCP_ALLOW_DELETE` | `false` | Enable/Disable deletion capability |
| `MCP_ALLOW_UPDATE` | `false` | Enable/Disable editing capability |
| `MCP_NOTES_FOLDER` | `ai` | Default folder for new notes; auto-created if not exists |
| `MCP_REMINDERS_LIST` | `ai` | Default list for new reminders; auto-created if not exists |
| `MCP_LOGGING_ENABLED` | `true` | Required for recovery features |

## 🔧 Development

### Setup

```bash
git clone https://github.com/zenheart/macos-app-mcp
cd macos-app-mcp
pnpm install
pnpm build
```

### Testing

```bash
# Run unit tests (mocked, safe to run)
pnpm test

# Run unit tests in watch mode
pnpm test:watch

# Run with coverage report
pnpm test:coverage
```

### Integration Testing

⚠️ **Warning**: Integration tests interact with **real macOS apps** (Notes, Reminders, Calendar). Test items are prefixed with `MCP-TEST-` for identification.

```bash
# Run integration tests against real macOS apps
pnpm test:integration
```

**Known Limitations:**

- **Notes**: Newly created notes may not be immediately findable via AppleScript due to iCloud sync delays
- **Contacts**: The Contacts app must be running for contact-related tests to pass
- Some tests are skipped due to these macOS app limitations

### MCP Inspector Playground

The MCP Inspector provides an interactive web UI for testing tools manually:

```bash
# Build and start MCP Inspector (opens http://localhost:5173)
pnpm playground:dev

# Or if already built
pnpm playground
```

The Inspector allows you to:

- Browse all available tools
- Execute tools with custom parameters
- View responses and debug issues
- Monitor server logs

### Development Workflow

1. Make changes to source files in `src/`
2. Run `pnpm dev` for watch mode (auto-rebuild on save)
3. Test with unit tests: `pnpm test`
4. Test interactively: `pnpm playground:dev`
5. Run integration tests before submitting PR: `pnpm test:integration`

### Type Checking

```bash
pnpm lint
```

### Release Workflow

The project uses automated version bumping with GitHub Actions:

```bash
# Patch release (1.0.2 -> 1.0.3) - for bug fixes
pnpm release

# Minor release (1.0.2 -> 1.1.0) - for new features
pnpm release:minor

# Major release (1.0.2 -> 2.0.0) - for breaking changes
pnpm release:major
```

This will:

1. Run lint and tests
2. Build the project
3. Bump the version in `package.json`
4. Create a git tag (e.g., `v1.0.3`)
5. Push to GitHub → triggers automatic NPM publish

## 📄 License

MIT © [zenheart](mailto:zenheart_register@163.com)
