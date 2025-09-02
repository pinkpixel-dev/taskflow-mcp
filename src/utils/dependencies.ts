import { Dependency } from "../types/index.js";

export function renderDependencies(
  deps: Dependency[] | undefined,
  format: "md" | "html"
): string {
  if (!deps || deps.length === 0) return "";

  if (format === "md") {
    return deps
      .map((dep) => {
        let line = `- **${dep.name}**`;
        if (dep.version) line += ` (${dep.version})`;
        if (dep.description) line += `: ${dep.description}`;
        if (dep.url) line += ` - [Link](${dep.url})`;
        return line;
      })
      .join("\n");
  }

  // html
  const items = deps
    .map((dep) => {
      const ver = dep.version ? ` (${dep.version})` : "";
      const desc = dep.description ? `: ${dep.description}` : "";
      const link = dep.url ? ` - <a href="${dep.url}">Link</a>` : "";
      return `<li>${dep.name}${ver}${desc}${link}</li>`;
    })
    .join("");
  return `<ul>${items}</ul>`;
}
