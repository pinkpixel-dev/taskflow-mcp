import path from "node:path";
import fs from "node:fs/promises";
import { RequestEntry } from "../types/index.js";

/**
 * Resolves a task file path, supporting both absolute and relative paths.
 * For relative paths, resolves against either a base directory or process.cwd().
 * Provides cross-platform compatibility for Windows and Linux.
 * 
 * @param filePath - The file path (absolute or relative)
 * @param baseDir - Optional base directory to resolve relative paths against
 * @returns Resolved absolute path
 */
export function resolveTaskFilePath(filePath: string, baseDir?: string): string {
  try {
    // If it's already absolute, return as-is
    if (path.isAbsolute(filePath)) {
      return path.normalize(filePath);
    }
    
    // Use provided base directory or fallback to process.cwd()
    const resolveBase = baseDir || process.cwd();
    const resolved = path.resolve(resolveBase, filePath);
    
    // Normalize the path for cross-platform consistency
    return path.normalize(resolved);
  } catch (error) {
    // Fallback to treating as absolute if resolution fails
    console.warn(`Warning: Failed to resolve path "${filePath}", using as-is:`, error instanceof Error ? error.message : error);
    return path.normalize(filePath);
  }
}

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
