// src/services/TaskFlowService.ts

import fs from "node:fs/promises";
import path from "node:path";

import {
  Dependency,
  Note,
  RequestEntry,
  Task,
  TaskFlowFile,
} from "../types/index.js";

import { sanitizeString /* sanitizeTaskData */ } from "../utils/sanitize.js";
import { parseTaskFlowFile, stringifyTaskFlowFile } from "../utils/fileFormat.js";
import { resolveExportPath } from "../utils/paths.js";
import { TaskFactory } from "../utils/factory.js";
import { formatRequestsList, formatTaskProgressTableForRequest } from "../utils/formatTables.js";
import { generateMarkdownStatus, generateHtmlStatus } from "../utils/reports.js";
import { generatePlanningMarkdown } from "../utils/planning.js";

// You can keep this configurable
const TASK_FILE_PATH =
  process.env.TASK_FILE_PATH || path.resolve(process.cwd(), "tasks.yaml");

export class TaskFlowService {
  private data: TaskFlowFile = { requests: [] };
  private requestCounter = 0;
  private taskCounter = 0;

  // ===== IO =====
  private async loadTasks() {
    try {
      const raw = await fs.readFile(TASK_FILE_PATH, "utf-8");
      const ext = path.extname(TASK_FILE_PATH).toLowerCase();
      this.data = parseTaskFlowFile(raw, ext);

      // Rebuild counters from existing IDs
      const allTaskIds: number[] = [];
      const allRequestIds: number[] = [];

      for (const req of this.data.requests) {
        const reqNum = Number.parseInt(req.requestId.replace("req-", ""), 10);
        if (!Number.isNaN(reqNum)) allRequestIds.push(reqNum);

        for (const t of req.tasks) {
          const tNum = Number.parseInt(t.id.replace("task-", ""), 10);
          if (!Number.isNaN(tNum)) allTaskIds.push(tNum);

          for (const s of t.subtasks ?? []) {
            const sNum = Number.parseInt(s.id.replace("subtask-", ""), 10);
            if (!Number.isNaN(sNum)) allTaskIds.push(sNum);
          }
        }

        for (const n of req.notes ?? []) {
          const nNum = Number.parseInt(n.id.replace("note-", ""), 10);
          if (!Number.isNaN(nNum)) allTaskIds.push(nNum);
        }
      }

      this.requestCounter = allRequestIds.length > 0 ? Math.max(...allRequestIds) : 0;
      this.taskCounter = allTaskIds.length > 0 ? Math.max(...allTaskIds) : 0;
    } catch (error) {
      console.warn(
        `Error loading tasks from ${TASK_FILE_PATH}:`,
        error instanceof Error ? error.message : error
      );
      this.data = { requests: [] };
      this.requestCounter = 0;
      this.taskCounter = 0;
    }
  }

  private async saveTasks() {
    const ext = path.extname(TASK_FILE_PATH).toLowerCase();
    try {
      const content = stringifyTaskFlowFile(this.data, ext);
      await fs.writeFile(TASK_FILE_PATH, content, "utf-8");
    } catch (error) {
      if (error instanceof Error && error.message.includes("EROFS")) {
        console.error("EROFS: read-only file system. Cannot save tasks.");
        throw error;
      }
      throw error;
    }
  }

  // ===== Helpers =====
  private getRequest(requestId: string): RequestEntry | undefined {
    return this.data.requests.find((r) => r.requestId === requestId);
  }

  // ===== Public: Exporters =====
  public async exportTasksToMarkdown(requestId: string, outputPath: string): Promise<void> {
    const req = this.data.requests.find((r) => r.requestId === requestId);
    if (!req) throw new Error("Request not found");

    const markdown = generatePlanningMarkdown(req);
    try {
      await fs.writeFile(outputPath, markdown, "utf-8");
    } catch (error: unknown) {
      console.error(`Error writing to file ${outputPath}:`, error);
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to write to file: ${msg}`);
    }
  }

  public async exportTaskStatus(
    requestId: string,
    outputPath?: string,
    filename?: string,
    format: "markdown" | "json" | "html" = "markdown"
  ): Promise<{ outputPath: string; format: string }> {
    const req = this.data.requests.find((r) => r.requestId === requestId);
    if (!req) throw new Error("Request not found");

    const finalPath = await resolveExportPath(req, outputPath, filename, format);
    let content = "";

    switch (format) {
      case "markdown":
        content = generateMarkdownStatus(req);
        break;
      case "json":
        content = JSON.stringify(req, null, 2);
        break;
      case "html":
        content = generateHtmlStatus(req);
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    try {
      const dir = path.dirname(finalPath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(finalPath, content, "utf-8");
      return { outputPath: finalPath, format };
    } catch (error: unknown) {
      console.error(`Error writing to file ${finalPath}:`, error);
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to write to file ${finalPath}: ${msg}`);
    }
  }

  // ===== Public: Queries & Mutations =====
  public async requestPlanning(
    originalRequest: string,
    tasks: {
      title: string;
      description: string;
      subtasks?: { title: string; description: string }[];
      dependencies?: Dependency[];
    }[],
    splitDetails?: string,
    outputPath?: string,
    dependencies?: Dependency[],
    notes?: { title: string; content: string }[]
  ) {
    await this.loadTasks();
    this.requestCounter += 1;
    const requestId = `req-${this.requestCounter}`;

    // Sanitize plain strings; rely on factory to sanitize task fields
    const sanitizedOriginalRequest = sanitizeString(originalRequest);
    const sanitizedSplitDetails = splitDetails ? sanitizeString(splitDetails) : undefined;

    // Create tasks using a factory wired to the counter
    const factory = new TaskFactory({ value: this.taskCounter });
    const newTasks: Task[] = tasks.map((t) => factory.createTask(t));
    this.taskCounter = factory["counterRef"].value; // sync back

    // Notes
    const processedNotes: Note[] = [];
    if (notes && notes.length > 0) {
      for (const n of notes) {
        const now = new Date().toISOString();
        const noteId = factory.createNoteId();
        processedNotes.push({
          id: noteId,
          title: sanitizeString(n.title),
          content: sanitizeString(n.content),
          createdAt: now,
          updatedAt: now,
        });
      }
      this.taskCounter = factory["counterRef"].value;
    }

    this.data.requests.push({
      requestId,
      originalRequest: sanitizedOriginalRequest,
      splitDetails: sanitizedSplitDetails || sanitizedOriginalRequest,
      tasks: newTasks,
      completed: false,
      dependencies,
      notes: processedNotes,
    });

    await this.saveTasks();

    if (outputPath) {
      await this.exportTasksToMarkdown(requestId, outputPath);
    }

    const req = this.getRequest(requestId)!;
    const progressTable = formatTaskProgressTableForRequest(req);

    return {
      status: "planned",
      requestId,
      totalTasks: newTasks.length,
      outputPath: outputPath || undefined,
      tasks: newTasks.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
      })),
      message: `Tasks have been successfully added. Please use 'get_next_task' to retrieve the first task.\n${progressTable}`,
    };
  }

  public async getNextTask(requestId: string) {
    await this.loadTasks();
    const req = this.getRequest(requestId);
    if (!req) return { status: "error", message: "Request not found" };
    if (req.completed) {
      return { status: "already_completed", message: "Request already completed." };
    }

    const nextTask = req.tasks.find((t) => !t.done);
    if (!nextTask) {
      const allDone = req.tasks.every((t) => t.done);
      if (allDone && !req.completed) {
        const progressTable = formatTaskProgressTableForRequest(req);
        return {
          status: "all_tasks_done",
          message: `All tasks have been completed. Awaiting completion approval.\n${progressTable}`,
        };
      }
      return { status: "no_next_task", message: "No undone tasks found." };
    }

    const progressTable = formatTaskProgressTableForRequest(req);
    return {
      status: "next_task",
      task: { id: nextTask.id, title: nextTask.title, description: nextTask.description },
      message: `Next task is ready. Task approval will be required after completion.\n${progressTable}`,
    };
  }

  public async markTaskDone(requestId: string, taskId: string, completedDetails?: string) {
    await this.loadTasks();
    const req = this.getRequest(requestId);
    if (!req) return { status: "error", message: "Request not found" };

    const task = req.tasks.find((t) => t.id === taskId);
    if (!task) return { status: "error", message: "Task not found" };
    if (task.done) return { status: "already_done", message: "Task is already marked done." };

    const hasSubtasks = task.subtasks.length > 0;
    const allSubtasksDone = task.subtasks.every((s) => s.done);
    if (hasSubtasks && !allSubtasksDone) {
      return {
        status: "subtasks_pending",
        message: "Cannot mark task as done until all subtasks are completed.",
        pendingSubtasks: task.subtasks.filter((s) => !s.done).map((s) => ({ id: s.id, title: s.title })),
      };
    }

    task.done = true;
    task.completedDetails = completedDetails || "";
    await this.saveTasks();

    const progressTable = formatTaskProgressTableForRequest(req);
    return {
      status: "task_marked_done",
      requestId: req.requestId,
      task: {
        id: task.id,
        title: task.title,
        description: task.description,
        completedDetails: task.completedDetails,
        approved: task.approved,
        subtasks: task.subtasks.map((s) => ({
          id: s.id,
          title: s.title,
          description: s.description,
          done: s.done,
        })),
      },
      message: `Task ${taskId} has been marked as done.\n${progressTable}`,
    };
  }

  public async openTaskDetails(taskId: string) {
    await this.loadTasks();
    for (const req of this.data.requests) {
      const target = req.tasks.find((t) => t.id === taskId);
      if (target) {
        return {
          status: "task_details",
          requestId: req.requestId,
          originalRequest: req.originalRequest,
          splitDetails: req.splitDetails,
          completed: req.completed,
          task: {
            id: target.id,
            title: target.title,
            description: target.description,
            done: target.done,
            approved: target.approved,
            completedDetails: target.completedDetails,
            subtasks: target.subtasks.map((s) => ({
              id: s.id,
              title: s.title,
              description: s.description,
              done: s.done,
            })),
          },
        };
      }

      for (const task of req.tasks) {
        const subtask = task.subtasks.find((s) => s.id === taskId);
        if (subtask) {
          return {
            status: "subtask_details",
            requestId: req.requestId,
            taskId: task.id,
            subtask: {
              id: subtask.id,
              title: subtask.title,
              description: subtask.description,
              done: subtask.done,
            },
            parentTask: {
              id: task.id,
              title: task.title,
            },
          };
        }
      }
    }
    return { status: "task_not_found", message: "No such task or subtask found" };
  }

  public async listRequests() {
    await this.loadTasks();
    const requestsList = formatRequestsList(this.data);
    return {
      status: "requests_listed",
      message: `Current requests in the system:\n${requestsList}`,
      requests: this.data.requests.map((req) => ({
        requestId: req.requestId,
        originalRequest: req.originalRequest,
        totalTasks: req.tasks.length,
        completedTasks: req.tasks.filter((t) => t.done).length,
      })),
    };
  }

  public async addTasksToRequest(
    requestId: string,
    tasks: {
      title: string;
      description: string;
      subtasks?: { title: string; description: string }[];
      dependencies?: Dependency[];
    }[]
  ) {
    await this.loadTasks();
    const req = this.getRequest(requestId);
    if (!req) return { status: "error", message: "Request not found" };
    if (req.completed) return { status: "error", message: "Cannot add tasks to completed request" };

    const factory = new TaskFactory({ value: this.taskCounter });
    const newTasks: Task[] = tasks.map((t) => factory.createTask(t));
    this.taskCounter = factory["counterRef"].value;

    req.tasks.push(...newTasks);
    await this.saveTasks();

    const progressTable = formatTaskProgressTableForRequest(req);
    return {
      status: "tasks_added",
      message: `Added ${newTasks.length} new tasks to request.\n${progressTable}`,
      newTasks: newTasks.map((t) => ({ id: t.id, title: t.title, description: t.description })),
    };
  }

  public async updateTask(
    requestId: string,
    taskId: string,
    updates: { title?: string; description?: string }
  ) {
    await this.loadTasks();
    const req = this.getRequest(requestId);
    if (!req) return { status: "error", message: "Request not found" };

    const task = req.tasks.find((t) => t.id === taskId);
    if (!task) return { status: "error", message: "Task not found" };
    if (task.done) return { status: "error", message: "Cannot update completed task" };

    if (updates.title) task.title = sanitizeString(updates.title);
    if (updates.description) task.description = sanitizeString(updates.description);

    await this.saveTasks();

    const progressTable = formatTaskProgressTableForRequest(req);
    return {
      status: "task_updated",
      message: `Task ${taskId} has been updated.\n${progressTable}`,
      task: { id: task.id, title: task.title, description: task.description },
    };
  }

  public async deleteTask(requestId: string, taskId: string) {
    await this.loadTasks();
    const req = this.getRequest(requestId);
    if (!req) return { status: "error", message: "Request not found" };

    const taskIndex = req.tasks.findIndex((t) => t.id === taskId);
    if (taskIndex === -1) return { status: "error", message: "Task not found" };
    if (req.tasks[taskIndex].done) return { status: "error", message: "Cannot delete completed task" };

    req.tasks.splice(taskIndex, 1);
    await this.saveTasks();

    const progressTable = formatTaskProgressTableForRequest(req);
    return { status: "task_deleted", message: `Task ${taskId} has been deleted.\n${progressTable}` };
  }

  public async addSubtasks(
    requestId: string,
    taskId: string,
    subtasks: { title: string; description: string }[]
  ) {
    await this.loadTasks();
    const req = this.getRequest(requestId);
    if (!req) return { status: "error", message: "Request not found" };

    const task = req.tasks.find((t) => t.id === taskId);
    if (!task) return { status: "error", message: "Task not found" };
    if (task.done) return { status: "error", message: "Cannot add subtasks to completed task" };

    const factory = new TaskFactory({ value: this.taskCounter });
    const newSubtasks = subtasks.map((s) => factory.createSubtask(s));
    this.taskCounter = factory["counterRef"].value;

    task.subtasks.push(...newSubtasks);
    await this.saveTasks();

    const progressTable = formatTaskProgressTableForRequest(req);
    return {
      status: "subtasks_added",
      message: `Added ${newSubtasks.length} new subtasks to task ${taskId}.\n${progressTable}`,
      newSubtasks: newSubtasks.map((s) => ({ id: s.id, title: s.title, description: s.description })),
    };
  }

  public async markSubtaskDone(requestId: string, taskId: string, subtaskId: string) {
    await this.loadTasks();
    const req = this.getRequest(requestId);
    if (!req) return { status: "error", message: "Request not found" };

    const task = req.tasks.find((t) => t.id === taskId);
    if (!task) return { status: "error", message: "Task not found" };

    const subtask = task.subtasks.find((s) => s.id === subtaskId);
    if (!subtask) return { status: "error", message: "Subtask not found" };
    if (subtask.done) return { status: "already_done", message: "Subtask is already marked done" };

    subtask.done = true;
    await this.saveTasks();

    const progressTable = formatTaskProgressTableForRequest(req);
    return {
      status: "subtask_marked_done",
      message: `Subtask ${subtaskId} has been marked as done.\n${progressTable}`,
      subtask: { id: subtask.id, title: subtask.title, description: subtask.description, done: subtask.done },
      allSubtasksDone: task.subtasks.every((s) => s.done),
    };
  }

  public async updateSubtask(
    requestId: string,
    taskId: string,
    subtaskId: string,
    updates: { title?: string; description?: string }
  ) {
    await this.loadTasks();
    const req = this.getRequest(requestId);
    if (!req) return { status: "error", message: "Request not found" };

    const task = req.tasks.find((t) => t.id === taskId);
    if (!task) return { status: "error", message: "Task not found" };

    const subtask = task.subtasks.find((s) => s.id === subtaskId);
    if (!subtask) return { status: "error", message: "Subtask not found" };
    if (subtask.done) return { status: "error", message: "Cannot update completed subtask" };

    if (updates.title) subtask.title = sanitizeString(updates.title);
    if (updates.description) subtask.description = sanitizeString(updates.description);

    await this.saveTasks();

    const progressTable = formatTaskProgressTableForRequest(req);
    return {
      status: "subtask_updated",
      message: `Subtask ${subtaskId} has been updated.\n${progressTable}`,
      subtask: { id: subtask.id, title: subtask.title, description: subtask.description, done: subtask.done },
    };
  }

  public async deleteSubtask(requestId: string, taskId: string, subtaskId: string) {
    await this.loadTasks();
    const req = this.getRequest(requestId);
    if (!req) return { status: "error", message: "Request not found" };

    const task = req.tasks.find((t) => t.id === taskId);
    if (!task) return { status: "error", message: "Task not found" };

    const subtaskIndex = task.subtasks.findIndex((s) => s.id === subtaskId);
    if (subtaskIndex === -1) return { status: "error", message: "Subtask not found" };
    if (task.subtasks[subtaskIndex].done) return { status: "error", message: "Cannot delete completed subtask" };

    task.subtasks.splice(subtaskIndex, 1);
    await this.saveTasks();

    const progressTable = formatTaskProgressTableForRequest(req);
    return { status: "subtask_deleted", message: `Subtask ${subtaskId} has been deleted.\n${progressTable}` };
  }

  public async addNote(requestId: string, title: string, content: string) {
    await this.loadTasks();
    const req = this.getRequest(requestId);
    if (!req) return { status: "error", message: "Request not found" };

    const now = new Date().toISOString();
    const factory = new TaskFactory({ value: this.taskCounter });
    const noteId = factory.createNoteId();
    this.taskCounter = factory["counterRef"].value;

    const note: Note = {
      id: noteId,
      title: sanitizeString(title),
      content: sanitizeString(content),
      createdAt: now,
      updatedAt: now,
    };

    if (!req.notes) req.notes = [];
    req.notes.push(note);
    await this.saveTasks();

    return {
      status: "note_added",
      message: `Note "${title}" has been added to request ${requestId}.`,
      note,
    };
  }

  public async updateNote(requestId: string, noteId: string, updates: { title?: string; content?: string }) {
    await this.loadTasks();
    const req = this.getRequest(requestId);
    if (!req) return { status: "error", message: "Request not found" };

    if (!req.notes) return { status: "error", message: "No notes found for this request" };

    const noteIndex = req.notes.findIndex((n) => n.id === noteId);
    if (noteIndex === -1) return { status: "error", message: "Note not found" };

    const note = req.notes[noteIndex];
    if (updates.title) note.title = sanitizeString(updates.title);
    if (updates.content) note.content = sanitizeString(updates.content);
    note.updatedAt = new Date().toISOString();

    await this.saveTasks();

    return { status: "note_updated", message: `Note ${noteId} has been updated.`, note };
  }

  public async deleteNote(requestId: string, noteId: string) {
    await this.loadTasks();
    const req = this.getRequest(requestId);
    if (!req) return { status: "error", message: "Request not found" };

    if (!req.notes) return { status: "error", message: "No notes found for this request" };

    const noteIndex = req.notes.findIndex((n) => n.id === noteId);
    if (noteIndex === -1) return { status: "error", message: "Note not found" };

    req.notes.splice(noteIndex, 1);
    await this.saveTasks();

    return { status: "note_deleted", message: `Note ${noteId} has been deleted.` };
  }

  public async addDependency(requestId: string, dependency: Dependency, taskId?: string) {
    await this.loadTasks();
    const req = this.getRequest(requestId);
    if (!req) return { status: "error", message: "Request not found" };

    if (taskId) {
      const task = req.tasks.find((t) => t.id === taskId);
      if (!task) return { status: "error", message: "Task not found" };

      if (!task.dependencies) task.dependencies = [];
      task.dependencies.push(dependency);
      await this.saveTasks();

      return {
        status: "dependency_added_to_task",
        message: `Dependency "${dependency.name}" has been added to task ${taskId}.`,
        dependency,
      };
    } else {
      if (!req.dependencies) req.dependencies = [];
      req.dependencies.push(dependency);
      await this.saveTasks();

      return {
        status: "dependency_added_to_request",
        message: `Dependency "${dependency.name}" has been added to request ${requestId}.`,
        dependency,
      };
    }
  }
}
