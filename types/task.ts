export type TaskStatusType = "TODO" | "IN_PROGRESS" | "DONE";
export type TaskPriorityType = "LOW" | "MEDIUM" | "HIGH";
export type TeamMemberRole = "OWNER" | "ADMIN" | "MEMBER";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
}

export interface TeamMemberItem {
  id: string;
  teamId: string;
  userId: string;
  role: TeamMemberRole;
  joinedAt: string;
  user: UserProfile;
}

export interface TeamItem {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt?: string;
  owner?: UserProfile;
  members?: TeamMemberItem[];
  tasks?: TaskItem[];
  _count?: {
    members: number;
    tasks: number;
  };
  currentUserRole?: TeamMemberRole;
  isOwner?: boolean;
}

export interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatusType;
  priority: TaskPriorityType;
  dueDate: string | null;
  teamId: string | null;
  assigneeId: string | null;
  creatorId?: string | null;
  createdAt: string;
  updatedAt: string;
  team?: {
    id: string;
    name: string;
  } | null;
  assignee?: UserProfile | null;
  creator?: UserProfile | null;
}

export interface TaskFormData {
  title: string;
  description?: string;
  status: TaskStatusType;
  priority: TaskPriorityType;
  dueDate?: string;
  assigneeId?: string;
}
