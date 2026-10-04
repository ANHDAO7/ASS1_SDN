"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import {
  TeamItem,
  TaskItem,
  TaskStatusType,
  TaskPriorityType,
  TeamMemberItem,
} from "@/types/task";
import {
  ArrowLeft,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Search,
  Crown,
  Shield,
  UserPlus,
  Trash2,
  Edit2,
  Calendar,
  SlidersHorizontal,
  LayoutGrid,
  List,
  X,
  RefreshCw,
  FolderGit2
} from "lucide-react";

export default function TeamDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const teamId = params.id as string;

  const [team, setTeam] = useState<TeamItem | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tabs: 'board' | 'members'
  const [activeTab, setActiveTab] = useState<"board" | "members">("board");
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterPriority, setFilterPriority] = useState<string>("ALL");
  const [filterAssignee, setFilterAssignee] = useState<string>("ALL");

  // Modals
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isEditTeamModalOpen, setIsEditTeamModalOpen] = useState(false);

  // Form states
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskStatus, setTaskStatus] = useState<TaskStatusType>("TODO");
  const [taskPriority, setTaskPriority] = useState<TaskPriorityType>("MEDIUM");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskAssigneeId, setTaskAssigneeId] = useState("");
  const [taskFormError, setTaskFormError] = useState<string | null>(null);
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);

  // Member invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"MEMBER" | "ADMIN">("MEMBER");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [isInviting, setIsInviting] = useState(false);

  // Edit Team form
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [isSavingTeam, setIsSavingTeam] = useState(false);

  // Fetch team detail and tasks
  const fetchTeamData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch(`/api/teams/${teamId}`);
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        if (res.status === 403) {
          throw new Error("You do not have permission to access this team.");
        }
        throw new Error("Failed to load team data.");
      }

      const teamData = await res.json();
      setTeam(teamData);
      setTasks(teamData.tasks || []);
      setEditName(teamData.name);
      setEditDesc(teamData.description || "");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error fetching team data";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [teamId, router]);

  useEffect(() => {
    let ignore = false;
    async function loadDetail() {
      if (isAuthLoading) return;
      if (!user) {
        router.push("/login");
        return;
      }
      try {
        const res = await fetch(`/api/teams/${teamId}`);
        if (!res.ok) {
          if (res.status === 401) {
            router.push("/login");
            return;
          }
          if (res.status === 403) {
            throw new Error("You do not have permission to access this team.");
          }
          throw new Error("Failed to load team data.");
        }

        const teamData = await res.json();
        if (!ignore) {
          setTeam(teamData);
          setTasks(teamData.tasks || []);
          setEditName(teamData.name);
          setEditDesc(teamData.description || "");
          setError(null);
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Error fetching team data");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadDetail();
    return () => {
      ignore = true;
    };
  }, [user, isAuthLoading, teamId, router]);

  const isOwner = team?.ownerId === user?.id || team?.currentUserRole === "OWNER";

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (filterStatus !== "ALL" && t.status !== filterStatus) return false;
      if (filterPriority !== "ALL" && t.priority !== filterPriority) return false;
      if (filterAssignee !== "ALL") {
        if (filterAssignee === "UNASSIGNED" && t.assigneeId) return false;
        if (filterAssignee !== "UNASSIGNED" && t.assigneeId !== filterAssignee) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = t.title.toLowerCase().includes(q);
        const matchDesc = t.description?.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc) return false;
      }
      return true;
    });
  }, [tasks, filterStatus, filterPriority, filterAssignee, searchQuery]);

  // Open Task Modal
  const handleOpenCreateTask = () => {
    setEditingTask(null);
    setTaskTitle("");
    setTaskDescription("");
    setTaskStatus("TODO");
    setTaskPriority("MEDIUM");
    setTaskDueDate("");
    setTaskAssigneeId("");
    setTaskFormError(null);
    setIsTaskModalOpen(true);
  };

  const handleOpenEditTask = (task: TaskItem) => {
    setEditingTask(task);
    setTaskTitle(task.title);
    setTaskDescription(task.description || "");
    setTaskStatus(task.status);
    setTaskPriority(task.priority);
    setTaskDueDate(task.dueDate ? task.dueDate.split("T")[0] : "");
    setTaskAssigneeId(task.assigneeId || "");
    setTaskFormError(null);
    setIsTaskModalOpen(true);
  };

  // Submit Task (Create or Update)
  const handleSubmitTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setTaskFormError(null);

    if (!taskTitle.trim()) {
      setTaskFormError("Task title is required");
      return;
    }

    try {
      setIsSubmittingTask(true);
      const payload = {
        title: taskTitle.trim(),
        description: taskDescription.trim() || null,
        status: taskStatus,
        priority: taskPriority,
        dueDate: taskDueDate ? new Date(taskDueDate).toISOString() : null,
        assigneeId: taskAssigneeId || null,
      };

      if (editingTask) {
        // Update task: PUT /api/tasks/:id
        const res = await fetch(`/api/tasks/${editingTask.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update task");

        setTasks((prev) => prev.map((t) => (t.id === editingTask.id ? data : t)));
      } else {
        // Create task: POST /api/teams/:id/tasks
        const res = await fetch(`/api/teams/${teamId}/tasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create task");

        setTasks((prev) => [data, ...prev]);
      }

      setIsTaskModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error saving task";
      setTaskFormError(msg);
    } finally {
      setIsSubmittingTask(false);
    }
  };

  // Quick Status change
  const handleQuickStatusChange = async (taskId: string, newStatus: TaskStatusType) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update status");
      }

      const updated = await res.json();
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error changing status";
      alert(msg);
    }
  };

  // Delete Task
  const handleDeleteTask = async (task: TaskItem) => {
    const canDelete =
      isOwner || task.creatorId === user?.id || task.assigneeId === user?.id;

    if (!canDelete) {
      alert("Only the task creator, assignee, or team Owner can delete this task.");
      return;
    }

    if (!confirm(`Are you sure you want to delete the task "${task.title}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete task");
      }

      setTasks((prev) => prev.filter((t) => t.id !== task.id));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error deleting task";
      alert(msg);
    }
  };

  // Invite Member
  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);

    if (!inviteEmail.trim()) {
      setInviteError("Email address is required");
      return;
    }

    try {
      setIsInviting(true);
      const res = await fetch(`/api/teams/${teamId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add member");

      setTeam((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          members: [...(prev.members || []), data],
        };
      });

      setInviteEmail("");
      setIsAddMemberModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error adding member";
      setInviteError(msg);
    } finally {
      setIsInviting(false);
    }
  };

  // Remove Member
  const handleRemoveMember = async (memberUserId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to remove ${memberName} from this team?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/teams/${teamId}/members/${memberUserId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove member");
      }

      setTeam((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          members: (prev.members || []).filter((m) => m.userId !== memberUserId),
        };
      });

      // Update tasks assignee locally if affected
      setTasks((prev) =>
        prev.map((t) => (t.assigneeId === memberUserId ? { ...t, assignee: null, assigneeId: null } : t))
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error removing member";
      alert(msg);
    }
  };

  // Update Team Info
  const handleUpdateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);

    if (!editName.trim()) {
      setEditError("Team name cannot be empty");
      return;
    }

    try {
      setIsSavingTeam(true);
      const res = await fetch(`/api/teams/${teamId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDesc.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update team");

      setTeam((prev) => (prev ? { ...prev, name: data.name, description: data.description } : data));
      setIsEditTeamModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error updating team";
      setEditError(msg);
    } finally {
      setIsSavingTeam(false);
    }
  };

  // Delete Team
  const handleDeleteTeam = async () => {
    if (!confirm(`Are you sure you want to delete "${team?.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/teams/${teamId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete team");
      }
      router.push("/teams");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error deleting team";
      alert(msg);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="py-20 text-center space-y-4">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
        <p className="text-sm text-zinc-500">Loading team workspace...</p>
      </div>
    );
  }

  // Error state
  if (error || !team) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 mx-auto flex items-center justify-center">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Workspace Error</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{error || "Team not found"}</p>
        <Link
          href="/teams"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 text-white text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Teams
        </Link>
      </div>
    );
  }

  // Task columns for Kanban
  const kanbanColumns: { status: TaskStatusType; label: string; color: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { status: "TODO", label: "To Do", color: "indigo", icon: Clock },
    { status: "IN_PROGRESS", label: "In Progress", color: "amber", icon: RefreshCw },
    { status: "DONE", label: "Done", color: "emerald", icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-6">
      {/* Back button & Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/teams"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to All Teams</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchTeamData()}
            className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            title="Refresh Workspace"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {isOwner && (
            <>
              <button
                onClick={() => setIsEditTeamModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Team</span>
              </button>
              <button
                onClick={handleDeleteTeam}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Team</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Team Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-950 to-purple-950 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {team.name}
              </h1>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  isOwner
                    ? "bg-amber-400/20 text-amber-300 border border-amber-400/30"
                    : "bg-white/10 text-zinc-200 border border-white/20"
                }`}
              >
                {isOwner ? <Crown className="w-3 h-3 text-amber-400" /> : <Shield className="w-3 h-3" />}
                {isOwner ? "Owner" : "Member"}
              </span>
            </div>
            <p className="text-sm text-indigo-200/90 max-w-2xl">
              {team.description || "No description provided for this team."}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenCreateTask}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-indigo-900 hover:bg-indigo-50 font-semibold text-xs tracking-wide shadow-md transition"
            >
              <Plus className="w-4 h-4" />
              <span>New Task</span>
            </button>
            {isOwner && (
              <button
                onClick={() => setIsAddMemberModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-800/80 hover:bg-indigo-800 text-white border border-indigo-700/80 font-semibold text-xs tracking-wide transition"
              >
                <UserPlus className="w-4 h-4" />
                <span>Add Member</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Stats bar */}
        <div className="mt-6 pt-4 border-t border-indigo-800/60 flex flex-wrap items-center gap-6 text-xs text-indigo-200">
          <div>
            Owner: <strong className="text-white">{team.owner?.name || "N/A"}</strong>
          </div>
          <div>
            Members: <strong className="text-white">{team.members?.length || 1}</strong>
          </div>
          <div>
            Total Tasks: <strong className="text-white">{tasks.length}</strong>
          </div>
          <div>
            Completed: <strong className="text-emerald-300">{tasks.filter((t) => t.status === "DONE").length}</strong>
          </div>
        </div>
      </div>

      {/* Workspace Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("board")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
              activeTab === "board"
                ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300"
                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            }`}
          >
            <FolderGit2 className="w-4 h-4" />
            <span>Tasks & Delivery</span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
              {filteredTasks.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("members")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
              activeTab === "members"
                ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300"
                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Team Members</span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
              {team.members?.length || 1}
            </span>
          </button>
        </div>

        {activeTab === "board" && (
          <div className="hidden sm:flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl">
            <button
              onClick={() => setViewMode("kanban")}
              className={`p-1.5 rounded-lg text-xs font-medium transition ${
                viewMode === "kanban"
                  ? "bg-white dark:bg-zinc-900 text-indigo-600 shadow-xs"
                  : "text-zinc-500 hover:text-zinc-800"
              }`}
              title="Kanban Board View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-lg text-xs font-medium transition ${
                viewMode === "table"
                  ? "bg-white dark:bg-zinc-900 text-indigo-600 shadow-xs"
                  : "text-zinc-500 hover:text-zinc-800"
              }`}
              title="Table List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* TAB 1: BOARD / TASKS VIEW                               */}
      {/* ======================================================== */}
      {activeTab === "board" && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks by title or keyword..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Filter Selects */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Filters:</span>
              </div>

              {/* Status filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-medium focus:outline-none"
              >
                <option value="ALL">All Status</option>
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="DONE">Done</option>
              </select>

              {/* Priority filter */}
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-medium focus:outline-none"
              >
                <option value="ALL">All Priority</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>

              {/* Assignee filter */}
              <select
                value={filterAssignee}
                onChange={(e) => setFilterAssignee(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-medium focus:outline-none"
              >
                <option value="ALL">All Assignees</option>
                <option value="UNASSIGNED">Unassigned</option>
                {team.members?.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.user.name}
                  </option>
                ))}
              </select>

              {(searchQuery || filterStatus !== "ALL" || filterPriority !== "ALL" || filterAssignee !== "ALL") && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setFilterStatus("ALL");
                    setFilterPriority("ALL");
                    setFilterAssignee("ALL");
                  }}
                  className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:underline"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Kanban Columns */}
          {viewMode === "kanban" ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              {kanbanColumns.map((col) => {
                const colTasks = filteredTasks.filter((t) => t.status === col.status);
                const Icon = col.icon;
                return (
                  <div
                    key={col.status}
                    className="flex flex-col rounded-2xl bg-zinc-100/70 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80 p-4 min-h-[500px]"
                  >
                    {/* Column Header */}
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-200/80 dark:border-zinc-800">
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${
                          col.status === "DONE"
                            ? "text-emerald-500"
                            : col.status === "IN_PROGRESS"
                            ? "text-amber-500"
                            : "text-indigo-500"
                        }`} />
                        <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                          {col.label}
                        </h3>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 shadow-2xs">
                        {colTasks.length}
                      </span>
                    </div>

                    {/* Column Cards */}
                    <div className="space-y-3 flex-1">
                      {colTasks.length === 0 ? (
                        <div className="py-12 text-center text-xs text-zinc-400">
                          No tasks in {col.label.toLowerCase()}
                        </div>
                      ) : (
                        colTasks.map((task) => {
                          const canDelete =
                            isOwner || task.creatorId === user?.id || task.assigneeId === user?.id;

                          return (
                            <div
                              key={task.id}
                              className="group p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-800 transition duration-150 space-y-3"
                            >
                              {/* Card Top: Priority & Controls */}
                              <div className="flex items-center justify-between gap-2">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide ${
                                    task.priority === "HIGH"
                                      ? "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900"
                                      : task.priority === "MEDIUM"
                                      ? "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900"
                                      : "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-900"
                                  }`}
                                >
                                  {task.priority}
                                </span>

                                <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                                  <button
                                    onClick={() => handleOpenEditTask(task)}
                                    className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                                    title="Edit Task"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  {canDelete && (
                                    <button
                                      onClick={() => handleDeleteTask(task)}
                                      className="p-1 rounded text-zinc-400 hover:text-rose-600 transition"
                                      title="Delete Task"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Title & Description */}
                              <div>
                                <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 leading-snug">
                                  {task.title}
                                </h4>
                                {task.description && (
                                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">
                                    {task.description}
                                  </p>
                                )}
                              </div>

                              {/* Card Meta: Due date & Assignee */}
                              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500">
                                {task.dueDate ? (
                                  <div className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400">
                                    <Calendar className="w-3 h-3" />
                                    <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                                  </div>
                                ) : (
                                  <span>No deadline</span>
                                )}

                                <div className="flex items-center gap-1.5">
                                  {task.assignee ? (
                                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-[10px] font-medium text-zinc-700 dark:text-zinc-300">
                                      <div className="w-3.5 h-3.5 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-[8px]">
                                        {task.assignee.name.charAt(0).toUpperCase()}
                                      </div>
                                      <span className="max-w-[70px] truncate">{task.assignee.name}</span>
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-zinc-400">Unassigned</span>
                                  )}
                                </div>
                              </div>

                              {/* Quick Move Status Buttons */}
                              <div className="flex items-center gap-1 pt-1">
                                {col.status !== "TODO" && (
                                  <button
                                    onClick={() => handleQuickStatusChange(task.id, "TODO")}
                                    className="flex-1 py-1 rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-indigo-50 hover:text-indigo-600 text-[10px] font-medium transition text-center"
                                  >
                                    To Do
                                  </button>
                                )}
                                {col.status !== "IN_PROGRESS" && (
                                  <button
                                    onClick={() => handleQuickStatusChange(task.id, "IN_PROGRESS")}
                                    className="flex-1 py-1 rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-amber-50 hover:text-amber-600 text-[10px] font-medium transition text-center"
                                  >
                                    In Progress
                                  </button>
                                )}
                                {col.status !== "DONE" && (
                                  <button
                                    onClick={() => handleQuickStatusChange(task.id, "DONE")}
                                    className="flex-1 py-1 rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-emerald-50 hover:text-emerald-600 text-[10px] font-medium transition text-center"
                                  >
                                    Done
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Table View */
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 uppercase tracking-wider text-zinc-500 font-semibold">
                  <tr>
                    <th className="px-4 py-3">Task Title</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Priority</th>
                    <th className="px-4 py-3">Assignee</th>
                    <th className="px-4 py-3">Due Date</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                  {filteredTasks.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-zinc-400">
                        No tasks matching the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredTasks.map((t) => {
                      const canDelete =
                        isOwner || t.creatorId === user?.id || t.assigneeId === user?.id;

                      return (
                        <tr key={t.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40">
                          <td className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-100">
                            <div>{t.title}</div>
                            {t.description && (
                              <div className="text-[11px] text-zinc-500 font-normal line-clamp-1">{t.description}</div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={t.status}
                              onChange={(e) => handleQuickStatusChange(t.id, e.target.value as TaskStatusType)}
                              className="px-2 py-1 rounded-md text-[11px] font-semibold bg-zinc-100 dark:bg-zinc-800 border-none cursor-pointer"
                            >
                              <option value="TODO">To Do</option>
                              <option value="IN_PROGRESS">In Progress</option>
                              <option value="DONE">Done</option>
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                t.priority === "HIGH"
                                  ? "text-rose-600 bg-rose-50 dark:bg-rose-950/60"
                                  : t.priority === "MEDIUM"
                                  ? "text-amber-600 bg-amber-50 dark:bg-amber-950/60"
                                  : "text-blue-600 bg-blue-50 dark:bg-blue-950/60"
                              }`}
                            >
                              {t.priority}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                            {t.assignee?.name || <span className="text-zinc-400 italic">Unassigned</span>}
                          </td>
                          <td className="px-4 py-3 text-zinc-500">
                            {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "-"}
                          </td>
                          <td className="px-4 py-3 text-right space-x-1">
                            <button
                              onClick={() => handleOpenEditTask(t)}
                              className="p-1 rounded text-zinc-400 hover:text-zinc-700"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {canDelete && (
                              <button
                                onClick={() => handleDeleteTask(t)}
                                className="p-1 rounded text-zinc-400 hover:text-rose-600"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: TEAM MEMBERS VIEW                                */}
      {/* ======================================================== */}
      {activeTab === "members" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                Team Members & Collaborators
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Manage roles and invite colleagues to work on this team
              </p>
            </div>

            {isOwner && (
              <button
                onClick={() => setIsAddMemberModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs shadow-sm transition"
              >
                <UserPlus className="w-4 h-4" />
                <span>Add Member by Email</span>
              </button>
            )}
          </div>

          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 uppercase tracking-wider text-zinc-500 font-semibold">
                <tr>
                  <th className="px-4 py-3.5">User</th>
                  <th className="px-4 py-3.5">Email</th>
                  <th className="px-4 py-3.5">Role</th>
                  <th className="px-4 py-3.5">Joined Date</th>
                  {isOwner && <th className="px-4 py-3.5 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                {team.members?.map((member: TeamMemberItem) => {
                  const isMemberOwner = member.userId === team.ownerId || member.role === "OWNER";
                  return (
                    <tr key={member.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold text-xs">
                            {member.user.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                            {member.user.name} {member.userId === user?.id && "(You)"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-zinc-600 dark:text-zinc-400">
                        {member.user.email}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            isMemberOwner
                              ? "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900"
                              : "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900"
                          }`}
                        >
                          {isMemberOwner ? <Crown className="w-3 h-3 text-amber-500" /> : <Shield className="w-3 h-3" />}
                          {isMemberOwner ? "Owner" : "Member"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-zinc-500">
                        {new Date(member.joinedAt).toLocaleDateString()}
                      </td>
                      {isOwner && (
                        <td className="px-4 py-3.5 text-right">
                          {!isMemberOwner ? (
                            <button
                              onClick={() => handleRemoveMember(member.userId, member.user.name)}
                              className="px-2.5 py-1 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                            >
                              Remove
                            </button>
                          ) : (
                            <span className="text-zinc-400 italic text-[11px]">Primary Owner</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CREATE / EDIT TASK                                */}
      {/* ======================================================== */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                {editingTask ? "Update Task" : "Create New Task"}
              </h3>
              <button
                onClick={() => setIsTaskModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {taskFormError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-start gap-2 text-xs text-rose-700 dark:text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{taskFormError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g. Implement user authentication API"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  placeholder="Provide context, acceptance criteria or details..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                    Status
                  </label>
                  <select
                    value={taskStatus}
                    onChange={(e) => setTaskStatus(e.target.value as TaskStatusType)}
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm focus:outline-none"
                  >
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="DONE">Done</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                    Priority
                  </label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as TaskPriorityType)}
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm focus:outline-none"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                    Assignee
                  </label>
                  <select
                    value={taskAssigneeId}
                    onChange={(e) => setTaskAssigneeId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm focus:outline-none"
                  >
                    <option value="">Unassigned</option>
                    {team.members?.map((m) => (
                      <option key={m.userId} value={m.userId}>
                        {m.user.name} ({m.user.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium rounded-xl text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTask}
                  className="px-5 py-2 text-sm font-medium rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition disabled:opacity-50"
                >
                  {isSubmittingTask ? "Saving..." : editingTask ? "Save Changes" : "Create Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ADD MEMBER BY EMAIL                               */}
      {/* ======================================================== */}
      {isAddMemberModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                  Add Team Member
                </h3>
              </div>
              <button
                onClick={() => setIsAddMemberModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {inviteError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-start gap-2 text-xs text-rose-700 dark:text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{inviteError}</span>
              </div>
            )}

            <form onSubmit={handleInviteMember} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                  Member Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="mt-1 text-[11px] text-zinc-500">
                  The user must already have a registered account on TaskFlow.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as "MEMBER" | "ADMIN")}
                  className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm focus:outline-none"
                >
                  <option value="MEMBER">Member (Can create & update tasks)</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddMemberModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium rounded-xl text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isInviting}
                  className="px-5 py-2 text-sm font-medium rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition disabled:opacity-50"
                >
                  {isInviting ? "Adding..." : "Add to Team"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: EDIT TEAM DETAILS (OWNER ONLY)                    */}
      {/* ======================================================== */}
      {isEditTeamModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                Edit Team Information
              </h3>
              <button
                onClick={() => setIsEditTeamModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-start gap-2 text-xs text-rose-700 dark:text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateTeam} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                  Team Name *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditTeamModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium rounded-xl text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingTeam}
                  className="px-5 py-2 text-sm font-medium rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition disabled:opacity-50"
                >
                  {isSavingTeam ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
