import { RequestEntry } from "../types/index.js";
import { renderDependencies } from "./dependencies.js";

/** Generates the "Project Plan" markdown (used by exportTasksToMarkdown) */
export function generatePlanningMarkdown(req: RequestEntry): string {
  let md = `# Project Plan: ${req.originalRequest}\n\n`;

  if (req.splitDetails && req.splitDetails !== req.originalRequest) {
    md += `## Details\n${req.splitDetails}\n\n`;
  }

  if (req.dependencies && req.dependencies.length > 0) {
    md += "## Dependencies\n\n";
    md += renderDependencies(req.dependencies, "md");
    md += "\n\n";
  }

  if (req.notes && req.notes.length > 0) {
    md += "## Notes\n\n";
    for (const note of req.notes) {
      md += `### ${note.title}\n${note.content}\n\n`;
    }
  }

  // Overview
  md += "## Tasks Overview\n";
  for (const task of req.tasks) {
    md += `- [ ] ${task.title}\n`;

    if (task.subtasks.length > 0) {
      for (const subtask of task.subtasks) {
        md += `  - [ ] ${subtask.title}\n`;
      }
    }

    if (task.dependencies && task.dependencies.length > 0) {
      md += `  - Dependencies: `;
      md += task.dependencies
        .map((d) => d.name + (d.version ? ` (${d.version})` : ""))
        .join(", ");
      md += "\n";
    }
  }
  md += "\n";

  // Details
  md += "## Detailed Tasks\n\n";
  for (let i = 0; i < req.tasks.length; i++) {
    const task = req.tasks[i];
    md += `### ${i + 1}. ${task.title}\n`;
    md += `**Description:** ${task.description}\n\n`;

    if (task.dependencies && task.dependencies.length > 0) {
      md += "**Dependencies:**\n";
      md += renderDependencies(task.dependencies, "md");
      md += "\n";
    }

    if (task.subtasks.length > 0) {
      md += "**Subtasks:**\n";
      for (const subtask of task.subtasks) {
        md += `- [ ] ${subtask.title}\n`;
        md += `  - Description: ${subtask.description}\n`;
      }
      md += "\n";
    }
  }

  // Basic progress table (date placeholder retained)
  md += "## Progress Tracking\n\n";
  md += "| Task | Status | Completion Date |\n";
  md += "|------|--------|----------------|\n";
  for (const task of req.tasks) {
    md += `| ${task.title} | ${task.done ? "✅ Done" : "🔄 In Progress"} | ${
      task.done ? "YYYY-MM-DD" : ""
    } |\n`;
  }

  return md;
}
