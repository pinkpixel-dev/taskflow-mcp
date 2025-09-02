import { RequestEntry } from "../types/index.js";
import { computeProgress, computeSubtaskProgress } from "./progress.js";
import { renderDependencies } from "./dependencies.js";

export function generateMarkdownStatus(req: RequestEntry): string {
  const now = new Date().toISOString().split("T")[0];
  const prog = computeProgress(req);

  let md = `# Task Status Report: ${req.originalRequest}\n\n`;
  md += `*Generated on: ${now}*\n\n`;

  md += `## Overall Progress: ${prog.percent}%\n\n`;
  md += `- **Total Tasks:** ${prog.total}\n`;
  md += `- **Completed Tasks:** ${prog.done}\n`;
  md += `- **Remaining Tasks:** ${prog.remaining}\n\n`;

  if (req.notes && req.notes.length > 0) {
    md += "## Notes\n\n";
    for (const note of req.notes) {
      md += `### ${note.title}\n${note.content}\n\n`;
      md += `*Last updated: ${new Date(note.updatedAt).toLocaleString()}*\n\n`;
    }
  }

  md += "## Task Status\n\n";
  for (let i = 0; i < req.tasks.length; i++) {
    const task = req.tasks[i];
    const taskStatus = task.done ? "✅ Done" : "🔄 In Progress";

    md += `### ${i + 1}. ${task.title} (${taskStatus})\n`;
    md += `**Description:** ${task.description}\n\n`;
    md += `**Status:** ${taskStatus}\n`;

    if (task.done && task.completedDetails) {
      md += `**Completion Details:** ${task.completedDetails}\n\n`;
    }

    if (task.subtasks.length > 0) {
      const st = computeSubtaskProgress(task);
      md += `**Subtask Progress:** ${st.percent}% (${st.done}/${st.total})\n\n`;
      md += "| Subtask | Description | Status |\n";
      md += "|---------|-------------|--------|\n";
      for (const subtask of task.subtasks) {
        const sStatus = subtask.done ? "✅ Done" : "🔄 In Progress";
        md += `| ${subtask.title} | ${subtask.description} | ${sStatus} |\n`;
      }
      md += "\n";
    }

    if (task.dependencies && task.dependencies.length > 0) {
      md += "**Dependencies:**\n";
      md += renderDependencies(task.dependencies, "md");
      md += "\n";
    }
  }
  return md;
}

export function generateHtmlStatus(req: RequestEntry): string {
  const now = new Date().toISOString().split("T")[0];
  const prog = computeProgress(req);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Task Status: ${req.originalRequest}</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 1000px; margin: 0 auto; padding: 20px; }
    h1, h2, h3 { color: #333; }
    .progress-bar { background-color: #f0f0f0; border-radius: 4px; height: 20px; margin-bottom: 20px; }
    .progress-bar-fill { background-color: #4CAF50; height: 100%; border-radius: 4px; }
    .task { border: 1px solid #ddd; padding: 15px; margin-bottom: 15px; border-radius: 4px; }
    .task-header { display: flex; justify-content: space-between; align-items: center; }
    .task-status { padding: 5px 10px; border-radius: 4px; font-size: 14px; }
    .status-done { background-color: #E8F5E9; color: #2E7D32; }
    .status-progress { background-color: #E3F2FD; color: #1565C0; }
    .note { background-color: #FFF8E1; padding: 10px; border-left: 4px solid #FFC107; margin-bottom: 15px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { text-align: left; padding: 8px; border-bottom: 1px solid #ddd; }
    th { background-color: #f2f2f2; }
  </style>
</head>
<body>
  <h1>Task Status: ${req.originalRequest}</h1>
  <p><em>Generated on: ${now}</em></p>

  <h2>Overall Progress: ${prog.percent}%</h2>
  <div class="progress-bar">
    <div class="progress-bar-fill" style="width:${prog.percent}%"></div>
  </div>
  <p>
    <strong>Total Tasks:</strong> ${prog.total} |
    <strong>Completed:</strong> ${prog.done} |
    <strong>Remaining:</strong> ${prog.remaining}
  </p>
  ${renderNotes(req)}
  <h2>Task Status</h2>
  ${renderTasks(req)}
</body>
</html>`;
}

function renderNotes(req: RequestEntry): string {
  if (!req.notes || req.notes.length === 0) return "";
  return `<h2>Notes</h2>${req.notes
    .map(
      (n) => `
  <div class="note">
    <h3>${n.title}</h3>
    <p>${n.content}</p>
    <p><small>Last updated: ${new Date(n.updatedAt).toLocaleString()}</small></p>
  </div>`
    )
    .join("")}`;
}

function renderTasks(req: RequestEntry): string {
  return req.tasks
    .map((task, idx) => {
      const taskStatusClass = task.done ? "status-done" : "status-progress";
      const taskStatus = task.done ? "Done" : "In Progress";

      const subtasks =
        task.subtasks.length > 0
          ? (() => {
              const st = computeSubtaskProgress(task);
              const rows = task.subtasks
                .map((s) => {
                  const sStatus = s.done ? "Done" : "In Progress";
                  const sClass = s.done ? "status-done" : "status-progress";
                  return `
      <tr>
        <td>${s.title}</td>
        <td>${s.description}</td>
        <td><span class="task-status ${sClass}">${sStatus}</span></td>
      </tr>`;
                })
                .join("");
              return `
    <p><strong>Subtask Progress:</strong> ${st.percent}% (${st.done}/${st.total})</p>
    <table>
      <tr>
        <th>Subtask</th>
        <th>Description</th>
        <th>Status</th>
      </tr>${rows}
    </table>`;
            })()
          : "";

      const deps =
        task.dependencies && task.dependencies.length > 0
          ? `<p><strong>Dependencies:</strong></p>${renderDependencies(task.dependencies, "html")}`
          : "";

      const completion =
        task.done && task.completedDetails
          ? `<p><strong>Completion Details:</strong> ${task.completedDetails}</p>`
          : "";

      return `
  <div class="task">
    <div class="task-header">
      <h3>${idx + 1}. ${task.title}</h3>
      <span class="task-status ${taskStatusClass}">${taskStatus}</span>
    </div>
    <p><strong>Description:</strong> ${task.description}</p>
    ${completion}
    ${subtasks}
    ${deps}
  </div>`;
    })
    .join("");
}
