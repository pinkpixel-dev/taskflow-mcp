import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { TaskFlowService } from "../services/TaskFlowService.js";
import { jsonSchemas } from "../schemas/TaskFlowSchemas.js";

/** Tool definitions */

export const PLAN_TASK_TOOL: Tool = {
  name: "plan_task",
  description:
    "Register a new user request and plan its associated tasks. You must provide 'originalRequest' and 'tasks', and optionally 'splitDetails'.\n\n" +
    "Tasks can now include subtasks, which are smaller units of work that make up a task. All subtasks must be completed before a task can be marked as done.\n\n" +
    "You can also include:\n" +
    "- 'dependencies': List of project or task-specific dependencies (libraries, tools, etc.)\n" +
    "- 'notes': General notes about the project (preferences, guidelines, etc.)\n" +
    "- 'outputPath': Path to save a Markdown file with the task plan for reference. It's recommended to use absolute paths (e.g., 'C:/Users/username/Documents/task-plan.md') rather than relative paths for more reliable file creation.\n\n" +
    "This tool initiates a new workflow for handling a user's request. The workflow is as follows:\n" +
    "1. Use 'plan_task' to register a request and its tasks (with optional subtasks, dependencies, and notes).\n" +
    "2. After adding tasks, you MUST use 'get_next_task' to retrieve the first task. A progress table will be displayed.\n" +
    "3. Use 'get_next_task' to retrieve the next uncompleted task.\n" +
    "4. If the task has subtasks, complete each subtask using 'mark_subtask_done' before marking the task as done.\n" +
    "5. **IMPORTANT:** After marking a task as done, a progress table will be displayed showing the updated status of all tasks. The assistant MUST NOT proceed to another task without the user's approval. Ask the user for approval before proceeding.\n" +
    "6. Once the user approves the completed task, you can proceed to 'get_next_task' again to fetch the next pending task.\n" +
    "7. Repeat this cycle until all tasks are done.\n" +
    "8. After all tasks are completed, 'get_next_task' will indicate that all tasks are done. At this point, ask the user for confirmation that the entire request has been completed satisfactorily.\n" +
    "9. If the user wants more tasks, you can use 'add_tasks_to_request' or 'plan_task' to add new tasks and continue the cycle.\n\n" +
    "The critical point is to always wait for user approval after completing each task and after all tasks are done. Do not proceed automatically, UNLESS the user has explicitly told you to continue with all tasks and that you do not need approval.",
  inputSchema: {
    type: "object",
    properties: {
      originalRequest: { type: "string" },
      splitDetails: { type: "string" },
      outputPath: { type: "string" },
      dependencies: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            version: { type: "string" },
            url: { type: "string" },
            description: { type: "string" },
          },
          required: ["name"],
        },
      },
      notes: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            content: { type: "string" },
          },
          required: ["title", "content"],
        },
      },
      tasks: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            dependencies: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  version: { type: "string" },
                  url: { type: "string" },
                  description: { type: "string" },
                },
                required: ["name"],
              },
            },
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

export const GET_NEXT_TASK_TOOL: Tool = {
  name: "get_next_task",
  description:
    "Given a 'requestId', return the next pending task (not done yet). If all tasks are completed, it will indicate that no more tasks are left and that you must ask the user what to do next.\n\n" +
    "A progress table showing the current status of all tasks will be displayed with each response.\n\n" +
    "If the same task is returned again or if no new task is provided after a task was marked as done, you MUST NOT proceed. In such a scenario, you must prompt the user for approval before calling 'get_next_task' again. Do not skip the user's approval step.\n" +
    "In other words:\n" +
    "- After calling 'mark_task_done', do not call 'get_next_task' again until the user has given approval for the completed task.\n" +
    "- If 'get_next_task' returns 'all_tasks_done', it means all tasks have been completed. At this point, confirm with the user that all tasks have been completed, and optionally add more tasks via 'add_tasks_to_request' or 'plan_task'.",
  inputSchema: {
    type: "object",
    properties: {
      requestId: { type: "string" },
    },
    required: ["requestId"],
  },
};

export const MARK_TASK_DONE_TOOL: Tool = {
  name: "mark_task_done",
  description:
    "Mark a given task as done after you've completed it. Provide 'requestId' and 'taskId', and optionally 'completedDetails'.\n\n" +
    "After marking a task as done, a progress table will be displayed showing the updated status of all tasks.\n\n" +
    "After this, DO NOT proceed to 'get_next_task' again until the user has explicitly approved the completed task. Ask the user for approval before continuing.",
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

export const OPEN_TASK_DETAILS_TOOL: Tool = {
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

export const LIST_REQUESTS_TOOL: Tool = {
  name: "list_requests",
  description:
    "List all requests with their basic information and summary of tasks. This provides a quick overview of all requests in the system.",
  inputSchema: {
    type: "object",
    properties: {},
  },
};

export const ADD_TASKS_TO_REQUEST_TOOL: Tool = {
  name: "add_tasks_to_request",
  description:
    "Add new tasks to an existing request. This allows extending a request with additional tasks.\n\n" +
    "Tasks can include subtasks and dependencies. A progress table will be displayed showing all tasks including the newly added ones.",
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
            dependencies: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  version: { type: "string" },
                  url: { type: "string" },
                  description: { type: "string" },
                },
                required: ["name"],
              },
            },
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
    required: ["requestId", "tasks"],
  },
};

export const UPDATE_TASK_TOOL: Tool = {
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

export const DELETE_TASK_TOOL: Tool = {
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

export const ADD_SUBTASKS_TOOL: Tool = {
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

export const MARK_SUBTASK_DONE_TOOL: Tool = {
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

export const UPDATE_SUBTASK_TOOL: Tool = {
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

export const DELETE_SUBTASK_TOOL: Tool = {
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

export const EXPORT_TASK_STATUS_TOOL: Tool = {
  name: "export_task_status",
  description:
    "Export the current status of all tasks in a request to a file.\n\n" +
    "This tool saves the current state of tasks, subtasks, dependencies, and notes to a file for reference.\n\n" +
    "You can specify:\n" +
    "- 'format': 'markdown', 'json', or 'html'\n" +
    "- 'outputPath': Full path to save the file, or just a directory path\n" +
    "- 'filename': Optional custom filename (auto-generated if not provided)\n\n" +
    "Path handling:\n" +
    "- If outputPath is a directory, filename will be auto-generated as '{project-name}_tasks.{ext}'\n" +
    "- If outputPath includes filename, it will be used as-is\n" +
    "- Relative paths are resolved from current working directory\n" +
    "- If no path specified, saves to current working directory",
  inputSchema: {
    type: "object",
    properties: {
      requestId: { type: "string" },
      outputPath: { 
        type: "string",
        description: "Directory or full file path where to save the export"
      },
      filename: {
        type: "string",
        description: "Optional custom filename (auto-generated if not provided)"
      },
      format: {
        type: "string",
        enum: ["markdown", "json", "html"],
        default: "markdown"
      },
    },
    required: ["requestId"],
  },
};

export const ADD_NOTE_TOOL: Tool = {
  name: "add_note",
  description:
    "Add a note to a request. Notes can contain important information about the project, such as user preferences or guidelines.\n\n" +
    "Notes are displayed in the task progress table and can be referenced when working on tasks.",
  inputSchema: {
    type: "object",
    properties: {
      requestId: { type: "string" },
      title: { type: "string" },
      content: { type: "string" },
    },
    required: ["requestId", "title", "content"],
  },
};

export const UPDATE_NOTE_TOOL: Tool = {
  name: "update_note",
  description:
    "Update an existing note's title or content.\n\n" +
    "Provide the 'requestId' and 'noteId', and optionally 'title' and/or 'content' to update.",
  inputSchema: {
    type: "object",
    properties: {
      requestId: { type: "string" },
      noteId: { type: "string" },
      title: { type: "string" },
      content: { type: "string" },
    },
    required: ["requestId", "noteId"],
  },
};

export const DELETE_NOTE_TOOL: Tool = {
  name: "delete_note",
  description:
    "Delete a note from a request.\n\n" +
    "Provide the 'requestId' and 'noteId' of the note to delete.",
  inputSchema: {
    type: "object",
    properties: {
      requestId: { type: "string" },
      noteId: { type: "string" },
    },
    required: ["requestId", "noteId"],
  },
};

export const ADD_DEPENDENCY_TOOL: Tool = {
  name: "add_dependency",
  description:
    "Add a dependency to a request or task.\n\n" +
    "Dependencies can be libraries, tools, or other requirements needed for the project or specific tasks.\n\n" +
    "If 'taskId' is provided, the dependency will be added to that specific task. Otherwise, it will be added to the request.",
  inputSchema: {
    type: "object",
    properties: {
      requestId: { type: "string" },
      taskId: { type: "string" },
      dependency: {
        type: "object",
        properties: {
          name: { type: "string" },
          version: { type: "string" },
          url: { type: "string" },
          description: { type: "string" },
        },
        required: ["name"],
      },
    },
    required: ["requestId", "dependency"],
  },
};

export const GET_PROMPTS_TOOL: Tool = {
  name: "get_prompts",
  description:
    "Get the current prompts configuration including instructions, taskPrefix, and taskSuffix settings.\n\n" +
    "This tool helps you view the current global prompts settings that are applied to all tasks.",
  inputSchema: {
    type: "object",
    properties: {},
  },
};

export const SET_PROMPTS_TOOL: Tool = {
  name: "set_prompts",
  description:
    "Set the global prompts configuration with instructions, taskPrefix, and/or taskSuffix.\n\n" +
    "This replaces any existing prompts settings with the new values provided.\n\n" +
    "- 'instructions': General instructions or context shown at the top of each task\n" +
    "- 'taskPrefix': Text to prepend before each task description\n" +
    "- 'taskSuffix': Text to append after each task description",
  inputSchema: {
    type: "object",
    properties: {
      instructions: { type: "string" },
      taskPrefix: { type: "string" },
      taskSuffix: { type: "string" },
    },
  },
};

export const UPDATE_PROMPTS_TOOL: Tool = {
  name: "update_prompts",
  description:
    "Update specific parts of the prompts configuration without replacing the entire object.\n\n" +
    "Use this to modify individual fields (instructions, taskPrefix, or taskSuffix) while keeping other settings unchanged.",
  inputSchema: {
    type: "object",
    properties: {
      instructions: { type: "string" },
      taskPrefix: { type: "string" },
      taskSuffix: { type: "string" },
    },
  },
};

export const REMOVE_PROMPTS_TOOL: Tool = {
  name: "remove_prompts",
  description:
    "Remove the entire prompts configuration or specific fields from it.\n\n" +
    "If 'fields' is provided, only those specific fields will be removed.\n" +
    "If 'fields' is not provided, the entire prompts configuration will be removed.",
  inputSchema: {
    type: "object",
    properties: {
      fields: { 
        type: "array", 
        items: { 
          type: "string",
          enum: ["instructions", "taskPrefix", "taskSuffix"]
        }
      },
    },
  },
};

export const ARCHIVE_COMPLETED_REQUESTS_TOOL: Tool = {
  name: "archive_completed_requests",
  description:
    "Archive completed requests to a separate file to keep the active tasks file clean.\n\n" +
    "If 'requestIds' is provided, only those specific completed requests will be archived.\n" +
    "If 'requestIds' is not provided, all completed requests will be archived.\n\n" +
    "This addresses the need to keep active tasks file uncluttered by moving completed work to archive storage.",
  inputSchema: {
    type: "object",
    properties: {
      requestIds: {
        type: "array",
        items: { type: "string" },
        description: "Optional array of specific request IDs to archive. If not provided, all completed requests will be archived."
      },
    },
  },
};

export const LIST_ARCHIVED_REQUESTS_TOOL: Tool = {
  name: "list_archived_requests",
  description:
    "List archived requests with optional search and filtering capabilities.\n\n" +
    "Provides an overview of all archived requests with their metadata and completion information.",
  inputSchema: {
    type: "object",
    properties: {
      searchTerm: {
        type: "string",
        description: "Optional search term to filter archived requests by request text or ID"
      },
      limit: {
        type: "number",
        description: "Optional limit on the number of results to return"
      },
    },
  },
};

export const RESTORE_ARCHIVED_REQUEST_TOOL: Tool = {
  name: "restore_archived_request",
  description:
    "Restore a specific archived request back to the active tasks file.\n\n" +
    "This moves the request from the archive back to active status, allowing you to continue working on it.",
  inputSchema: {
    type: "object",
    properties: {
      requestId: {
        type: "string",
        description: "The ID of the archived request to restore"
      },
    },
    required: ["requestId"],
  },
};

/** Dispatcher that binds tools to a TaskFlowService instance */
export function taskflowHandlers(service: TaskFlowService) {
  return {
    async plan_task(args: any) {
      const {
        originalRequest,
        tasks,
        splitDetails,
        outputPath,
        dependencies,
        notes,
      } = args ?? {};
      return service.requestPlanning(
        String(originalRequest),
        tasks ?? [],
        splitDetails,
        outputPath,
        dependencies,
        notes
      );
    },

    async get_next_task(args: any) {
      return service.getNextTask(String(args.requestId));
    },

    async mark_task_done(args: any) {
      const { requestId, taskId, completedDetails } = args ?? {};
      return service.markTaskDone(String(requestId), String(taskId), completedDetails);
    },

    async open_task_details(args: any) {
      return service.openTaskDetails(String(args.taskId));
    },

    async list_requests() {
      return service.listRequests();
    },

    async add_tasks_to_request(args: any) {
      const { requestId, tasks } = args ?? {};
      return service.addTasksToRequest(String(requestId), tasks ?? []);
    },

    async update_task(args: any) {
      const { requestId, taskId, title, description } = args ?? {};
      return service.updateTask(String(requestId), String(taskId), { title, description });
    },

    async delete_task(args: any) {
      const { requestId, taskId } = args ?? {};
      return service.deleteTask(String(requestId), String(taskId));
    },

    async add_subtasks(args: any) {
      const { requestId, taskId, subtasks } = args ?? {};
      return service.addSubtasks(String(requestId), String(taskId), subtasks ?? []);
    },

    async mark_subtask_done(args: any) {
      const { requestId, taskId, subtaskId } = args ?? {};
      return service.markSubtaskDone(String(requestId), String(taskId), String(subtaskId));
    },

    async update_subtask(args: any) {
      const { requestId, taskId, subtaskId, title, description } = args ?? {};
      return service.updateSubtask(String(requestId), String(taskId), String(subtaskId), { title, description });
    },

    async delete_subtask(args: any) {
      const { requestId, taskId, subtaskId } = args ?? {};
      return service.deleteSubtask(String(requestId), String(taskId), String(subtaskId));
    },

    async export_task_status(args: any) {
      const { requestId, outputPath, filename, format } = args ?? {};
      return service.exportTaskStatus(String(requestId), outputPath, filename, format);
    },

    async add_note(args: any) {
      const { requestId, title, content } = args ?? {};
      return service.addNote(String(requestId), String(title), String(content));
    },

    async update_note(args: any) {
      const { requestId, noteId, title, content } = args ?? {};
      return service.updateNote(String(requestId), String(noteId), { title, content });
    },

    async delete_note(args: any) {
      const { requestId, noteId } = args ?? {};
      return service.deleteNote(String(requestId), String(noteId));
    },

    async add_dependency(args: any) {
      const { requestId, taskId, dependency } = args ?? {};
      return service.addDependency(String(requestId), dependency, taskId ? String(taskId) : undefined);
    },

    async get_prompts() {
      return service.getPrompts();
    },

    async set_prompts(args: any) {
      const { instructions, taskPrefix, taskSuffix } = args ?? {};
      return service.setPrompts({ instructions, taskPrefix, taskSuffix });
    },

    async update_prompts(args: any) {
      const { instructions, taskPrefix, taskSuffix } = args ?? {};
      return service.updatePrompts({ instructions, taskPrefix, taskSuffix });
    },

    async remove_prompts(args: any) {
      const { fields } = args ?? {};
      return service.removePrompts(fields);
    },

    async archive_completed_requests(args: any) {
      const { requestIds } = args ?? {};
      return service.archiveCompletedRequests(requestIds);
    },

    async list_archived_requests(args: any) {
      const { searchTerm, limit } = args ?? {};
      return service.listArchivedRequests(searchTerm, limit);
    },

    async restore_archived_request(args: any) {
      const { requestId } = args ?? {};
      return service.restoreArchivedRequest(String(requestId));
    },
  } as const;
}
