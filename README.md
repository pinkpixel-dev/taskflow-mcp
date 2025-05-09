# TaskFlow MCP 🔄✅

A task management Model Context Protocol (MCP) server for planning and executing tasks with AI assistants.

![Version](https://img.shields.io/badge/version-1.1.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## 🌟 Overview

TaskFlow MCP is a specialized server that helps AI assistants break down user requests into manageable tasks and track their completion. It enforces a structured workflow with user approval steps to ensure tasks are properly tracked and users maintain control over the process.

## ✨ Features

- 📋 **Task Planning**: Break down complex requests into manageable tasks
- � **Subtasks**: Divide tasks into smaller, more manageable subtasks
- �📊 **Progress Tracking**: Track the status of tasks, subtasks, and requests with visual progress tables
- 👍 **User Approval**: Enforce user approval steps to ensure quality and control
- 💾 **Persistence**: Save tasks and requests to disk for persistence across sessions
- 🔄 **Flexible Management**: Add, update, or delete tasks and subtasks as needed
- 📝 **Detailed Reporting**: View task details and progress tables

## 🚀 Installation

### Global Installation

```bash
npm install -g @pinkpixel/taskflow-mcp
```

### Local Installation

```bash
npm install @pinkpixel/taskflow-mcp
```

## 🛠️ Usage

### Starting the Server

If installed globally:

```bash
taskflow-mcp
```

If installed locally:

```bash
npx taskflow-mcp
```

### Configuration

By default, TaskFlow MCP saves tasks to `~/Documents/tasks.json`. You can change this by setting the `TASK_MANAGER_FILE_PATH` environment variable:

```bash
TASK_MANAGER_FILE_PATH=/path/to/tasks.json taskflow-mcp
```

### MCP Configuration

To use TaskFlow MCP with AI assistants, you need to configure your MCP client to use the server. Create an `mcp_config.json` file with the following content:

```json
{
  "mcpServers": {
    "taskflow": {
      "command": "npx",
      "args": ["-y", "@pinkpixel/taskflow-mcp"]
    }
  }
}
```

## 🔄 Workflow

TaskFlow MCP enforces a specific workflow:

1. **Plan Tasks**: Break down a user request into tasks (with optional subtasks)
2. **Get Next Task**: Retrieve the next pending task
3. **Complete Subtasks**: If the task has subtasks, complete each subtask before marking the task as done
4. **Mark Task Done**: Mark a task as completed (requires all subtasks to be completed first)
5. **Wait for Approval**: Wait for user approval of the completed task
6. **Repeat**: Continue with the next task until all tasks are complete
7. **Final Approval**: Get user approval for the entire request

## 🧰 Available Tools

TaskFlow MCP exposes the following tools to AI assistants:

### `plan_task`

Register a new user request and plan its associated tasks (with optional subtasks).

```json
{
  "originalRequest": "Create a new website for my business",
  "tasks": [
    {
      "title": "Design homepage",
      "description": "Create a design for the homepage with logo, navigation, and hero section",
      "subtasks": [
        {
          "title": "Design logo",
          "description": "Create a logo that represents the business brand"
        },
        {
          "title": "Design navigation",
          "description": "Create a user-friendly navigation menu"
        }
      ]
    },
    {
      "title": "Implement HTML/CSS",
      "description": "Convert the design to HTML and CSS"
    }
  ]
}
```

### `get_next_task`

Retrieve the next pending task for a request.

```json
{
  "requestId": "req-1"
}
```

### `mark_task_done`

Mark a task as completed.

```json
{
  "requestId": "req-1",
  "taskId": "task-1",
  "completedDetails": "Created a modern design with a clean layout"
}
```

### `approve_task_completion`

Approve a completed task.

```json
{
  "requestId": "req-1",
  "taskId": "task-1"
}
```

### `approve_request_completion`

Approve an entire request as completed.

```json
{
  "requestId": "req-1"
}
```

### `open_task_details`

Get details about a specific task.

```json
{
  "taskId": "task-1"
}
```

### `list_requests`

List all requests in the system.

```json
{}
```

### `add_tasks_to_request`

Add more tasks to an existing request.

```json
{
  "requestId": "req-1",
  "tasks": [
    {
      "title": "Add contact form",
      "description": "Create a contact form with validation"
    }
  ]
}
```

### `update_task`

Update a task's title or description.

```json
{
  "requestId": "req-1",
  "taskId": "task-1",
  "title": "Design responsive homepage",
  "description": "Create a responsive design for the homepage"
}
```

### `delete_task`

Delete a task from a request.

```json
{
  "requestId": "req-1",
  "taskId": "task-1"
}
```

### `add_subtasks`

Add subtasks to an existing task.

```json
{
  "requestId": "req-1",
  "taskId": "task-1",
  "subtasks": [
    {
      "title": "Design logo",
      "description": "Create a logo that represents the business brand"
    },
    {
      "title": "Design navigation",
      "description": "Create a user-friendly navigation menu"
    }
  ]
}
```

### `mark_subtask_done`

Mark a subtask as completed.

```json
{
  "requestId": "req-1",
  "taskId": "task-1",
  "subtaskId": "subtask-1"
}
```

### `update_subtask`

Update a subtask's title or description.

```json
{
  "requestId": "req-1",
  "taskId": "task-1",
  "subtaskId": "subtask-1",
  "title": "Design modern logo",
  "description": "Create a modern logo that represents the business brand"
}
```

### `delete_subtask`

Delete a subtask from a task.

```json
{
  "requestId": "req-1",
  "taskId": "task-1",
  "subtaskId": "subtask-1"
}
```

## 📚 Documentation

For more detailed information about the project architecture and implementation, see the [OVERVIEW.md](./OVERVIEW.md) file.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please see the [CONTRIBUTING.md](./CONTRIBUTING.md) file for guidelines.

## 📜 Changelog

See the [CHANGELOG.md](./CHANGELOG.md) file for a history of changes to this project.

## 🙏 Acknowledgements

- Built with [Model Context Protocol (MCP)](https://github.com/anthropics/model-context-protocol)
- Created by [Pink Pixel](https://pinkpixel.dev)

---

Made with ❤️ by Pink Pixel
