# Changelog

All notable changes to the TaskFlow MCP project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.3] - 2025-01-05

### Added

- YAML format support for task data persistence
  - Tasks can now be saved in YAML format by configuring the file path with `.yaml` or `.yml` extension
  - Automatic format detection based on file extension during load and save operations
  - YAML format better preserves multiline descriptions and complex text content
  - Maintains backward compatibility with existing JSON format

### Fixed

- Robust newline handling in task descriptions and subtask descriptions
  - Fixed corrupted newline patterns like 'nn' and 'n-' that were appearing in saved data
  - Implemented comprehensive string sanitization to normalize various newline formats
  - Ensured proper preservation of multiline content in both JSON and YAML formats
  - Fixed issues where newlines were being incorrectly escaped or replaced during save operations

## [1.3.2] - 2025-08-19

### Changed

- Simplified approval workflow to use direct user confirmation instead of dedicated approval tools
- Updated tool descriptions to clarify the approval process
- Streamlined progress reporting by removing approval status columns

### Removed

- Removed unused approval tool schemas (`ApproveTaskCompletionSchema` and `ApproveRequestCompletionSchema`)
- Removed approval status tracking from progress tables and status reports
- Removed approval counts from request summaries

### Fixed

- Fixed workflow clarity by removing references to non-existent approval tools
- Improved user experience by eliminating confusion around approval tool calls
- Enhanced documentation consistency across all tool descriptions

## [1.2.1] - 2025-05-10

### Fixed

- Updated documentation to reflect current features and functionality
- Fixed minor issues in the README.md and OVERVIEW.md files
- Improved example system prompts for better clarity

## [1.2.0] - 2025-05-09

### Added

- Export functionality
  - Added `outputPath` parameter to `plan_task` tool to save task plan as Markdown
  - New `export_task_status` tool to export current task status in Markdown, JSON, or HTML format
  - Detailed task plan export with checkboxes, dependencies, and notes
  - Status report export with progress bars and detailed task information

- Dependencies management
  - Added support for project and task-level dependencies
  - Dependencies can include name, version, URL, and description
  - New `add_dependency` tool to add dependencies to requests or tasks
  - Dependencies are displayed in progress tables and exports

- Notes management
  - Added support for project-level notes
  - Notes can include title, content, and timestamps
  - New tools for managing notes:
    - `add_note`: Add a note to a request
    - `update_note`: Update an existing note
    - `delete_note`: Delete a note from a request
  - Notes are displayed in progress tables and exports

## [1.1.0] - 2025-05-09

### Added

- Subtasks functionality
  - Tasks can now have subtasks, which are smaller units of work
  - All subtasks must be completed before a task can be marked as done
  - New tools for managing subtasks:
    - `add_subtasks`: Add subtasks to an existing task
    - `mark_subtask_done`: Mark a subtask as completed
    - `update_subtask`: Update a subtask's title or description
    - `delete_subtask`: Delete a subtask from a task
  - Updated progress table to display subtasks with their status
  - Enhanced task details to include subtask information

## [1.0.0] - 2025-05-09

### Added

- Initial release of TaskFlow MCP
- Core TaskFlowServer class for managing tasks and requests
- MCP Server integration using @modelcontextprotocol/sdk
- Data persistence using JSON file storage
- Tool definitions for AI assistants to interact with the task manager
- Task planning functionality
- Task progress tracking with visual tables
- User approval workflow for tasks and requests
- Ability to add, update, and delete tasks
- Detailed reporting of task status and progress
- Configuration options for task file path
- MCP configuration for easy integration with AI assistants

### Changed

- N/A (Initial release)

### Deprecated

- N/A (Initial release)

### Removed

- N/A (Initial release)

### Fixed

- N/A (Initial release)

### Security

- N/A (Initial release)
