import { RequestEntry, TaskFlowFile } from "../types/index.js";

export function formatTaskProgressTableForRequest(req: RequestEntry): string {
  let table = "\nProgress Status:\n";
  table += "| Task ID | Title | Description | Status | Subtasks |\n";
  table += "|----------|----------|------|------|----------|\n";

  for (const task of req.tasks) {
    const status = task.done ? "✅ Done" : "🔄 In Progress";
    const subtaskCount = task.subtasks.length;
    const completedSubtasks = task.subtasks.filter((s) => s.done).length;
    const subtaskStatus = subtaskCount > 0 ? `${completedSubtasks}/${subtaskCount}` : "None";

    table += `| ${task.id} | ${task.title} | ${task.description} | ${status} | ${subtaskStatus} |\n`;

    if (subtaskCount > 0) {
      for (const subtask of task.subtasks) {
        const subStatus = subtask.done ? "✅ Done" : "🔄 In Progress";
        table += `| └─ ${subtask.id} | ${subtask.title} | ${subtask.description} | ${subStatus} | - |\n`;
      }
    }
  }

  return table;
}

export function formatRequestsList(data: TaskFlowFile): string {
  let output = "\nRequests List:\n";
  output += "| Request ID | Original Request | Total Tasks | Completed |\n";
  output += "|------------|------------------|-------------|-----------|\n";

  for (const req of data.requests) {
    const totalTasks = req.tasks.length;
    const completedTasks = req.tasks.filter((t) => t.done).length;
    const shortReq =
      req.originalRequest.length > 30
        ? `${req.originalRequest.substring(0, 30)}...`
        : req.originalRequest;
    output += `| ${req.requestId} | ${shortReq} | ${totalTasks} | ${completedTasks} |\n`;
  }

  return output;
}
