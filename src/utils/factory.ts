import { Dependency, Subtask, Task } from "../types/index.js";
import { sanitizeString } from "./sanitize.js";

export class TaskFactory {
  private requestTaskCounter = 0;
  private requestSubtaskCounter = 0;
  
  constructor(private globalCounterRef: { value: number }) {}

  // Expose counter ref for backward compatibility
  get counterRef() {
    return this.globalCounterRef;
  }

  private nextId(prefix: string) {
    if (prefix === "task") {
      // Use per-request task numbering
      this.requestTaskCounter += 1;
      return `${prefix}-${this.requestTaskCounter}`;
    }
    
    if (prefix === "subtask") {
      // Use per-request subtask numbering
      this.requestSubtaskCounter += 1;
      return `${prefix}-${this.requestSubtaskCounter}`;
    }
    
    // For notes and other items, use global numbering
    this.globalCounterRef.value += 1;
    return `${prefix}-${this.globalCounterRef.value}`;
  }

  createSubtask(def: { title: string; description: string }): Subtask {
    return {
      id: this.nextId("subtask"),
      title: sanitizeString(def.title),
      description: sanitizeString(def.description),
      done: false,
    };
  }

  createTask(def: {
    title: string;
    description: string;
    subtasks?: { title: string; description: string }[];
    dependencies?: Dependency[];
  }): Task {
    const subtasks = (def.subtasks || []).map((s) => this.createSubtask(s));
    return {
      id: this.nextId("task"),
      title: sanitizeString(def.title),
      description: sanitizeString(def.description),
      done: false,
      completedDetails: "",
      subtasks,
      dependencies: def.dependencies,
    };
  }

  createNoteId(): string {
    return this.nextId("note");
  }
}
