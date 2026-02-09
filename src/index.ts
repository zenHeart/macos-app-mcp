#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
} from "@modelcontextprotocol/sdk/types.js";
import {
  Notes,
  Reminders,
  Calendar,
  Contacts,
  Messages,
} from "./apps/index.js";
import { ToolDefinitions } from "./tools/definitions.js";
import { OperationLogger } from "./utils/logger.js";
import { RecoveryManager } from "./utils/recovery.js";
import { formatLogTable } from "./utils/formatters.js";

/**
 * macOS MCP Server
 * Provides MCP server integration with native macOS applications
 */
class MacOSMcpServer {
  private server: Server;

  // Application module instances
  private notes = new Notes();
  private reminders = new Reminders();
  private calendar = new Calendar();
  private contacts = new Contacts();
  private messages = new Messages();
  private logger = OperationLogger.getInstance();
  private recovery = RecoveryManager.getInstance();

  constructor() {
    this.server = new Server(
      { name: "macos-app-mcp", version: "1.0.0" },
      { capabilities: { tools: {} } },
    );
    this.setupHandlers();
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: ToolDefinitions.map(({ name, description, schema }) => ({
        name,
        description,
        inputSchema: {
          type: "object",
          properties: Object.fromEntries(
            Object.entries(schema.shape).map(([k, v]: [string, any]) => {
              const type =
                v._def?.typeName === "ZodNumber" ? "number" : "string";
              return [k, { type }];
            }),
          ),
          required: Object.keys(schema.shape).filter((k) => {
            const field = (schema.shape as any)[k];
            return field && !field.isOptional();
          }),
        },
      })),
    }));

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          // ===== Notes Tools =====
          case "notes_query": {
            const results = await this.notes.query(
              args?.search as string,
              args?.folder as string | undefined,
            );
            return {
              content: [
                { type: "text", text: results.join("\n") || "No notes found." },
              ],
            };
          }

          case "notes_get": {
            const content = await this.notes.get(args?.title as string, {
              maxLength: args?.maxLength as number | undefined,
              folder: args?.folder as string | undefined,
              includeImages: true,
            });
            return { content: [{ type: "text", text: content }] };
          }

          case "notes_create": {
            const result = await this.notes.create(
              args?.title as string,
              args?.content as string,
              args?.folder as string | undefined,
            );
            return { content: [{ type: "text", text: result }] };
          }

          case "notes_update": {
            const result = await this.notes.update(
              args?.title as string,
              args?.newContent as string,
              args?.folder as string | undefined,
            );
            return { content: [{ type: "text", text: result }] };
          }

          case "notes_delete": {
            const result = await this.notes.delete(
              args?.title as string,
              args?.confirmTitle as string,
              args?.folder as string | undefined,
            );
            return { content: [{ type: "text", text: result }] };
          }

          case "notes_list_folders": {
            const result = await this.notes.listFolders();
            return {
              content: [
                {
                  type: "text",
                  text: result || "No folders found.",
                },
              ],
            };
          }

          // ===== Reminders Tools =====
          case "reminders_list": {
            if (!args?.listName) {
              const result = await this.reminders.listTree();
              return { content: [{ type: "text", text: result }] };
            }
            const results = await this.reminders.list(args?.listName as string);
            return {
              content: [
                {
                  type: "text",
                  text: results.join("\n") || "No reminders found.",
                },
              ],
            };
          }

          case "reminders_add": {
            const result = await this.reminders.add(
              args?.text as string,
              args?.due as string | undefined,
              args?.listName as string | undefined,
            );
            return { content: [{ type: "text", text: result }] };
          }

          case "reminders_complete": {
            const result = await this.reminders.complete(
              args?.text as string,
              args?.listName as string | undefined,
            );
            return { content: [{ type: "text", text: result }] };
          }

          case "reminders_update": {
            const result = await this.reminders.update(
              args?.oldText as string,
              args?.newText as string | undefined,
              args?.newDue as string | undefined,
              args?.listName as string | undefined,
            );
            return { content: [{ type: "text", text: result }] };
          }

          case "reminders_delete": {
            const result = await this.reminders.delete(
              args?.text as string,
              args?.confirmText as string,
              args?.listName as string | undefined,
            );
            return { content: [{ type: "text", text: result }] };
          }

          case "reminders_list_lists": {
            const results = await this.reminders.listLists();
            return {
              content: [
                {
                  type: "text",
                  text: results.join("\n") || "No reminder lists found.",
                },
              ],
            };
          }

          // ===== Calendar Tools =====
          case "calendar_list": {
            const results = await this.calendar.listEvents(
              args?.date as string,
            );
            return {
              content: [
                {
                  type: "text",
                  text: results.join("\n") || "No events found.",
                },
              ],
            };
          }

          case "calendar_create_event": {
            const result = await this.calendar.createEvent(
              args?.summary as string,
              args?.startDate as string,
              args?.endDate as string,
              args?.calendarName as string | undefined,
              args?.location as string | undefined,
            );
            return { content: [{ type: "text", text: result }] };
          }

          case "calendar_delete_event": {
            const result = await this.calendar.deleteEvent(
              args?.summary as string,
              args?.startDate as string,
              args?.confirmSummary as string,
            );
            return { content: [{ type: "text", text: result }] };
          }

          case "calendar_list_calendars": {
            const results = await this.calendar.listCalendars();
            return {
              content: [
                {
                  type: "text",
                  text: results.join("\n") || "No calendars found.",
                },
              ],
            };
          }

          // ===== Contacts Tools =====
          case "contacts_search": {
            const result = await this.contacts.search(args?.name as string);
            return {
              content: [{ type: "text", text: result || "Contact not found." }],
            };
          }

          case "contacts_list": {
            const results = await this.contacts.list(
              args?.limit as number | undefined,
            );
            return {
              content: [
                {
                  type: "text",
                  text: results.join("\n") || "No contacts found.",
                },
              ],
            };
          }

          case "contacts_get_details": {
            const result = await this.contacts.getDetails(
              args?.exactName as string,
            );
            return { content: [{ type: "text", text: result }] };
          }

          case "contacts_search_by_phone": {
            const result = await this.contacts.searchByPhone(
              args?.phoneNumber as string,
            );
            return { content: [{ type: "text", text: result }] };
          }

          case "contacts_search_by_email": {
            const result = await this.contacts.searchByEmail(
              args?.email as string,
            );
            return { content: [{ type: "text", text: result }] };
          }

          // ===== Messages Tools =====
          case "call_number": {
            await this.messages.call(args?.number as string);
            return {
              content: [{ type: "text", text: `Calling ${args?.number}...` }],
            };
          }

          case "message_send": {
            await this.messages.send(
              args?.target as string,
              args?.text as string,
            );
            return {
              content: [
                { type: "text", text: `Message sent to ${args?.target}.` },
              ],
            };
          }

          // ===== Recovery Tools =====
          case "recovery_list": {
            const results = await this.recovery.listRecoverableOperations({
              app: args?.app as any,
              operation: args?.operation as any,
              limit: args?.limit as number,
            });
            return {
              content: [
                { type: "text", text: JSON.stringify(results, null, 2) },
              ],
            };
          }

          case "recovery_details": {
            const result = await this.recovery.getRecoveryDetails(
              args?.operationId as string,
            );
            return {
              content: [
                { type: "text", text: JSON.stringify(result, null, 2) },
              ],
            };
          }

          case "recovery_recover": {
            const result = await this.recovery.recover(
              args?.operationId as string,
              args?.confirmId as string,
            );
            return {
              content: [
                { type: "text", text: JSON.stringify(result, null, 2) },
              ],
            };
          }

          case "recovery_stats": {
            const result = await this.recovery.getRecoveryStats();
            return {
              content: [
                { type: "text", text: JSON.stringify(result, null, 2) },
              ],
            };
          }

          // ===== Log Tools =====
          case "logs_recent": {
            const results = await this.logger.getRecentOperations(
              args?.limit as number,
            );
            return {
              content: [{ type: "text", text: formatLogTable(results) }],
            };
          }

          case "logs_by_app": {
            const results = await this.logger.getOperationsByApp(
              args?.app as any,
              args?.limit as number,
            );
            return {
              content: [{ type: "text", text: formatLogTable(results) }],
            };
          }

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`,
            );
        }
      } catch (err: any) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: err instanceof McpError ? err.message : String(err),
            },
          ],
        };
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("macOS MCP Server running on stdio");
  }
}

const server = new MacOSMcpServer();
server.run().catch((err) => {
  console.error("Fatal error starting server:", err);
  process.exit(1);
});
