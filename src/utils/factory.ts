import { Dependency, Subtask, Task } from "../types/index.js";
import { sanitizeString } from "./sanitize.js";

export class TaskFactory {
  constructor(private counterRef: { value: number }) {}

  private nextId(prefix: string) {
    this.counterRef.value += 1;
    return `${prefix}-${this.counterRef.value}`;
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
      approved: false,
      completedDetails: "",
      subtasks,
      dependencies: def.dependencies,
    };
  }

  createNoteId(): string {
    return this.nextId("note");
  }
}
