export type TaskStatusType = "TODO" | "IN_PROGRESS" | "DONE";
export type TaskPriorityType = "LOW" | "MEDIUM" | "HIGH";

export interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatusType;
  priority: TaskPriorityType;
  dueDate: string | null;
  teamId: string | null;
  assigneeId: string | null;
  createdAt: string;
  updatedAt: string;
  team?: {
    id: string;
    name: string;
  } | null;
  assignee?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export interface TaskFormData {
  title: string;
  description?: string;
  status: TaskStatusType;
  priority: TaskPriorityType;
  dueDate?: string;
}
