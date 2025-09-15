// src/services/TaskFlowService.ts

import fs from "node:fs/promises";
import path from "node:path";

import {
  ArchivedRequestEntry,
  Dependency,
  Note,
  Prompts,
  RequestEntry,
  Task,
  TaskFlowArchiveFile,
  TaskFlowFile,
} from "../types/index.js";

import { sanitizeString /* sanitizeTaskData */ } from "../utils/sanitize.js";
import { parseTaskFlowFile, stringifyTaskFlowFile } from "../utils/fileFormat.js";
import { resolveExportPath, resolveTaskFilePath } from "../utils/paths.js";
import { TaskFactory } from "../utils/factory.js";
import { formatRequestsList, formatTaskProgressTableForRequest } from "../utils/formatTables.js";
import { generateMarkdownStatus, generateHtmlStatus } from "../utils/reports.js";
import { generatePlanningMarkdown } from "../utils/planning.js";

// Support both TASK_FILE_PATH and TASK_MANAGER_FILE_PATH for backward compatibility
const taskFilePathEnv = process.env.TASK_FILE_PATH || process.env.TASK_MANAGER_FILE_PATH;
const baseDir = process.env.TASK_MANAGER_BASE_DIR; // Optional base directory override
const archiveMode = process.env.ARCHIVE_MODE || "manual"; // manual | auto-on-complete

// Default to tasks.yaml in the current working directory or home directory
const defaultTaskFile = taskFilePathEnv || "tasks.yaml";
const TASK_FILE_PATH = resolveTaskFilePath(defaultTaskFile, baseDir);

// Archive file path - defaults to tasks-archive.yaml in same directory as task file
const getArchiveFilePath = () => {
  const archivePathEnv = process.env.ARCHIVE_FILE_PATH;
  if (archivePathEnv) {
    return resolveTaskFilePath(archivePathEnv, baseDir);
  }
  
  // Generate archive filename based on task file
  const taskDir = path.dirname(TASK_FILE_PATH);
  const taskFileName = path.basename(TASK_FILE_PATH, path.extname(TASK_FILE_PATH));
  const taskExt = path.extname(TASK_FILE_PATH);
  return path.join(taskDir, `${taskFileName}-archive${taskExt}`);
};

const ARCHIVE_FILE_PATH = getArchiveFilePath();

export class TaskFlowService {
  private data: TaskFlowFile = { requests: [] };
  private requestCounter = 0;
  private globalIdCounter = 0; // For notes and other global items

  // ===== IO =====
  private async loadTasks() {
    try {
      console.log(`Loading tasks from: ${TASK_FILE_PATH}`);
      const raw = await fs.readFile(TASK_FILE_PATH, "utf-8");
      const ext = path.extname(TASK_FILE_PATH).toLowerCase();
      this.data = parseTaskFlowFile(raw, ext);

      // Rebuild counters from existing IDs
      const allGlobalIds: number[] = [];
      const allRequestIds: number[] = [];

      for (const req of this.data.requests) {
        const reqNum = Number.parseInt(req.requestId.replace("req-", ""), 10);
        if (!Number.isNaN(reqNum)) allRequestIds.push(reqNum);

        // Only track notes for global counter (tasks are now per-request)
        for (const n of req.notes ?? []) {
          const nNum = Number.parseInt(n.id.replace("note-", ""), 10);
          if (!Number.isNaN(nNum)) allGlobalIds.push(nNum);
        }
      }

      this.requestCounter = allRequestIds.length > 0 ? Math.max(...allRequestIds) : 0;
      this.globalIdCounter = allGlobalIds.length > 0 ? Math.max(...allGlobalIds) : 0;
    } catch (error) {
      console.warn(
        `Error loading tasks from ${TASK_FILE_PATH}:`,
        error instanceof Error ? error.message : error
      );
      this.data = { requests: [] };
      this.requestCounter = 0;
      this.globalIdCounter = 0;
    }
  }

  private async saveTasks() {
    const ext = path.extname(TASK_FILE_PATH).toLowerCase();
    try {
      console.log(`Saving tasks to: ${TASK_FILE_PATH}`);
      const content = stringifyTaskFlowFile(this.data, ext);
      
      // Ensure directory exists
      const dir = path.dirname(TASK_FILE_PATH);
      await fs.mkdir(dir, { recursive: true });
      
      await fs.writeFile(TASK_FILE_PATH, content, "utf-8");
    } catch (error) {
      if (error instanceof Error && error.message.includes("EROFS")) {
        console.error("EROFS: read-only file system. Cannot save tasks.");
        throw error;
      }
      console.error(`Failed to save tasks to ${TASK_FILE_PATH}:`, error instanceof Error ? error.message : error);
      throw error;
    }
  }

  // ===== Helpers =====
  private getRequest(requestId: string): RequestEntry | undefined {
    return this.data.requests.find((r) => r.requestId === requestId);
  }

  private applyPromptsToTaskDescription(description: string, prompts?: Prompts): string {
    if (!prompts) return description;
    
    let result = description;
    
    if (prompts.taskPrefix) {
      result = `${prompts.taskPrefix}\n\n${result}`;
    }
    
    if (prompts.taskSuffix) {
      result = `${result}\n\n${prompts.taskSuffix}`;
    }
    
    return result;
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

    // Create tasks using a factory with per-request numbering
    const factory = new TaskFactory({ value: this.globalIdCounter });
    const newTasks: Task[] = tasks.map((t) => factory.createTask(t));
    this.globalIdCounter = factory["counterRef"].value; // sync back for notes

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
      this.globalIdCounter = factory["counterRef"].value;
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
    const enhancedDescription = this.applyPromptsToTaskDescription(nextTask.description, this.data.prompts);
    
    return {
      status: "next_task",
      task: { 
        id: nextTask.id, 
        title: nextTask.title, 
        description: enhancedDescription,
        ...(this.data.prompts?.instructions && { instructions: this.data.prompts.instructions })
      },
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

    const factory = new TaskFactory({ value: this.globalIdCounter });
    const newTasks: Task[] = tasks.map((t) => factory.createTask(t));
    this.globalIdCounter = factory["counterRef"].value;

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

    const factory = new TaskFactory({ value: this.globalIdCounter });
    const newSubtasks = subtasks.map((s) => factory.createSubtask(s));
    this.globalIdCounter = factory["counterRef"].value;

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
    const factory = new TaskFactory({ value: this.globalIdCounter });
    const noteId = factory.createNoteId();
    this.globalIdCounter = factory["counterRef"].value;

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

  public async openTaskDetails(taskId: string) {
    await this.loadTasks();
    
    // Find the task across all requests
    for (const req of this.data.requests) {
      const task = req.tasks.find((t) => t.id === taskId);
      if (task) {
        const enhancedDescription = this.applyPromptsToTaskDescription(task.description, this.data.prompts);
        return {
          status: "task_found",
          task: {
            id: task.id,
            title: task.title,
            description: enhancedDescription,
            done: task.done,
            completedDetails: task.completedDetails,
            subtasks: task.subtasks,
            dependencies: task.dependencies || [],
            ...(this.data.prompts?.instructions && { instructions: this.data.prompts.instructions })
          },
          requestId: req.requestId,
          message: "Task details retrieved successfully."
        };
      }
    }
    
    return { status: "error", message: "Task not found" };
  }

  // ===== Prompts Management =====
  public async getPrompts() {
    await this.loadTasks();
    return {
      status: "prompts_retrieved",
      prompts: this.data.prompts || null,
      message: this.data.prompts ? "Current prompts configuration retrieved." : "No prompts configuration found."
    };
  }

  public async setPrompts(prompts: Partial<Prompts>) {
    await this.loadTasks();
    const now = new Date().toISOString();
    
    this.data.prompts = {
      instructions: prompts.instructions,
      taskPrefix: prompts.taskPrefix,
      taskSuffix: prompts.taskSuffix,
      createdAt: this.data.prompts?.createdAt || now,
      updatedAt: now,
    };
    
    // Remove undefined values
    Object.keys(this.data.prompts).forEach(key => {
      if (this.data.prompts![key as keyof Prompts] === undefined) {
        delete this.data.prompts![key as keyof Prompts];
      }
    });
    
    await this.saveTasks();
    
    return {
      status: "prompts_set",
      prompts: this.data.prompts,
      message: "Prompts configuration has been updated."
    };
  }

  public async updatePrompts(updates: Partial<Prompts>) {
    await this.loadTasks();
    const now = new Date().toISOString();
    
    if (!this.data.prompts) {
      this.data.prompts = { createdAt: now };
    }
    
    // Update only provided fields
    if (updates.instructions !== undefined) this.data.prompts.instructions = updates.instructions;
    if (updates.taskPrefix !== undefined) this.data.prompts.taskPrefix = updates.taskPrefix;
    if (updates.taskSuffix !== undefined) this.data.prompts.taskSuffix = updates.taskSuffix;
    
    this.data.prompts.updatedAt = now;
    
    await this.saveTasks();
    
    return {
      status: "prompts_updated",
      prompts: this.data.prompts,
      message: "Prompts configuration has been updated."
    };
  }

  public async removePrompts(fields?: string[]) {
    await this.loadTasks();
    
    if (!this.data.prompts) {
      return { status: "no_prompts", message: "No prompts configuration to remove." };
    }
    
    if (fields && fields.length > 0) {
      // Remove specific fields
      for (const field of fields) {
        if (field === "instructions" || field === "taskPrefix" || field === "taskSuffix") {
          delete this.data.prompts[field];
        }
      }
      
      this.data.prompts.updatedAt = new Date().toISOString();
      
      // If no content fields remain, remove the entire prompts object
      const hasContent = this.data.prompts.instructions || this.data.prompts.taskPrefix || this.data.prompts.taskSuffix;
      if (!hasContent) {
        delete this.data.prompts;
      }
      
      await this.saveTasks();
      
      return {
        status: "prompts_fields_removed",
        prompts: this.data.prompts || null,
        message: `Removed fields: ${fields.join(", ")}`
      };
    } else {
      // Remove entire prompts configuration
      delete this.data.prompts;
      await this.saveTasks();
      
      return {
        status: "prompts_removed",
        message: "Prompts configuration has been completely removed."
      };
    }
  }

  // ===== Archive Management =====
  private async loadArchive(): Promise<TaskFlowArchiveFile> {
    try {
      console.log(`Loading archive from: ${ARCHIVE_FILE_PATH}`);
      const raw = await fs.readFile(ARCHIVE_FILE_PATH, "utf-8");
      const ext = path.extname(ARCHIVE_FILE_PATH).toLowerCase();
      const parsed = parseTaskFlowFile(raw, ext);
      
      // Check if it's already an archive file or needs conversion
      if ('archivedRequests' in parsed && 'archiveInfo' in parsed) {
        return parsed as TaskFlowArchiveFile;
      } else {
        // Convert regular TaskFlowFile to archive format (shouldn't happen, but defensive)
        console.warn('Archive file appears to be in regular TaskFlowFile format, converting...');
        return {
          archivedRequests: [],
          archiveInfo: {
            createdAt: new Date().toISOString(),
            lastArchivedAt: new Date().toISOString(),
            totalArchivedRequests: 0,
            version: "1.0.0"
          }
        };
      }
    } catch (error) {
      console.warn(
        `Archive file not found or error loading from ${ARCHIVE_FILE_PATH}:`,
        error instanceof Error ? error.message : error
      );
      // Return empty archive structure
      return {
        archivedRequests: [],
        archiveInfo: {
          createdAt: new Date().toISOString(),
          lastArchivedAt: new Date().toISOString(),
          totalArchivedRequests: 0,
          version: "1.0.0"
        }
      };
    }
  }

  private async saveArchive(archiveData: TaskFlowArchiveFile) {
    const ext = path.extname(ARCHIVE_FILE_PATH).toLowerCase();
    try {
      console.log(`Saving archive to: ${ARCHIVE_FILE_PATH}`);
      const content = stringifyTaskFlowFile(archiveData as any, ext);
      
      // Ensure directory exists
      const dir = path.dirname(ARCHIVE_FILE_PATH);
      await fs.mkdir(dir, { recursive: true });
      
      await fs.writeFile(ARCHIVE_FILE_PATH, content, "utf-8");
    } catch (error) {
      console.error(`Failed to save archive to ${ARCHIVE_FILE_PATH}:`, error instanceof Error ? error.message : error);
      throw error;
    }
  }

  private createArchivedRequest(request: RequestEntry): ArchivedRequestEntry {
    const now = new Date().toISOString();
    return {
      ...request,
      completed: true,
      archivedAt: now,
      completedAt: request.completed ? now : now, // Use current time if not already set
      originalRequestId: request.requestId,
    };
  }

  public async archiveCompletedRequests(requestIds?: string[], mode: "manual" | "auto" = "manual") {
    await this.loadTasks();
    const archive = await this.loadArchive();
    
    let requestsToArchive: RequestEntry[];
    
    if (requestIds && requestIds.length > 0) {
      // Archive specific requests
      requestsToArchive = this.data.requests.filter(req => 
        requestIds.includes(req.requestId) && req.completed
      );
      
      if (requestsToArchive.length === 0) {
        return {
          status: "no_completed_requests",
          message: "No completed requests found with the specified IDs."
        };
      }
    } else {
      // Archive all completed requests
      requestsToArchive = this.data.requests.filter(req => req.completed);
      
      if (requestsToArchive.length === 0) {
        return {
          status: "no_completed_requests",
          message: "No completed requests found to archive."
        };
      }
    }
    
    // Convert to archived format and add to archive
    const archivedRequests = requestsToArchive.map(req => this.createArchivedRequest(req));
    archive.archivedRequests.push(...archivedRequests);
    
    // Update archive info
    archive.archiveInfo.lastArchivedAt = new Date().toISOString();
    archive.archiveInfo.totalArchivedRequests = archive.archivedRequests.length;
    
    // Remove archived requests from active tasks
    this.data.requests = this.data.requests.filter(req => 
      !requestsToArchive.some(archived => archived.requestId === req.requestId)
    );
    
    await this.saveArchive(archive);
    await this.saveTasks();
    
    return {
      status: "archived",
      archivedCount: archivedRequests.length,
      archivedRequests: archivedRequests.map(req => ({
        requestId: req.originalRequestId,
        originalRequest: req.originalRequest,
        archivedAt: req.archivedAt
      })),
      message: `Successfully archived ${archivedRequests.length} completed request(s).`,
      archiveFilePath: ARCHIVE_FILE_PATH
    };
  }

  public async listArchivedRequests(searchTerm?: string, limit?: number) {
    const archive = await this.loadArchive();
    
    let archivedRequests = archive.archivedRequests;
    
    if (searchTerm) {
      archivedRequests = archivedRequests.filter(req => 
        req.originalRequest.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.originalRequestId.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (limit && limit > 0) {
      archivedRequests = archivedRequests.slice(0, limit);
    }
    
    return {
      status: "archived_requests_listed",
      archivedRequests: archivedRequests.map(req => ({
        requestId: req.originalRequestId,
        originalRequest: req.originalRequest,
        tasksCount: req.tasks.length,
        completedAt: req.completedAt,
        archivedAt: req.archivedAt
      })),
      archiveInfo: archive.archiveInfo,
      message: `Found ${archivedRequests.length} archived request(s).`
    };
  }

  public async restoreArchivedRequest(requestId: string) {
    const archive = await this.loadArchive();
    await this.loadTasks();
    
    const archivedIndex = archive.archivedRequests.findIndex(req => req.originalRequestId === requestId);
    if (archivedIndex === -1) {
      return {
        status: "error",
        message: `Archived request with ID ${requestId} not found.`
      };
    }
    
    const archivedRequest = archive.archivedRequests[archivedIndex];
    
    // Check if request ID already exists in active tasks
    if (this.data.requests.some(req => req.requestId === requestId)) {
      return {
        status: "error",
        message: `Request with ID ${requestId} already exists in active tasks.`
      };
    }
    
    // Convert back to active request format
    const restoredRequest: RequestEntry = {
      requestId: archivedRequest.originalRequestId,
      originalRequest: archivedRequest.originalRequest,
      splitDetails: archivedRequest.splitDetails,
      tasks: archivedRequest.tasks,
      completed: false, // Mark as not completed when restored
      dependencies: archivedRequest.dependencies,
      notes: archivedRequest.notes
    };
    
    // Add to active tasks and remove from archive
    this.data.requests.push(restoredRequest);
    archive.archivedRequests.splice(archivedIndex, 1);
    archive.archiveInfo.totalArchivedRequests = archive.archivedRequests.length;
    
    await this.saveTasks();
    await this.saveArchive(archive);
    
    return {
      status: "request_restored",
      restoredRequest: {
        requestId: restoredRequest.requestId,
        originalRequest: restoredRequest.originalRequest,
        tasksCount: restoredRequest.tasks.length
      },
      message: `Request ${requestId} has been restored from archive.`
    };
  }

  public async rotateArchiveIfNeeded(maxSize: number = 1000, maxAge: number = 90) {
    const archive = await this.loadArchive();
    
    const shouldRotate = 
      archive.archivedRequests.length >= maxSize || 
      (archive.archiveInfo.createdAt && 
       (Date.now() - new Date(archive.archiveInfo.createdAt).getTime()) > (maxAge * 24 * 60 * 60 * 1000));
    
    if (!shouldRotate) {
      return {
        status: "no_rotation_needed",
        message: "Archive rotation not needed."
      };
    }
    
    // Create rotated archive filename
    const timestamp = new Date().toISOString().split('T')[0];
    const archiveDir = path.dirname(ARCHIVE_FILE_PATH);
    const archiveBaseName = path.basename(ARCHIVE_FILE_PATH, path.extname(ARCHIVE_FILE_PATH));
    const archiveExt = path.extname(ARCHIVE_FILE_PATH);
    const rotatedPath = path.join(archiveDir, `${archiveBaseName}-${timestamp}${archiveExt}`);
    
    try {
      // Move current archive to rotated file
      const currentContent = stringifyTaskFlowFile(archive as any, path.extname(ARCHIVE_FILE_PATH));
      await fs.writeFile(rotatedPath, currentContent, "utf-8");
      
      // Create new empty archive
      const newArchive: TaskFlowArchiveFile = {
        archivedRequests: [],
        archiveInfo: {
          createdAt: new Date().toISOString(),
          lastArchivedAt: new Date().toISOString(),
          totalArchivedRequests: 0,
          version: "1.0.0"
        }
      };
      
      await this.saveArchive(newArchive);
      
      return {
        status: "archive_rotated",
        rotatedFilePath: rotatedPath,
        message: `Archive rotated to ${rotatedPath}. New empty archive created.`
      };
    } catch (error) {
      return {
        status: "rotation_error",
        message: `Failed to rotate archive: ${error instanceof Error ? error.message : error}`
      };
    }
  }
}
