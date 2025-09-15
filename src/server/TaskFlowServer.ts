import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { TaskFlowService } from "../services/TaskFlowService.js";
import {
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
  EXPORT_TASK_STATUS_TOOL,
  ADD_NOTE_TOOL,
  UPDATE_NOTE_TOOL,
  DELETE_NOTE_TOOL,
  ADD_DEPENDENCY_TOOL,
  GET_PROMPTS_TOOL,
  SET_PROMPTS_TOOL,
  UPDATE_PROMPTS_TOOL,
  REMOVE_PROMPTS_TOOL,
  ARCHIVE_COMPLETED_REQUESTS_TOOL,
  LIST_ARCHIVED_REQUESTS_TOOL,
  RESTORE_ARCHIVED_REQUEST_TOOL,
  taskflowHandlers
} from "../tools/TaskFlowTools.js";
import {
  RequestPlanningSchema,
  DependencySchema
} from "../schemas/TaskFlowSchemas.js";

export class TaskFlowServer {
  private server: Server;
  private service: TaskFlowService;
  private handlers: ReturnType<typeof taskflowHandlers>;

  constructor(service: TaskFlowService) {
    this.service = service;
    this.handlers = taskflowHandlers(service);
    
    this.server = new Server(
      {
        name: "taskflow-mcp",
        version: "1.5.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    // List tools handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
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
        EXPORT_TASK_STATUS_TOOL,
        ADD_NOTE_TOOL,
        UPDATE_NOTE_TOOL,
        DELETE_NOTE_TOOL,
        ADD_DEPENDENCY_TOOL,
        GET_PROMPTS_TOOL,
        SET_PROMPTS_TOOL,
        UPDATE_PROMPTS_TOOL,
        REMOVE_PROMPTS_TOOL,
        ARCHIVE_COMPLETED_REQUESTS_TOOL,
        LIST_ARCHIVED_REQUESTS_TOOL,
        RESTORE_ARCHIVED_REQUEST_TOOL,
      ],
    }));

    // Call tool handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;
        
        // Route to appropriate handler
        const handler = (this.handlers as any)[name];
        if (!handler) {
          throw new Error(`Unknown tool: ${name}`);
        }

        const result = await handler(args);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `Error: ${errorMessage}` }],
          isError: true,
        };
      }
    });
  }

  async connect(transport: StdioServerTransport): Promise<void> {
    await this.server.connect(transport);
  }

  async run(): Promise<void> {
    console.error("TaskFlow MCP Server running on stdio...");
  }
}
