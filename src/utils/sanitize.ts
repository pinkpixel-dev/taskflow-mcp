export function sanitizeString(input: string): string {
  if (typeof input !== "string") {
    return String(input);
  }
  return input
    // "instructions.mdnnFiles" -> "instructions.md\n\nFiles"
    .replace(/\.md(nn)(?=[A-Z])/g, ".md\n\n")
    // "analyze:n-" -> "analyze:\n-"
    .replace(/:n(-)/g, ":\n$1")
    // "XnnY" -> "X\n\nY" when Y is capitalized
    .replace(/(\w)(nn)(?=[A-Z])/g, "$1\n\n")
    // ":n-" or " n-" -> "\n-"
    .replace(/(:|\s)(n)(-)/g, "$1\n$3")
    // ":(n)(?=[-*•])" -> ":\n"
    .replace(/(:)(n)(?=[-*•])/g, "$1\n")
    // Preserve literal \n sequences
    .replace(/\\n/g, "\n");
}

/**
 * Recursive sanitizer for bulk structures.
 * Use this OR per-field sanitizeString — not both.
 */
export function sanitizeTaskData<T>(data: T): T {
  if (typeof data === "string") {
    return sanitizeString(data) as unknown as T;
  }
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeTaskData(item)) as unknown as T;
  }
  if (data && typeof data === "object") {
    const sanitized: any = {};
    for (const [k, v] of Object.entries(data as any)) {
      sanitized[k] = sanitizeTaskData(v);
    }
    return sanitized;
  }
  return data;
}
