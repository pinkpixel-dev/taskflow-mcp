# Project Plan: Address three GitHub feature requests for TaskFlow MCP: Archive Tasks (#9), Expose Prompts in Tasks File (#8), and Relative Path Support (#7)

## Dependencies

- **@modelcontextprotocol/sdk** (^1.11.1): MCP SDK for server implementation
- **zod** (^3.23.8): Schema validation for new data structures
- **js-yaml** (^4.1.0): YAML format support

## Notes

### User feedback priority
Requests from heavy user @drmikecrowe; prioritize UX and backward compatibility

### Implementation order
1) Relative paths (#7), 2) Prompts (#8), 3) Archiving (#9)

### Testing strategy
Cover Windows/macOS/Linux, remote shells, and different working dirs; verify JSON/YAML parity

## Tasks Overview
- [ ] Issue #7: Add Relative Path Support
  - [ ] Investigate current path resolution logic
  - [ ] Research process.cwd() reliability
  - [ ] Implement relative path resolution
  - [ ] Add base directory option
  - [ ] Fallback mechanism
  - [ ] Update docs & examples
- [ ] Issue #8: Expose Prompts in Tasks File
  - [ ] Design prompts schema
  - [ ] Extend persistence format
  - [ ] Inject prompts at runtime
  - [ ] Management tools
  - [ ] Backward compatibility
  - [ ] Docs & usage examples
- [ ] Issue #9: Task Archiving System
  - [ ] Design archive structure
  - [ ] Implement archive operation
  - [ ] Configuration options
  - [ ] Archive browsing tools
  - [ ] File rotation (optional)
  - [ ] Documentation

## Detailed Tasks

### 1. Issue #7: Add Relative Path Support
**Description:** Implement ability to use relative paths for TASK_MANAGER_FILE_PATH to improve usability in remote and project-based workflows.

**Subtasks:**
- [ ] Investigate current path resolution logic
  - Description: Review the existing file path handling in src/index.ts and persistence helpers to understand absolute path requirement
- [ ] Research process.cwd() reliability
  - Description: Test process.cwd() behavior on Windows/macOS/Linux and remote shells; document edge cases
- [ ] Implement relative path resolution
  - Description: Resolve relative paths against process.cwd() with safe normalization using Node's path.resolve()
- [ ] Add base directory option
  - Description: Add env/config option TASK_MANAGER_BASE_DIR to override cwd when needed
- [ ] Fallback mechanism
  - Description: Fallback to absolute path behavior if resolution fails; emit clear error messages
- [ ] Update docs & examples
  - Description: Update README/OVERVIEW to document relative path usage and best practices

### 2. Issue #8: Expose Prompts in Tasks File
**Description:** Support a top-level prompts/instructions section (with optional taskPrefix/taskSuffix) stored alongside tasks (JSON/YAML) and applied consistently.

**Subtasks:**
- [ ] Design prompts schema
  - Description: Define schema: { instructions?: string, taskPrefix?: string, taskSuffix?: string } with Zod and JSON Schema
- [ ] Extend persistence format
  - Description: Add support for reading/writing the prompts section in both JSON and YAML (non-breaking)
- [ ] Inject prompts at runtime
  - Description: When returning tasks via tools, prepend/append prefix/suffix and include instructions context
- [ ] Management tools
  - Description: Add tools to get/update/remove prompts (e.g., get_prompts, set_prompts)
- [ ] Backward compatibility
  - Description: Ensure older files (without prompts) load unchanged
- [ ] Docs & usage examples
  - Description: Document how to use prompts to guide LLM focus across tasks

### 3. Issue #9: Task Archiving System
**Description:** Allow moving completed requests/tasks to a separate archive file to keep the active tasks file clean.

**Subtasks:**
- [ ] Design archive structure
  - Description: Define archive file format including completion timestamps and original metadata
- [ ] Implement archive operation
  - Description: Add tool(s) to archive completed tasks/requests into archive file; support manual and auto-archive modes
- [ ] Configuration options
  - Description: Support ARCHIVE_FILE_PATH and ARCHIVE_MODE (manual|auto-on-complete) with safe defaults
- [ ] Archive browsing tools
  - Description: Provide tools to list/search archived items and optionally restore to active file
- [ ] File rotation (optional)
  - Description: Optional: archive rotation by size/date to prevent large files
- [ ] Documentation
  - Description: Explain archiving workflow, config, and recovery process

## Progress Tracking

| Task | Status | Completion Date |
|------|--------|----------------|
| Issue #7: Add Relative Path Support | 🔄 In Progress |  |
| Issue #8: Expose Prompts in Tasks File | 🔄 In Progress |  |
| Issue #9: Task Archiving System | 🔄 In Progress |  |
