# TaskFlow MCP - Project Overview

*Last updated: August 19, 2025*

## Introduction

TaskFlow MCP is a Model Context Protocol (MCP) server that implements a task management system designed to work with AI assistants like Claude. It helps break down user requests into manageable tasks and tracks their completion through a structured workflow that includes user approval steps.

The server exposes a set of tools that AI assistants can use to create, manage, and track tasks within user requests. It enforces a specific workflow that ensures tasks are properly tracked and approved by users before proceeding to the next task.

**Current Version:** 1.3.2

## Project Architecture

### Core Components

1. **TaskFlowServer Class**: The main class that manages tasks and requests, providing methods for creating, updating, and tracking tasks.

2. **MCP Server Integration**: Uses the `@modelcontextprotocol/sdk` to expose functionality as tools that can be called by AI assistants.

3. **Data Persistence**: Tasks and requests are stored in a JSON file (default: `~/Documents/tasks.json`), which can be configured via an environment variable.

4. **Tool Definitions**: A set of tools that AI assistants can call to interact with the task manager.

### Data Model

1. **Dependency**: Represents a project or task dependency with properties:
   - `name`: Name of the dependency
   - `version`: Optional version of the dependency
   - `url`: Optional URL for the dependency
   - `description`: Optional description of the dependency

2. **Note**: Represents a project-level note with properties:
   - `id`: Unique identifier for the note
   - `title`: Title of the note
   - `content`: Content of the note
   - `createdAt`: Timestamp when the note was created
   - `updatedAt`: Timestamp when the note was last updated

3. **Subtask**: Represents a smaller unit of work within a task with properties:
   - `id`: Unique identifier for the subtask
   - `title`: Short title describing the subtask
   - `description`: Detailed description of the subtask
   - `done`: Boolean indicating if the subtask is completed

4. **Task**: Represents a single task with properties:
   - `id`: Unique identifier for the task
   - `title`: Short title describing the task
   - `description`: Detailed description of the task
   - `done`: Boolean indicating if the task is completed
   - `completedDetails`: Optional details about how the task was completed
   - `subtasks`: Array of Subtask objects
   - `dependencies`: Optional array of Dependency objects

5. **RequestEntry**: Represents a user request with properties:
   - `requestId`: Unique identifier for the request
   - `originalRequest`: The original text of the user's request
   - `splitDetails`: Optional detailed breakdown of the request
   - `tasks`: Array of Task objects
   - `completed`: Boolean indicating if the entire request has been completed and approved
   - `dependencies`: Optional array of Dependency objects
   - `notes`: Optional array of Note objects

6. **TaskFlowFile**: The top-level structure that contains an array of requests.

### Workflow

The TaskFlow MCP server enforces a specific workflow:

1. **Plan Tasks**: Break down a user request into tasks (with optional subtasks)
2. **Get Next Task**: Retrieve the next pending task
3. **Complete Subtasks**: If the task has subtasks, complete each subtask before marking the task as done
4. **Mark Task Done**: Mark a task as completed (requires all subtasks to be completed first)
5. **Wait for User Confirmation**: Ask the user to confirm the completed task before proceeding
6. **Repeat**: Continue with the next task until all tasks are complete
7. **Final Confirmation**: Confirm with the user that the entire request has been completed

This workflow ensures that tasks are properly tracked and that the user has visibility and control over the process. The simplified approval process relies on direct user confirmation rather than dedicated approval tools, making the workflow more intuitive while maintaining user control. The addition of subtasks allows for more granular tracking of progress and helps break down complex tasks into more manageable pieces.

## Key Features

1. **Task Planning**: Break down complex requests into manageable tasks
2. **Subtasks**: Divide tasks into smaller, more manageable units of work
3. **Progress Tracking**: Track the status of tasks, subtasks, and requests
4. **User Approval**: Enforce user approval steps to ensure quality and control
5. **Persistence**: Save tasks and requests to disk for persistence across sessions
6. **Flexible Management**: Add, update, or delete tasks and subtasks as needed
7. **Detailed Reporting**: View task details, subtask status, and progress tables
8. **Export Options**: Export task plans and status reports in Markdown, JSON, or HTML formats
9. **Dependencies**: Track project and task-level dependencies with version information
10. **Notes**: Add project-level notes for important information and preferences
11. **System Prompts**: Example system prompts for AI assistants to consistently use the tools

## Technical Implementation

### Technologies Used

1. **TypeScript**: For type safety and modern JavaScript features
2. **Zod**: For schema validation of inputs
3. **Model Context Protocol (MCP) SDK**: For creating a server that can be used by AI assistants
4. **Node.js fs/promises API**: For file operations to persist task data

### Project Structure

The project has a relatively simple structure, with a single main file (`index.ts`) containing all the logic. It's set up as an npm package that can be installed and run as a command-line tool.

### Available Tools

The TaskFlow MCP server exposes the following tools to AI assistants:

1. **plan_task**: Register a new user request and plan its associated tasks (with optional subtasks, dependencies, notes, and outputPath)
2. **get_next_task**: Retrieve the next pending task for a request
3. **mark_task_done**: Mark a task as completed (requires all subtasks to be completed first)
4. **open_task_details**: Get details about a specific task (including its subtasks)
5. **list_requests**: List all requests in the system
6. **add_tasks_to_request**: Add more tasks to an existing request
7. **update_task**: Update a task's title or description
8. **delete_task**: Delete a task from a request
9. **add_subtasks**: Add subtasks to an existing task
10. **mark_subtask_done**: Mark a subtask as completed
11. **update_subtask**: Update a subtask's title or description
12. **delete_subtask**: Delete a subtask from a task
13. **export_task_status**: Export the current status of all tasks to a file (markdown, JSON, or HTML)
14. **add_note**: Add a note to a request
15. **update_note**: Update an existing note
16. **delete_note**: Delete a note from a request
17. **add_dependency**: Add a dependency to a request or task

## Configuration

The TaskFlow MCP server can be configured in the following ways:

1. **Task File Path**: Set the `TASK_MANAGER_FILE_PATH` environment variable to specify where tasks should be stored (default: `~/Documents/tasks.json`)

2. **MCP Configuration**: The `mcp_config.json` file defines how the MCP server should be launched, specifying that it should be run using `npx` with the `@pinkpixel-dev/taskflow-mcp` package.

3. **System Prompts**: The `example-system-prompt.md` file provides example system prompts that can be added to AI assistants to ensure they consistently use the TaskFlow MCP tools according to the intended workflow.

## Usage Examples

### Example Workflow

1. **Plan Tasks with Subtasks**:
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
           },
           {
             "title": "Design hero section",
             "description": "Create an eye-catching hero section with call-to-action"
           }
         ]
       },
       {
         "title": "Implement HTML/CSS",
         "description": "Convert the design to HTML and CSS",
         "subtasks": [
           {
             "title": "Create HTML structure",
             "description": "Implement the basic HTML structure of the page"
           },
           {
             "title": "Add CSS styling",
             "description": "Style the page according to the design"
           },
           {
             "title": "Ensure responsiveness",
             "description": "Make sure the page looks good on all devices"
           }
         ]
       },
       {
         "title": "Add JavaScript functionality",
         "description": "Implement interactive elements with JavaScript"
       }
     ]
   }
   ```

2. **Get Next Task**:
   ```json
   {
     "requestId": "req-1"
   }
   ```

3. **Mark Task Done**:
   ```json
   {
     "requestId": "req-1",
     "taskId": "task-1",
     "completedDetails": "Created a modern design with a clean layout, prominent logo, and clear navigation"
   }
   ```

4. **Mark Subtask Done**:
   ```json
   {
     "requestId": "req-1",
     "taskId": "task-1",
     "subtaskId": "subtask-1"
   }
   ```

5. **Add Subtasks to Existing Task**:
   ```json
   {
     "requestId": "req-1",
     "taskId": "task-2",
     "subtasks": [
       {
         "title": "Add form validation",
         "description": "Implement client-side validation for the contact form"
       },
       {
         "title": "Add form submission",
         "description": "Implement form submission handling"
       }
     ]
   }
   ```

6. **Export Task Status**:
   ```json
   {
     "requestId": "req-1",
     "outputPath": "C:/Users/username/Documents/task-status.md",
     "format": "markdown"
   }
   ```

7. **Add Note**:
   ```json
   {
     "requestId": "req-1",
     "title": "Package Manager Preference",
     "content": "User prefers pnpm over npm for package management."
   }
   ```

8. **Add Dependency**:
   ```json
   {
     "requestId": "req-1",
     "taskId": "task-2",
     "dependency": {
       "name": "React",
       "version": "^18.2.0",
       "description": "JavaScript library for building user interfaces"
     }
   }
   ```


## Future Enhancements

Potential future enhancements for the TaskFlow MCP server include:

1. **Multiple Storage Options**: Support for different storage backends (e.g., databases)
2. **User Authentication**: Add user authentication to support multiple users
3. **Task Dependencies**: Add support for dependencies between tasks and subtasks
4. **Task Templates**: Add support for reusable task and subtask templates
5. **Rich Formatting**: Support for rich text formatting in task descriptions and completion details
6. **Attachments**: Support for file attachments to tasks and subtasks
7. **Notifications**: Add support for notifications when tasks are ready for approval
8. **Analytics**: Add analytics to track task and subtask completion times and other metrics
9. **Subtask Dependencies**: Add support for dependencies between subtasks
10. **Subtask Assignment**: Allow assigning subtasks to different team members

## Conclusion

TaskFlow MCP is a powerful tool for AI assistants to manage tasks and track progress on user requests. By enforcing a structured workflow with user approval steps, it ensures that tasks are properly tracked and that users maintain control over the process.
