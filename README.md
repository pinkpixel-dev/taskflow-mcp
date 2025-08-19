[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/pinkpixel-dev-taskflow-mcp-badge.png)](https://mseep.ai/app/pinkpixel-dev-taskflow-mcp)

# TaskFlow MCP 🔄✅

<p align="center">
  <img src="taskflow.png" alt="TaskFlow MCP">
</p>

A task management Model Context Protocol (MCP) server for planning and executing tasks with AI assistants.

<a href="https://glama.ai/mcp/servers/@pinkpixel-dev/taskflow-mcp">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@pinkpixel-dev/taskflow-mcp/badge" alt="TaskFlow MCP server" />
</a>

![Version](https://img.shields.io/badge/version-1.3.3-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## 🌟 Overview

TaskFlow MCP is a specialized server that helps AI assistants break down user requests into manageable tasks and track their completion. It enforces a structured workflow with user approval steps to ensure tasks are properly tracked and users maintain control over the process.

## ✨ Features

- 📋 **Task Planning**: Break down complex requests into manageable tasks
- 🔍 **Subtasks**: Divide tasks into smaller, more manageable subtasks
- 📊 **Progress Tracking**: Track the status of tasks, subtasks, and requests with visual progress tables
- 👍 **User Approval**: Enforce user approval steps to ensure quality and control
- 💾 **Persistence**: Save tasks and requests to disk for persistence across sessions
- 🔄 **Flexible Management**: Add, update, or delete tasks and subtasks as needed
- 📝 **Detailed Reporting**: View task details and progress tables
- 📤 **Export Options**: Export task plans and status reports in Markdown, JSON, or HTML formats
- 📦 **Dependencies**: Track project and task-level dependencies with version information
- 📌 **Notes**: Add project-level notes for important information and preferences
- 📄 **YAML Support**: Save tasks in YAML format for better handling of multiline content
- 🛡️ **Robust Text Handling**: Comprehensive newline sanitization for reliable data persistence

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

#### YAML Format Support

TaskFlow MCP supports both JSON and YAML formats for data persistence. To use YAML format, simply configure your file path with a `.yaml` or `.yml` extension:

```bash
TASK_MANAGER_FILE_PATH=/path/to/tasks.yaml taskflow-mcp
```

YAML format is particularly useful for:
- Better preservation of multiline descriptions and text content
- More human-readable task data files
- Easier manual editing if needed

The format is automatically detected based on the file extension, and the system maintains full backward compatibility with existing JSON files.

### MCP Configuration

To use TaskFlow MCP with AI assistants, you need to configure your MCP client to use the server. Create an `mcp_config.json` file with the following content:

```json
{
  "mcpServers": {
    "taskflow": {
      "command": "npx",
      "args": ["-y", "@pinkpixel/taskflow-mcp"],
      "env": {
        "TASK_MANAGER_FILE_PATH": "/path/to/tasks.json"
      }
    }
  }
}
```

For YAML format:

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

## 🔄 Workflow

TaskFlow MCP enforces a specific workflow:

1. **Plan Tasks**: Break down a user request into tasks (with optional subtasks)
2. **Get Next Task**: Retrieve the next pending task
3. **Complete Subtasks**: If the task has subtasks, complete each subtask before marking the task as done
4. **Mark Task Done**: Mark a task as completed (requires all subtasks to be completed first)
5. **Wait for User Confirmation**: Ask the user to confirm the completed task before proceeding
6. **Repeat**: Continue with the next task until all tasks are complete
7. **Final Confirmation**: Confirm with the user that the entire request has been completed

For AI assistants to consistently follow this workflow, see the [example-system-prompt.md](./example-system-prompt.md) file for system prompts you can add to your assistant's instructions.

## 🧰 Available Tools

TaskFlow MCP exposes the following tools to AI assistants:

### `plan_task`

Register a new user request and plan its associated tasks (with optional subtasks).

```json
{
  "originalRequest": "Create a new website for my business",
  "outputPath": "C:/Users/username/Documents/website-project-plan.md",
  "dependencies": [
    {
      "name": "Node.js",
      "version": ">=14.0.0",
      "description": "JavaScript runtime"
    },
    {
      "name": "npm",
      "version": ">=6.0.0",
      "description": "Package manager"
    }
  ],
  "notes": [
    {
      "title": "Package Manager Preference",
      "content": "User prefers pnpm over npm for package management."
    },
    {
      "title": "Design Guidelines",
      "content": "Follow the company's brand guidelines for colors and typography."
    }
  ],
  "tasks": [
    {
      "title": "Design homepage",
      "description": "Create a design for the homepage with logo, navigation, and hero section",
      "dependencies": [
        {
          "name": "Figma",
          "description": "Design tool"
        }
      ],
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
      "description": "Convert the design to HTML and CSS",
      "dependencies": [
        {
          "name": "HTML5",
          "description": "Markup language"
        },
        {
          "name": "CSS3",
          "description": "Styling language"
        }
      ]
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

### `export_task_status`

Export the current status of all tasks in a request to a file. It's recommended to use absolute paths for more reliable file creation.

```json
{
  "requestId": "req-1",
  "outputPath": "C:/Users/username/Documents/task-status.md",
  "format": "markdown"
}
```

### `add_note`

Add a note to a request.

```json
{
  "requestId": "req-1",
  "title": "Package Manager Preference",
  "content": "User prefers pnpm over npm for package management."
}
```

### `update_note`

Update an existing note.

```json
{
  "requestId": "req-1",
  "noteId": "note-1",
  "title": "Package Manager Preference",
  "content": "User prefers pnpm over npm and yarn for package management."
}
```

### `delete_note`

Delete a note from a request.

```json
{
  "requestId": "req-1",
  "noteId": "note-1"
}
```

### `add_dependency`

Add a dependency to a request or task.

```json
{
  "requestId": "req-1",
  "taskId": "task-1",
  "dependency": {
    "name": "react",
    "version": "^18.2.0",
    "description": "JavaScript library for building user interfaces",
    "url": "https://reactjs.org"
  }
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