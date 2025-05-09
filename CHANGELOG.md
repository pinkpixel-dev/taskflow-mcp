# Changelog

All notable changes to the TaskFlow MCP project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
