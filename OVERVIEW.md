# TaskFlow MCP - Project Overview

*Last Updated: September 15, 2025*

## 🎯 Project Information

**Name:** TaskFlow MCP  
**Version:** 1.4.2  
**Type:** Model Context Protocol (MCP) Server  
**Language:** TypeScript  
**Purpose:** Task management system designed for AI assistants like Claude  
**Status:** ✅ **PRODUCTION READY** - Fully implemented and published to NPM

## 📋 Project Description

TaskFlow MCP is a comprehensive Model Context Protocol server that provides AI assistants with sophisticated task management capabilities. It enables the breakdown of complex user requests into manageable tasks and subtasks, with comprehensive progress tracking and user approval workflows.

## ✨ Key Features

### Core Functionality
- **Task Planning:** Break down user requests into manageable tasks with subtask support
- **Progress Tracking:** Visual progress tables showing task completion status
- **User Approval Workflow:** Structured approval process for task completion
- **Dependencies Management:** Track and manage project dependencies and requirements
- **Notes Management:** Add and manage project notes, preferences, and guidelines

### Advanced Features
- **22+ Sophisticated Tools:** Comprehensive set of MCP tools for task management
- **CRUD Operations:** Complete Create, Read, Update, Delete operations for tasks, subtasks, and notes
- **Request Completion Workflow:** New `mark_request_complete` tool with validation
- **Flexible Export Options:** Export task status in multiple formats (Markdown, JSON, HTML)
- **Schema Validation:** Built with Zod schema validation for data integrity
- **Real-time Updates:** Dynamic progress tracking and status updates
- **Relative Path Support:** Cross-platform file path resolution with Windows/Linux compatibility
- **YAML & JSON Support:** Dual format persistence with automatic detection
- **Prompts System:** Task-wide instructions, prefix/suffix for consistent LLM focus
- **Task Archiving:** Archive completed tasks to keep active lists clean while preserving history
- **Auto-Archive Integration:** Automatic archiving when `ARCHIVE_MODE=auto-on-complete`

## 🏗️ Architecture

### Technology Stack
- **Runtime:** Node.js
- **Language:** TypeScript
- **Framework:** @modelcontextprotocol/sdk v1.11.1
- **Validation:** Zod schema validation
- **Protocol:** Model Context Protocol (MCP) specification

### Core Components
1. **MCP Server Layer:** TaskFlowServer.ts - MCP protocol implementation and request handling
2. **Business Logic Layer:** TaskFlowService.ts - Core task management operations and data persistence
3. **Tools Layer:** TaskFlowTools.ts - MCP tool definitions and handlers
4. **Schema Layer:** TaskFlowSchemas.ts - Zod validation schemas for type safety
5. **Types Layer:** Comprehensive TypeScript interfaces for all data structures
6. **Utilities Layer:** Specialized modules for paths, formatting, reports, and sanitization
7. **Export System:** Multi-format export capabilities (Markdown, JSON, HTML)
8. **Archive System:** Complete task archiving with search and restore capabilities

## 🔠 MCP Tools Provided

TaskFlow MCP provides 22+ comprehensive tools for task management:

### Planning & Setup
- `plan_task` - Register new requests and plan associated tasks
- `add_tasks_to_request` - Extend existing requests with additional tasks
- `add_subtasks` - Add subtasks to existing tasks
- `add_dependency` - Add project or task dependencies
- `add_note` - Add project notes and guidelines

### Execution & Progress
- `get_next_task` - Retrieve the next pending task
- `mark_task_done` - Mark completed tasks
- `mark_subtask_done` - Mark completed subtasks
- `mark_request_complete` - Mark entire requests as completed (required for archiving)
- `open_task_details` - Get detailed task information

### Management & Updates
- `update_task` - Update task details
- `update_subtask` - Update subtask details
- `update_note` - Update project notes
- `delete_task` - Remove tasks
- `delete_subtask` - Remove subtasks
- `delete_note` - Remove notes

### Prompts & Instructions
- `get_prompts` - Get current task prompts and instructions
- `set_prompts` - Set task prompts and instructions
- `update_prompts` - Update existing prompts
- `remove_prompts` - Remove prompts configuration

### Archive Management
- `archive_completed_requests` - Archive completed tasks to keep active lists clean
- `list_archived_requests` - Browse and search archived task history
- `restore_archived_request` - Restore archived tasks back to active status

### Reporting & Export
- `list_requests` - List all requests with summaries
- `export_task_status` - Export task status in multiple formats

## 📊 Workflow Process

The TaskFlow MCP follows a structured workflow:

1. **Planning Phase**
   - User request is analyzed and broken down
   - Tasks and subtasks are created
   - Dependencies and notes are added

2. **Execution Phase**
   - Tasks are retrieved sequentially
   - Subtasks are completed before main tasks
   - Progress is tracked with visual tables

3. **Approval Phase**
   - User approval required after each task completion
   - Prevents automatic progression without consent

4. **Documentation Phase**
   - Task status exported for reference
   - Progress preserved in multiple formats

## 🎛️ Current Project Status

### Directory Structure
```
taskflow-mcp/
├── src/
│   ├── index.ts                    # Main entry point
│   ├── server/
│   │   └── TaskFlowServer.ts       # MCP server implementation
│   ├── services/
│   │   └── TaskFlowService.ts      # Core business logic
│   ├── tools/
│   │   └── TaskFlowTools.ts        # MCP tools definitions
│   ├── schemas/
│   │   └── TaskFlowSchemas.ts      # Zod validation schemas
│   ├── types/
│   │   └── index.ts               # TypeScript interfaces
│   └── utils/
│       ├── dependencies.ts        # Dependency management
│       ├── factory.ts             # Object factories
│       ├── fileFormat.ts          # File parsing/formatting
│       ├── formatTables.ts        # Progress table formatting
│       ├── paths.ts               # Path resolution utilities
│       ├── planning.ts            # Task planning utilities
│       ├── progress.ts            # Progress tracking
│       ├── reports.ts             # Export report generation
│       └── sanitize.ts            # String sanitization
├── dist/                           # Compiled JavaScript output
├── examples/                       # Example configurations and usage
├── feature-requests-implementation-plan.md # Development roadmap
├── biome.json                      # Biome configuration
├── CHANGELOG.md                    # Version history
├── CONTRIBUTING.md                 # Contribution guidelines
├── Dockerfile                      # Docker configuration
├── LICENSE                         # MIT License
├── OVERVIEW.md                     # This file
├── package.json                    # NPM package configuration
├── package-lock.json               # Dependency lock file
├── README.md                       # Main documentation
├── taskflow.png                    # Project logo
├── glama.json                      # Glama MCP registry configuration
├── smithery.yaml                   # Smithery configuration
└── tsconfig.json                   # TypeScript configuration
```

### Recent Activity
- **September 8, 2025:** Version 1.4.2 - Added request completion tool and enhanced archive workflow
- **September 3, 2025:** Version 1.4.1 - Fixed duplicate function and type conversion issues
- **September 3, 2025:** Version 1.4.0 - Enhanced MCP SDK integration and dependency updates
- **September 3, 2025:** Version 1.3.6 - Added comprehensive task archiving system with restoration capabilities
- **September 3, 2025:** Version 1.3.5 - Added prompts/instructions system with task prefix/suffix support
- **September 3, 2025:** Version 1.3.4 - Added relative path support with cross-platform compatibility
- **January 5, 2025:** Version 1.3.3 - Added YAML format support and fixed newline handling
- **August 19, 2025:** Version 1.3.2 - Simplified approval workflow
- **May 10, 2025:** Version 1.2.1 - Documentation updates
- **May 9, 2025:** Version 1.2.0 - Added export functionality, dependencies, and notes management
- **May 9, 2025:** Version 1.1.0 - Added subtasks functionality
- **May 9, 2025:** Version 1.0.0 - Initial release

### Current State
✅ **FULLY IMPLEMENTED** - TaskFlow MCP is a production-ready, published NPM package with:
- **Modular TypeScript Architecture:** Well-structured codebase with separation of concerns
- **22+ MCP Tools:** Complete task management toolkit with advanced features
- **Published to NPM:** Available as `@pinkpixel/taskflow-mcp` with semantic versioning
- **Production Features:** Request completion workflow, archive system, prompts management
- **Cross-platform Support:** Works on Windows, Linux, and macOS with proper path handling
- **Comprehensive Documentation:** Detailed README, examples, and configuration guides
- **Active Maintenance:** Regular updates and feature additions
- **MIT Licensed:** Open source with permissive licensing

## 🚀 Usage & Installation

TaskFlow MCP is ready to use! Here's how to get started:

### Global Installation
```bash
npm install -g @pinkpixel/taskflow-mcp
```

### Local Installation
```bash
npm install @pinkpixel/taskflow-mcp
```

### Running the Server
```bash
# Global installation
taskflow-mcp

# Local installation
npx taskflow-mcp
```

### MCP Configuration Example
```json
{
  "mcpServers": {
    "taskflow": {
      "command": "npx",
      "args": ["-y", "@pinkpixel/taskflow-mcp"],
      "env": {
        "TASK_MANAGER_FILE_PATH": "/path/to/tasks.yaml"
      }
    }
  }
}
```

## 🔠 Future Enhancements

Potential areas for continued development:

1. **Testing & Quality**
   - Add comprehensive unit tests for all modules
   - Implement integration tests for MCP protocol compliance
   - Add performance benchmarks and load testing

2. **Feature Extensions**
   - Add task scheduling and deadlines
   - Implement task templates
   - Add collaboration features
   - Support for task attachments

3. **Performance & Scale**
   - Database backend options (beyond file storage)
   - Task indexing and search capabilities
   - Performance optimization for large task sets

## 🔗 Related Information

- **MCP Specification:** [Model Context Protocol Documentation](https://modelcontextprotocol.io)
- **SDK Documentation:** [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/typescript-sdk)
- **Schema Validation:** [Zod Documentation](https://zod.dev)

## 📝 Notes

- This overview reflects the current state of a fully implemented, production-ready MCP server
- TaskFlow MCP v1.4.2 is actively maintained and published to NPM
- The project represents a sophisticated example of MCP server capabilities
- Source code is well-architected with modular TypeScript design across multiple files
- Features 22+ MCP tools with comprehensive task management capabilities
- The project follows semantic versioning and maintains comprehensive documentation

---

*Made with ❤️ by Pink Pixel*
