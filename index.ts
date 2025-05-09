#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
  ToolSchema,
} from "@modelcontextprotocol/sdk/types.js";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { z } from "zod";

const DEFAULT_PATH = path.join(os.homedir(), "Documents", "tasks.json");
const TASK_FILE_PATH = process.env.TASK_MANAGER_FILE_PATH || DEFAULT_PATH;

interface Subtask {
  id: string;
  title: string;
  description: string;
  done: boolean;
}

interface Task {
  id: string;
  title: string;
  description: string;
  done: boolean;
  approved: boolean;
  completedDetails: string;
  subtasks: Subtask[];
}

interface RequestEntry {
  requestId: string;
  originalRequest: string;
  splitDetails: string;
  tasks: Task[];
  completed: boolean; // marked true after all tasks done and request completion approved
}

interface TaskFlowFile {
  requests: RequestEntry[];
}

// Zod Schemas
const SubtaskSchema = z.object({
  title: z.string(),
  description: z.string(),
});

const RequestPlanningSchema = z.object({
  originalRequest: z.string(),
  splitDetails: z.string().optional(),
  tasks: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      subtasks: z.array(SubtaskSchema).optional(),
    })
  ),
});

const GetNextTaskSchema = z.object({
  requestId: z.string(),
});

const MarkTaskDoneSchema = z.object({
  requestId: z.string(),
  taskId: z.string(),
  completedDetails: z.string().optional(),
});

const ApproveTaskCompletionSchema = z.object({
  requestId: z.string(),
  taskId: z.string(),
});

const ApproveRequestCompletionSchema = z.object({
  requestId: z.string(),
});

const OpenTaskDetailsSchema = z.object({
  taskId: z.string(),
});

const ListRequestsSchema = z.object({});

const AddTasksToRequestSchema = z.object({
  requestId: z.string(),
  tasks: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
    })
  ),
});

const UpdateTaskSchema = z.object({
  requestId: z.string(),
  taskId: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
});

const DeleteTaskSchema = z.object({
  requestId: z.string(),
  taskId: z.string(),
});

const AddSubtasksSchema = z.object({
  requestId: z.string(),
  taskId: z.string(),
  subtasks: z.array(SubtaskSchema),
});

const MarkSubtaskDoneSchema = z.object({
  requestId: z.string(),
  taskId: z.string(),
  subtaskId: z.string(),
});

const UpdateSubtaskSchema = z.object({
  requestId: z.string(),
  taskId: z.string(),
  subtaskId: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
});

const DeleteSubtaskSchema = z.object({
  requestId: z.string(),
  taskId: z.string(),
  subtaskId: z.string(),
});

// Tools

const PLAN_TASK_TOOL: Tool = {
  name: "plan_task",
  description:
    "Register a new user request and plan its associated tasks. You must provide 'originalRequest' and 'tasks', and optionally 'splitDetails'.\n\n" +
    "Tasks can now include subtasks, which are smaller units of work that make up a task. All subtasks must be completed before a task can be marked as done.\n\n" +
    "This tool initiates a new workflow for handling a user's request. The workflow is as follows:\n" +
    "1. Use 'plan_task' to register a request and its tasks (with optional subtasks).\n" +
    "2. After adding tasks, you MUST use 'get_next_task' to retrieve the first task. A progress table will be displayed.\n" +
    "3. Use 'get_next_task' to retrieve the next uncompleted task.\n" +
    "4. If the task has subtasks, complete each subtask using 'mark_subtask_done' before marking the task as done.\n" +
    "5. **IMPORTANT:** After marking a task as done, a progress table will be displayed showing the updated status of all tasks. The assistant MUST NOT proceed to another task without the user's approval. The user must explicitly approve the completed task.\n" +
    "6. Once a task is approved, you can proceed to 'get_next_task' again to fetch the next pending task.\n" +
    "7. Repeat this cycle until all tasks are done.\n" +
    "8. After all tasks are completed (and approved), 'get_next_task' will indicate that all tasks are done and that the request awaits approval for full completion.\n" +
    "9. The user must then approve the entire request's completion. If the user does not approve and wants more tasks, you can again use 'plan_task' to add new tasks and continue the cycle.\n\n" +
    "The critical point is to always wait for user approval after completing each task and after all tasks are done, wait for request completion approval. Do not proceed automatically.",
  inputSchema: {
    type: "object",
    properties: {
      originalRequest: { type: "string" },
      splitDetails: { type: "string" },
      tasks: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            subtasks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                },
                required: ["title", "description"],
              },
            },
          },
          required: ["title", "description"],
        },
      },
    },
    required: ["originalRequest", "tasks"],
  },
};

const GET_NEXT_TASK_TOOL: Tool = {
  name: "get_next_task",
  description:
    "Given a 'requestId', return the next pending task (not done yet). If all tasks are completed, it will indicate that no more tasks are left and that you must ask the user what to do next.\n\n" +
    "A progress table showing the current status of all tasks will be displayed with each response.\n\n" +
    "If the same task is returned again or if no new task is provided after a task was marked as done, you MUST NOT proceed. In such a scenario, you must prompt the user for approval before calling 'get_next_task' again. Do not skip the user's approval step.\n" +
    "In other words:\n" +
    "- After calling 'mark_task_done', do not call 'get_next_task' again until 'approve_task_completion' is called by the user.\n" +
    "- If 'get_next_task' returns 'all_tasks_done', it means all tasks have been completed. At this point, confirm with the user that all tasks have been completed, and optionally add more tasks via 'plan_task'.",
  inputSchema: {
    type: "object",
    properties: {
      requestId: { type: "string" },
    },
    required: ["requestId"],
  },
};

const MARK_TASK_DONE_TOOL: Tool = {
  name: "mark_task_done",
  description:
    "Mark a given task as done after you've completed it. Provide 'requestId' and 'taskId', and optionally 'completedDetails'.\n\n" +
    "After marking a task as done, a progress table will be displayed showing the updated status of all tasks.\n\n" +
    "After this, DO NOT proceed to 'get_next_task' again until the user has explicitly approved this completed task using 'approve_task_completion'.",
  inputSchema: {
    type: "object",
    properties: {
      requestId: { type: "string" },
      taskId: { type: "string" },
      completedDetails: { type: "string" },
    },
    required: ["requestId", "taskId"],
  },
};

const OPEN_TASK_DETAILS_TOOL: Tool = {
  name: "open_task_details",
  description:
    "Get details of a specific task by 'taskId'. This is for inspecting task information at any point.",
  inputSchema: {
    type: "object",
    properties: {
      taskId: { type: "string" },
    },
    required: ["taskId"],
  },
};

const LIST_REQUESTS_TOOL: Tool = {
  name: "list_requests",
  description:
    "List all requests with their basic information and summary of tasks. This provides a quick overview of all requests in the system.",
  inputSchema: {
    type: "object",
    properties: {},
  },
};

const ADD_TASKS_TO_REQUEST_TOOL: Tool = {
  name: "add_tasks_to_request",
  description:
    "Add new tasks to an existing request. This allows extending a request with additional tasks.\n\n" +
    "A progress table will be displayed showing all tasks including the newly added ones.",
  inputSchema: {
    type: "object",
    properties: {
      requestId: { type: "string" },
      tasks: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
          },
          required: ["title", "description"],
        },
      },
    },
    required: ["requestId", "tasks"],
  },
};

const UPDATE_TASK_TOOL: Tool = {
  name: "update_task",
  description:
    "Update an existing task's title and/or description. Only uncompleted tasks can be updated.\n\n" +
    "A progress table will be displayed showing the updated task information.",
  inputSchema: {
    type: "object",
    properties: {
      requestId: { type: "string" },
      taskId: { type: "string" },
      title: { type: "string" },
      description: { type: "string" },
    },
    required: ["requestId", "taskId"],
  },
};

const DELETE_TASK_TOOL: Tool = {
  name: "delete_task",
  description:
    "Delete a specific task from a request. Only uncompleted tasks can be deleted.\n\n" +
    "A progress table will be displayed showing the remaining tasks after deletion.",
  inputSchema: {
    type: "object",
    properties: {
      requestId: { type: "string" },
      taskId: { type: "string" },
    },
    required: ["requestId", "taskId"],
  },
};

const ADD_SUBTASKS_TOOL: Tool = {
  name: "add_subtasks",
  description:
    "Add subtasks to an existing task. Provide 'requestId', 'taskId', and 'subtasks' array.\n\n" +
    "Subtasks are smaller units of work that make up a task. All subtasks must be completed before a task can be marked as done.\n\n" +
    "A progress table will be displayed showing the updated task with its subtasks.",
  inputSchema: {
    type: "object",
    properties: {
      requestId: { type: "string" },
      taskId: { type: "string" },
      subtasks: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
          },
          required: ["title", "description"],
        },
      },
    },
    required: ["requestId", "taskId", "subtasks"],
  },
};

const MARK_SUBTASK_DONE_TOOL: Tool = {
  name: "mark_subtask_done",
  description:
    "Mark a subtask as done. Provide 'requestId', 'taskId', and 'subtaskId'.\n\n" +
    "A progress table will be displayed showing the updated status of all tasks and subtasks.\n\n" +
    "All subtasks must be completed before a task can be marked as done.",
  inputSchema: {
    type: "object",
    properties: {
      requestId: { type: "string" },
      taskId: { type: "string" },
      subtaskId: { type: "string" },
    },
    required: ["requestId", "taskId", "subtaskId"],
  },
};

const UPDATE_SUBTASK_TOOL: Tool = {
  name: "update_subtask",
  description:
    "Update a subtask's title or description. Provide 'requestId', 'taskId', 'subtaskId', and optionally 'title' and/or 'description'.\n\n" +
    "Only uncompleted subtasks can be updated.\n\n" +
    "A progress table will be displayed showing the updated task with its subtasks.",
  inputSchema: {
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
};

const DELETE_SUBTASK_TOOL: Tool = {
  name: "delete_subtask",
  description:
    "Delete a subtask from a task. Provide 'requestId', 'taskId', and 'subtaskId'.\n\n" +
    "Only uncompleted subtasks can be deleted.\n\n" +
    "A progress table will be displayed showing the updated task with its remaining subtasks.",
  inputSchema: {
    type: "object",
    properties: {
      requestId: { type: "string" },
      taskId: { type: "string" },
      subtaskId: { type: "string" },
    },
    required: ["requestId", "taskId", "subtaskId"],
  },
};

class TaskFlowServer {
  private requestCounter = 0;
  private taskCounter = 0;
  private data: TaskFlowFile = { requests: [] };

  constructor() {
    this.loadTasks();
  }

  private async loadTasks() {
    try {
      const data = await fs.readFile(TASK_FILE_PATH, "utf-8");
      this.data = JSON.parse(data);
      const allTaskIds: number[] = [];
      const allRequestIds: number[] = [];

      for (const req of this.data.requests) {
        const reqNum = Number.parseInt(req.requestId.replace("req-", ""), 10);
        if (!Number.isNaN(reqNum)) {
          allRequestIds.push(reqNum);
        }
        for (const t of req.tasks) {
          const tNum = Number.parseInt(t.id.replace("task-", ""), 10);
          if (!Number.isNaN(tNum)) {
            allTaskIds.push(tNum);
          }
        }
      }

      this.requestCounter =
        allRequestIds.length > 0 ? Math.max(...allRequestIds) : 0;
      this.taskCounter = allTaskIds.length > 0 ? Math.max(...allTaskIds) : 0;
    } catch (error) {
      this.data = { requests: [] };
    }
  }

  private async saveTasks() {
    try {
      await fs.writeFile(
        TASK_FILE_PATH,
        JSON.stringify(this.data, null, 2),
        "utf-8"
      );
    } catch (error) {
      if (error instanceof Error && error.message.includes("EROFS")) {
        console.error("EROFS: read-only file system. Cannot save tasks.");
        throw error;
      }
      throw error;
    }
  }

  private formatTaskProgressTable(requestId: string): string {
    const req = this.data.requests.find((r) => r.requestId === requestId);
    if (!req) return "Request not found";

    let table = "\nProgress Status:\n";
    table += "| Task ID | Title | Description | Status | Approval | Subtasks |\n";
    table += "|----------|----------|------|------|----------|----------|\n";

    for (const task of req.tasks) {
      const status = task.done ? "✅ Done" : "🔄 In Progress";
      const approved = task.approved ? "✅ Approved" : "⏳ Pending";
      const subtaskCount = task.subtasks.length;
      const completedSubtasks = task.subtasks.filter(s => s.done).length;
      const subtaskStatus = subtaskCount > 0
        ? `${completedSubtasks}/${subtaskCount}`
        : "None";

      table += `| ${task.id} | ${task.title} | ${task.description} | ${status} | ${approved} | ${subtaskStatus} |\n`;

      // Add subtasks with indentation if they exist
      if (subtaskCount > 0) {
        for (const subtask of task.subtasks) {
          const subtaskStatus = subtask.done ? "✅ Done" : "🔄 In Progress";
          table += `| └─ ${subtask.id} | ${subtask.title} | ${subtask.description} | ${subtaskStatus} | - | - |\n`;
        }
      }
    }

    return table;
  }

  private formatRequestsList(): string {
    let output = "\nRequests List:\n";
    output +=
      "| Request ID | Original Request | Total Tasks | Completed | Approved |\n";
    output +=
      "|------------|------------------|-------------|-----------|----------|\n";

    for (const req of this.data.requests) {
      const totalTasks = req.tasks.length;
      const completedTasks = req.tasks.filter((t) => t.done).length;
      const approvedTasks = req.tasks.filter((t) => t.approved).length;
      output += `| ${req.requestId} | ${req.originalRequest.substring(0, 30)}${req.originalRequest.length > 30 ? "..." : ""} | ${totalTasks} | ${completedTasks} | ${approvedTasks} |\n`;
    }

    return output;
  }

  public async requestPlanning(
    originalRequest: string,
    tasks: { title: string; description: string; subtasks?: { title: string; description: string }[] }[],
    splitDetails?: string
  ) {
    await this.loadTasks();
    this.requestCounter += 1;
    const requestId = `req-${this.requestCounter}`;

    const newTasks: Task[] = [];
    for (const taskDef of tasks) {
      this.taskCounter += 1;

      // Process subtasks if they exist
      const subtasks: Subtask[] = [];
      if (taskDef.subtasks && taskDef.subtasks.length > 0) {
        for (const subtaskDef of taskDef.subtasks) {
          this.taskCounter += 1;
          subtasks.push({
            id: `subtask-${this.taskCounter}`,
            title: subtaskDef.title,
            description: subtaskDef.description,
            done: false,
          });
        }
      }

      newTasks.push({
        id: `task-${this.taskCounter}`,
        title: taskDef.title,
        description: taskDef.description,
        done: false,
        approved: false,
        completedDetails: "",
        subtasks: subtasks,
      });
    }

    this.data.requests.push({
      requestId,
      originalRequest,
      splitDetails: splitDetails || originalRequest,
      tasks: newTasks,
      completed: false,
    });

    await this.saveTasks();

    const progressTable = this.formatTaskProgressTable(requestId);

    return {
      status: "planned",
      requestId,
      totalTasks: newTasks.length,
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
    const req = this.data.requests.find((r) => r.requestId === requestId);
    if (!req) {
      return { status: "error", message: "Request not found" };
    }
    if (req.completed) {
      return {
        status: "already_completed",
        message: "Request already completed.",
      };
    }
    const nextTask = req.tasks.find((t) => !t.done);
    if (!nextTask) {
      // all tasks done?
      const allDone = req.tasks.every((t) => t.done);
      if (allDone && !req.completed) {
        const progressTable = this.formatTaskProgressTable(requestId);
        return {
          status: "all_tasks_done",
          message: `All tasks have been completed. Awaiting completion approval.\n${progressTable}`,
        };
      }
      return { status: "no_next_task", message: "No undone tasks found." };
    }

    const progressTable = this.formatTaskProgressTable(requestId);
    return {
      status: "next_task",
      task: {
        id: nextTask.id,
        title: nextTask.title,
        description: nextTask.description,
      },
      message: `Next task is ready. Task approval will be required after completion.\n${progressTable}`,
    };
  }

  public async markTaskDone(
    requestId: string,
    taskId: string,
    completedDetails?: string
  ) {
    await this.loadTasks();
    const req = this.data.requests.find((r) => r.requestId === requestId);
    if (!req) return { status: "error", message: "Request not found" };
    const task = req.tasks.find((t) => t.id === taskId);
    if (!task) return { status: "error", message: "Task not found" };
    if (task.done)
      return {
        status: "already_done",
        message: "Task is already marked done.",
      };

    // Check if all subtasks are done
    const hasSubtasks = task.subtasks.length > 0;
    const allSubtasksDone = task.subtasks.every(s => s.done);

    if (hasSubtasks && !allSubtasksDone) {
      return {
        status: "subtasks_pending",
        message: "Cannot mark task as done until all subtasks are completed.",
        pendingSubtasks: task.subtasks.filter(s => !s.done).map(s => ({
          id: s.id,
          title: s.title,
        })),
      };
    }

    task.done = true;
    task.completedDetails = completedDetails || "";
    await this.saveTasks();

    const progressTable = this.formatTaskProgressTable(requestId);

    return {
      status: "task_marked_done",
      requestId: req.requestId,
      task: {
        id: task.id,
        title: task.title,
        description: task.description,
        completedDetails: task.completedDetails,
        approved: task.approved,
        subtasks: task.subtasks.map(s => ({
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
            subtasks: target.subtasks.map(s => ({
              id: s.id,
              title: s.title,
              description: s.description,
              done: s.done,
            })),
          },
        };
      }

      // Check if it's a subtask ID
      for (const task of req.tasks) {
        const subtask = task.subtasks.find(s => s.id === taskId);
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
    const requestsList = this.formatRequestsList();
    return {
      status: "requests_listed",
      message: `Current requests in the system:\n${requestsList}`,
      requests: this.data.requests.map((req) => ({
        requestId: req.requestId,
        originalRequest: req.originalRequest,
        totalTasks: req.tasks.length,
        completedTasks: req.tasks.filter((t) => t.done).length,
        approvedTasks: req.tasks.filter((t) => t.approved).length,
      })),
    };
  }

  public async addTasksToRequest(
    requestId: string,
    tasks: { title: string; description: string; subtasks?: { title: string; description: string }[] }[]
  ) {
    await this.loadTasks();
    const req = this.data.requests.find((r) => r.requestId === requestId);
    if (!req) return { status: "error", message: "Request not found" };
    if (req.completed)
      return {
        status: "error",
        message: "Cannot add tasks to completed request",
      };

    const newTasks: Task[] = [];
    for (const taskDef of tasks) {
      this.taskCounter += 1;

      // Process subtasks if they exist
      const subtasks: Subtask[] = [];
      if (taskDef.subtasks && taskDef.subtasks.length > 0) {
        for (const subtaskDef of taskDef.subtasks) {
          this.taskCounter += 1;
          subtasks.push({
            id: `subtask-${this.taskCounter}`,
            title: subtaskDef.title,
            description: subtaskDef.description,
            done: false,
          });
        }
      }

      newTasks.push({
        id: `task-${this.taskCounter}`,
        title: taskDef.title,
        description: taskDef.description,
        done: false,
        approved: false,
        completedDetails: "",
        subtasks: subtasks,
      });
    }

    req.tasks.push(...newTasks);
    await this.saveTasks();

    const progressTable = this.formatTaskProgressTable(requestId);
    return {
      status: "tasks_added",
      message: `Added ${newTasks.length} new tasks to request.\n${progressTable}`,
      newTasks: newTasks.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
      })),
    };
  }

  public async updateTask(
    requestId: string,
    taskId: string,
    updates: { title?: string; description?: string }
  ) {
    await this.loadTasks();
    const req = this.data.requests.find((r) => r.requestId === requestId);
    if (!req) return { status: "error", message: "Request not found" };

    const task = req.tasks.find((t) => t.id === taskId);
    if (!task) return { status: "error", message: "Task not found" };
    if (task.done)
      return { status: "error", message: "Cannot update completed task" };

    if (updates.title) task.title = updates.title;
    if (updates.description) task.description = updates.description;

    await this.saveTasks();

    const progressTable = this.formatTaskProgressTable(requestId);
    return {
      status: "task_updated",
      message: `Task ${taskId} has been updated.\n${progressTable}`,
      task: {
        id: task.id,
        title: task.title,
        description: task.description,
      },
    };
  }

  public async deleteTask(requestId: string, taskId: string) {
    await this.loadTasks();
    const req = this.data.requests.find((r) => r.requestId === requestId);
    if (!req) return { status: "error", message: "Request not found" };

    const taskIndex = req.tasks.findIndex((t) => t.id === taskId);
    if (taskIndex === -1) return { status: "error", message: "Task not found" };
    if (req.tasks[taskIndex].done)
      return { status: "error", message: "Cannot delete completed task" };

    req.tasks.splice(taskIndex, 1);
    await this.saveTasks();

    const progressTable = this.formatTaskProgressTable(requestId);
    return {
      status: "task_deleted",
      message: `Task ${taskId} has been deleted.\n${progressTable}`,
    };
  }

  public async addSubtasks(
    requestId: string,
    taskId: string,
    subtasks: { title: string; description: string }[]
  ) {
    await this.loadTasks();
    const req = this.data.requests.find((r) => r.requestId === requestId);
    if (!req) return { status: "error", message: "Request not found" };

    const task = req.tasks.find((t) => t.id === taskId);
    if (!task) return { status: "error", message: "Task not found" };
    if (task.done)
      return { status: "error", message: "Cannot add subtasks to completed task" };

    const newSubtasks: Subtask[] = [];
    for (const subtaskDef of subtasks) {
      this.taskCounter += 1;
      newSubtasks.push({
        id: `subtask-${this.taskCounter}`,
        title: subtaskDef.title,
        description: subtaskDef.description,
        done: false,
      });
    }

    task.subtasks.push(...newSubtasks);
    await this.saveTasks();

    const progressTable = this.formatTaskProgressTable(requestId);
    return {
      status: "subtasks_added",
      message: `Added ${newSubtasks.length} new subtasks to task ${taskId}.\n${progressTable}`,
      newSubtasks: newSubtasks.map(s => ({
        id: s.id,
        title: s.title,
        description: s.description,
      })),
    };
  }

  public async markSubtaskDone(
    requestId: string,
    taskId: string,
    subtaskId: string
  ) {
    await this.loadTasks();
    const req = this.data.requests.find((r) => r.requestId === requestId);
    if (!req) return { status: "error", message: "Request not found" };

    const task = req.tasks.find((t) => t.id === taskId);
    if (!task) return { status: "error", message: "Task not found" };

    const subtask = task.subtasks.find(s => s.id === subtaskId);
    if (!subtask) return { status: "error", message: "Subtask not found" };
    if (subtask.done)
      return { status: "already_done", message: "Subtask is already marked done" };

    subtask.done = true;
    await this.saveTasks();

    const progressTable = this.formatTaskProgressTable(requestId);
    return {
      status: "subtask_marked_done",
      message: `Subtask ${subtaskId} has been marked as done.\n${progressTable}`,
      subtask: {
        id: subtask.id,
        title: subtask.title,
        description: subtask.description,
        done: subtask.done,
      },
      allSubtasksDone: task.subtasks.every(s => s.done),
    };
  }

  public async updateSubtask(
    requestId: string,
    taskId: string,
    subtaskId: string,
    updates: { title?: string; description?: string }
  ) {
    await this.loadTasks();
    const req = this.data.requests.find((r) => r.requestId === requestId);
    if (!req) return { status: "error", message: "Request not found" };

    const task = req.tasks.find((t) => t.id === taskId);
    if (!task) return { status: "error", message: "Task not found" };

    const subtask = task.subtasks.find(s => s.id === subtaskId);
    if (!subtask) return { status: "error", message: "Subtask not found" };
    if (subtask.done)
      return { status: "error", message: "Cannot update completed subtask" };

    if (updates.title) subtask.title = updates.title;
    if (updates.description) subtask.description = updates.description;

    await this.saveTasks();

    const progressTable = this.formatTaskProgressTable(requestId);
    return {
      status: "subtask_updated",
      message: `Subtask ${subtaskId} has been updated.\n${progressTable}`,
      subtask: {
        id: subtask.id,
        title: subtask.title,
        description: subtask.description,
        done: subtask.done,
      },
    };
  }

  public async deleteSubtask(
    requestId: string,
    taskId: string,
    subtaskId: string
  ) {
    await this.loadTasks();
    const req = this.data.requests.find((r) => r.requestId === requestId);
    if (!req) return { status: "error", message: "Request not found" };

    const task = req.tasks.find((t) => t.id === taskId);
    if (!task) return { status: "error", message: "Task not found" };

    const subtaskIndex = task.subtasks.findIndex(s => s.id === subtaskId);
    if (subtaskIndex === -1) return { status: "error", message: "Subtask not found" };
    if (task.subtasks[subtaskIndex].done)
      return { status: "error", message: "Cannot delete completed subtask" };

    task.subtasks.splice(subtaskIndex, 1);
    await this.saveTasks();

    const progressTable = this.formatTaskProgressTable(requestId);
    return {
      status: "subtask_deleted",
      message: `Subtask ${subtaskId} has been deleted.\n${progressTable}`,
    };
  }
}

const server = new Server(
  {
    name: "taskflow-mcp",
    version: "1.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const taskFlowServer = new TaskFlowServer();

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    PLAN_TASK_TOOL,
    GET_NEXT_TASK_TOOL,
    MARK_TASK_DONE_TOOL,
    OPEN_TASK_DETAILS_TOOL,
    LIST_REQUESTS_TOOL,
    ADD_TASKS_TO_REQUEST_TOOL,
    UPDATE_TASK_TOOL,
    DELETE_TASK_TOOL,
    ADD_SUBTASKS_TOOL,
    MARK_SUBTASK_DONE_TOOL,
    UPDATE_SUBTASK_TOOL,
    DELETE_SUBTASK_TOOL,
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    switch (name) {
      case "plan_task": {
        const parsed = RequestPlanningSchema.safeParse(args);
        if (!parsed.success) {
          throw new Error(`Invalid arguments: ${parsed.error}`);
        }
        const { originalRequest, tasks, splitDetails } = parsed.data;
        const result = await taskFlowServer.requestPlanning(
          originalRequest,
          tasks,
          splitDetails
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "get_next_task": {
        const parsed = GetNextTaskSchema.safeParse(args);
        if (!parsed.success) {
          throw new Error(`Invalid arguments: ${parsed.error}`);
        }
        const result = await taskFlowServer.getNextTask(
          parsed.data.requestId
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "mark_task_done": {
        const parsed = MarkTaskDoneSchema.safeParse(args);
        if (!parsed.success) {
          throw new Error(`Invalid arguments: ${parsed.error}`);
        }
        const { requestId, taskId, completedDetails } = parsed.data;
        const result = await taskFlowServer.markTaskDone(
          requestId,
          taskId,
          completedDetails
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }


      case "open_task_details": {
        const parsed = OpenTaskDetailsSchema.safeParse(args);
        if (!parsed.success) {
          throw new Error(`Invalid arguments: ${parsed.error}`);
        }
        const { taskId } = parsed.data;
        const result = await taskFlowServer.openTaskDetails(taskId);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "list_requests": {
        const parsed = ListRequestsSchema.safeParse(args);
        if (!parsed.success) {
          throw new Error(`Invalid arguments: ${parsed.error}`);
        }
        const result = await taskFlowServer.listRequests();
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "add_tasks_to_request": {
        const parsed = AddTasksToRequestSchema.safeParse(args);
        if (!parsed.success) {
          throw new Error(`Invalid arguments: ${parsed.error}`);
        }
        const { requestId, tasks } = parsed.data;
        const result = await taskFlowServer.addTasksToRequest(
          requestId,
          tasks
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "update_task": {
        const parsed = UpdateTaskSchema.safeParse(args);
        if (!parsed.success) {
          throw new Error(`Invalid arguments: ${parsed.error}`);
        }
        const { requestId, taskId, title, description } = parsed.data;
        const result = await taskFlowServer.updateTask(requestId, taskId, {
          title,
          description,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "delete_task": {
        const parsed = DeleteTaskSchema.safeParse(args);
        if (!parsed.success) {
          throw new Error(`Invalid arguments: ${parsed.error}`);
        }
        const { requestId, taskId } = parsed.data;
        const result = await taskFlowServer.deleteTask(requestId, taskId);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "add_subtasks": {
        const parsed = AddSubtasksSchema.safeParse(args);
        if (!parsed.success) {
          throw new Error(`Invalid arguments: ${parsed.error}`);
        }
        const { requestId, taskId, subtasks } = parsed.data;
        const result = await taskFlowServer.addSubtasks(requestId, taskId, subtasks);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "mark_subtask_done": {
        const parsed = MarkSubtaskDoneSchema.safeParse(args);
        if (!parsed.success) {
          throw new Error(`Invalid arguments: ${parsed.error}`);
        }
        const { requestId, taskId, subtaskId } = parsed.data;
        const result = await taskFlowServer.markSubtaskDone(requestId, taskId, subtaskId);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "update_subtask": {
        const parsed = UpdateSubtaskSchema.safeParse(args);
        if (!parsed.success) {
          throw new Error(`Invalid arguments: ${parsed.error}`);
        }
        const { requestId, taskId, subtaskId, title, description } = parsed.data;
        const result = await taskFlowServer.updateSubtask(requestId, taskId, subtaskId, {
          title,
          description,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "delete_subtask": {
        const parsed = DeleteSubtaskSchema.safeParse(args);
        if (!parsed.success) {
          throw new Error(`Invalid arguments: ${parsed.error}`);
        }
        const { requestId, taskId, subtaskId } = parsed.data;
        const result = await taskFlowServer.deleteSubtask(requestId, taskId, subtaskId);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error: ${errorMessage}` }],
      isError: true,
    };
  }
});

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(
    `Task Manager MCP Server running. Saving tasks at: ${TASK_FILE_PATH}`
  );
}

runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});
