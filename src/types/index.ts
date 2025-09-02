export interface Dependency {
  name: string;
  version?: string;
  url?: string;
  description?: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface Subtask {
  id: string;
  title: string;
  description: string;
  done: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  done: boolean;
  approved: boolean;
  completedDetails: string;
  subtasks: Subtask[];
  dependencies?: Dependency[];
}

export interface RequestEntry {
  requestId: string;
  originalRequest: string;
  splitDetails: string;
  tasks: Task[];
  completed: boolean; // marked true after all tasks done and request completion approved
  dependencies?: Dependency[];
  notes?: Note[];
}

export interface TaskFlowFile {
  requests: RequestEntry[];
}
