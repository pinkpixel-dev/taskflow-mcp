import { RequestEntry, Task } from "../types/index.js";

export function computeProgress(req: RequestEntry) {
  const total = req.tasks.length;
  const done = req.tasks.filter((t) => t.done).length;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  return { total, done, remaining: total - done, percent };
}

export function computeSubtaskProgress(task: Task) {
  const total = task.subtasks.length;
  const done = task.subtasks.filter((s) => s.done).length;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  return { total, done, percent };
}
