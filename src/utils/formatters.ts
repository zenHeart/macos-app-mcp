/**
 * Formatting utilities for CLI output
 */

export interface OperationLog {
  id: string;
  timestamp: string;
  operation: string;
  app: string;
  target: any;
  metadata?: any;
}

/**
 * Formats a flat list of paths into a tree structure
 * @param paths Example: ["a", "a/b", "c"]
 */
export function formatFolderTree(paths: string[]): string {
  if (paths.length === 0) return "No folders found.";

  const sortedPaths = [...paths].sort();
  const tree: any = {};

  // Build nested object
  for (const path of sortedPaths) {
    const parts = path.split("/");
    let current = tree;
    for (const part of parts) {
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part];
    }
  }

  const lines: string[] = [];

  function render(obj: any, prefix: string = "") {
    const keys = Object.keys(obj).sort();
    keys.forEach((key, index) => {
      const isLast = index === keys.length - 1;
      const connector = isLast ? "└── " : "├── ";
      lines.push(`${prefix}${connector}${key}`);

      const newPrefix = prefix + (isLast ? "    " : "│   ");
      render(obj[key], newPrefix);
    });
  }

  render(tree);
  return lines.join("\n");
}

/**
 * Formats operation logs into a readable ASCII table
 */
export function formatLogTable(logs: OperationLog[]): string {
  if (!logs || logs.length === 0) return "No logs found.";

  const headers = ["ID", "Time", "App", "Op", "Target", "Folder"];
  const rows = logs.map((log) => {
    const time = new Date(log.timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const target =
      log.target?.title ||
      log.target?.text ||
      log.target?.summary ||
      JSON.stringify(log.target);
    const folder = log.metadata?.folder || log.metadata?.list || "-";

    return [
      log.id.substring(0, 8),
      time,
      log.app,
      log.operation,
      truncate(target, 20),
      truncate(folder, 15),
    ];
  });

  // Calculate column widths
  const widths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => r[i].length)),
  );

  // Build table
  const sep = "+" + widths.map((w) => "-".repeat(w + 2)).join("+") + "+";
  const headerRow =
    "| " + headers.map((h, i) => h.padEnd(widths[i])).join(" | ") + " |";

  const contentRows = rows.map(
    (row) =>
      "| " + row.map((val, i) => val.padEnd(widths[i])).join(" | ") + " |",
  );

  return [sep, headerRow, sep, ...contentRows, sep].join("\n");
}

function truncate(str: string, length: number): string {
  if (!str) return "-";
  return str.length > length ? str.substring(0, length - 3) + "..." : str;
}
