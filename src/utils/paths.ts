import path from "node:path";
import fs from "node:fs/promises";
import { RequestEntry } from "../types/index.js";

export function generateSafeFilename(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 50);
}

export async function resolveExportPath(
  req: RequestEntry,
  outputPath?: string,
  filename?: string,
  format: "markdown" | "json" | "html" = "markdown"
): Promise<string> {
  const extensions = { markdown: "md", json: "json", html: "html" } as const;
  const ext = extensions[format];
  const projectName = generateSafeFilename(req.originalRequest);
  const defaultFilename = `${projectName}_tasks.${ext}`;

  if (!outputPath) {
    return path.resolve(process.cwd(), filename || defaultFilename);
  }

  const resolvedPath = path.resolve(outputPath);
  try {
    const stats = await fs.stat(resolvedPath).catch(() => null);
    const isDirectory = stats?.isDirectory() ?? false;
    if (isDirectory || outputPath.endsWith("/") || outputPath.endsWith("\\")) {
      return path.join(resolvedPath, filename || defaultFilename);
    }
    if (path.extname(resolvedPath)) {
      return resolvedPath;
    }
    return path.join(resolvedPath, filename || defaultFilename);
  } catch {
    if (outputPath.endsWith("/") || outputPath.endsWith("\\")) {
      return path.join(resolvedPath, filename || defaultFilename);
    }
    if (!path.extname(outputPath)) {
      return path.join(resolvedPath, filename || defaultFilename);
    }
    return resolvedPath;
  }
}
