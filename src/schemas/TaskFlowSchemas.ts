import { z } from "zod";

/** Shared Zod Schemas (dev-time types & minimal runtime validation) */
export const DependencySchema = z.object({
  name: z.string(),
  version: z.string().optional(),
  url: z.string().optional(),
  description: z.string().optional(),
});

export const NoteSchema = z.object({
  title: z.string(),
  content: z.string(),
});

export const SubtaskSchema = z.object({
  title: z.string(),
  description: z.string(),
});

export const TaskInputSchema = z.object({
  title: z.string(),
  description: z.string(),
  subtasks: z.array(SubtaskSchema).optional(),
  dependencies: z.array(DependencySchema).optional(),
});

export const RequestPlanningSchema = z.object({
  originalRequest: z.string(),
  tasks: z.array(TaskInputSchema),
  splitDetails: z.string().optional(),
  outputPath: z.string().optional(),
  dependencies: z.array(DependencySchema).optional(),
  notes: z.array(NoteSchema).optional(),
});

// Simple utility to convert Zod object shapes to JSON Schema (hand-rolled here)
// We’ll write the JSON schemas manually for clarity and control.

/** JSON Schemas for MCP Tool inputSchema (server/runtime) */

const dependencyJson = {
  type: "object",
  properties: {
    name: { type: "string" },
    version: { type: "string" },
    url: { type: "string" },
    description: { type: "string" },
  },
  required: ["name"],
} as const;

const subtaskJson = {
  type: "object",
  properties: {
    title: { type: "string" },
    description: { type: "string" },
  },
  required: ["title", "description"],
} as const;

const noteJson = {
  type: "object",
  properties: {
    title: { type: "string" },
    content: { type: "string" },
  },
  required: ["title", "content"],
} as const;

const taskInputJson = {
  type: "object",
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    subtasks: { type: "array", items: subtaskJson },
    dependencies: { type: "array", items: dependencyJson },
  },
  required: ["title", "description"],
} as const;

export const jsonSchemas = {
  plan_task: {
    type: "object",
    properties: {
      originalRequest: { type: "string" },
      tasks: { type: "array", items: taskInputJson },
      splitDetails: { type: "string" },
      outputPath: { type: "string" },
      dependencies: { type: "array", items: dependencyJson },
      notes: { type: "array", items: noteJson },
    },
    required: ["originalRequest", "tasks"],
  },
  get_next_task: {
    type: "object",
    properties: { requestId: { type: "string" } },
    required: ["requestId"],
  },
  mark_task_done: {
    type: "object",
    properties: {
      requestId: { type: "string" },
      taskId: { type: "string" },
      completedDetails: { type: "string" },
    },
    required: ["requestId", "taskId"],
  },
  open_task_details: {
    type: "object",
    properties: { taskId: { type: "string" } },
    required: ["taskId"],
  },
  list_requests: {
    type: "object",
    properties: {},
    required: [],
  },
  add_tasks_to_request: {
    type: "object",
    properties: {
      requestId: { type: "string" },
      tasks: { type: "array", items: taskInputJson },
    },
    required: ["requestId", "tasks"],
  },
  update_task: {
    type: "object",
    properties: {
      requestId: { type: "string" },
      taskId: { type: "string" },
      title: { type: "string" },
      description: { type: "string" },
    },
    required: ["requestId", "taskId"],
  },
  delete_task: {
    type: "object",
    properties: {
      requestId: { type: "string" },
      taskId: { type: "string" },
    },
    required: ["requestId", "taskId"],
  },
  add_subtasks: {
    type: "object",
    properties: {
      requestId: { type: "string" },
      taskId: { type: "string" },
      subtasks: { type: "array", items: subtaskJson },
    },
    required: ["requestId", "taskId", "subtasks"],
  },
  mark_subtask_done: {
    type: "object",
    properties: {
      requestId: { type: "string" },
      taskId: { type: "string" },
      subtaskId: { type: "string" },
    },
    required: ["requestId", "taskId", "subtaskId"],
  },
  update_subtask: {
    type: "object",
    properties: {
      requestId: { type: "string" },
      taskId: { type: "string" },
      subtaskId: { type: "string" },
      title: { type: "string" },
      description: { type: "string" },
    },
    required: ["requestId", "taskId", "subtaskId"],
  },
  delete_subtask: {
    type: "object",
    properties: {
      requestId: { type: "string" },
      taskId: { type: "string" },
      subtaskId: { type: "string" },
    },
    required: ["requestId", "taskId", "subtaskId"],
  },
  export_task_status: {
    type: "object",
    properties: {
      requestId: { type: "string" },
      format: { type: "string", enum: ["markdown", "json", "html"] },
      outputPath: { type: "string" },
      filename: { type: "string" },
    },
    required: ["requestId"],
  },
  add_note: {
    type: "object",
    properties: {
      requestId: { type: "string" },
      title: { type: "string" },
      content: { type: "string" },
    },
    required: ["requestId", "title", "content"],
  },
  update_note: {
    type: "object",
    properties: {
      requestId: { type: "string" },
      noteId: { type: "string" },
      title: { type: "string" },
      content: { type: "string" },
    },
    required: ["requestId", "noteId"],
  },
  delete_note: {
    type: "object",
    properties: {
      requestId: { type: "string" },
      noteId: { type: "string" },
    },
    required: ["requestId", "noteId"],
  },
  add_dependency: {
    type: "object",
    properties: {
      requestId: { type: "string" },
      taskId: { type: "string" },
      dependency: dependencyJson,
    },
    required: ["requestId", "dependency"],
  },
} as const;
