# Gemini Code-Understanding Context

This document provides an overview of the `macos-mcp-server` project to guide an AI assistant in understanding and modifying the codebase.

## Project Overview

This is a Node.js project written in TypeScript that acts as a **Model Context Protocol (MCP) server for deep macOS integration**. It exposes a set of tools that allow a compatible AI model (like Gemini, Claude, etc.) to interact directly with native macOS applications, including:

- **Notes:** Full CRUD operations on notes and folders.
- **Reminders:** Managing tasks and lists.
- **Calendar:** Reading and creating events.
- **Contacts:** Searching and retrieving contact details.
- **Messages:** Sending iMessages and initiating calls.

The server is designed to be run as a background process, invoked by an MCP client such as the Gemini CLI, Cursor, or the Claude Desktop app. Communication with the macOS apps is primarily handled through executing AppleScript.

### Core Technologies

- **Language:** TypeScript
- **Runtime:** Node.js (>=18.0.0)
- **Package Manager:** pnpm
- **Build Tool:** `tsup` (for bundling TypeScript into a single ES module)
- **Testing Framework:** `vitest`
- **Dependencies:**
  - `@modelcontextprotocol/sdk`: For MCP server implementation.
  - `zod`: For data validation.

### Project Structure

```
/
├── src/                  # Main source code
│   ├── apps/             # Logic for each integrated macOS app (Notes, Calendar, etc.)
│   ├── tools/            # Definitions of the tools exposed via MCP
│   └── utils/            # Shared utilities (AppleScript execution, logging, config)
├── test/                 # Vitest unit and integration tests
├── package.json          # Project metadata, dependencies, and scripts
├── tsconfig.json         # TypeScript configuration
└── vitest.config.ts      # Vitest configuration
```

## Building and Running

The project uses `pnpm` as its package manager. Key commands are defined in `package.json`:

- **Install Dependencies:**

    ```bash
    pnpm install
    ```

- **Build the Project:**
    *Compiles TypeScript to JavaScript in the `dist` directory.*

    ```bash
    pnpm run build
    ```

- **Run in Development:**
    *Watches for file changes, rebuilds, and restarts the server on success.*

    ```bash
    pnpm run dev
    ```

- **Run Tests:**

    ```bash
    pnpm run test         # Run tests once
    pnpm run test:watch   # Run tests in watch mode
    pnpm test:coverage  # Run tests and generate a coverage report
    ```

- **Run Integration Tests:**
    *Tests against real macOS apps (Notes, Reminders, Calendar)*

    ```bash
    pnpm run test:integration  # Run integration tests
    ```

- **MCP Inspector Playground:**
    *Interactive web UI for testing MCP tools*

    ```bash
    pnpm run playground      # Start MCP Inspector (requires build first)
    pnpm run playground:dev  # Build and start MCP Inspector
    ```

- **Linting/Type-Checking:**

    ```bash
    pnpm run lint
    ```

## Development Conventions

- **Code Style:** The project uses Prettier (inferred from common TypeScript project standards, although no `.prettierrc` is visible) and a strict TypeScript configuration (`tsconfig.json`). Adhere to the existing code style.
- **Testing:** Every app and major utility has a corresponding test file in the `test/` directory (e.g., `notes.ts` -> `notes.test.ts`). New features or bug fixes should be accompanied by tests.
- **Modularity:** Functionality is organized by the application it corresponds to. Keep this separation of concerns in mind when adding new features.
- **AppleScript:** All interactions with macOS are handled via AppleScript commands executed by the `runAppleScript` utility in `src/utils/apple-script.ts`. This is the primary mechanism for OS integration.
- **Configuration:** The server is configured via environment variables (e.g., `MCP_NOTES_FOLDER`, `MCP_ALLOW_DELETE`). Configuration logic is in `src/utils/config.ts`.
- **Safety:** Destructive operations (delete/update) are disabled by default and require explicit confirmation, often by passing back the exact name of the item to be deleted. Maintain this safety pattern.
- **English Only:** All commit messages, documentation, code comments, and variable/function names MUST be written in English. This ensures consistency and accessibility for the broader developer community.
