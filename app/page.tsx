"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TaskItem, TaskFormData, TaskStatusType } from "@/types/task";
import TaskCard from "@/components/TaskCard";
import TaskModal from "@/components/TaskModal";
import { useAuth } from "@/lib/AuthContext";
import {
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Layers,
  Sparkles,
  RefreshCw,
  Users,
  Shield,
  ArrowRight,
  LogIn,
  UserPlus,
  Crown,
  Kanban
} from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const { user } = useAuth();

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search states
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);

  // Fetch tasks from API
  const fetchTasks = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch("/api/tasks");
      if (!res.ok) {
        throw new Error("Failed to load tasks from server.");
      }
      const data = await res.json();
      setTasks(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Error connecting to server.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function loadInitialTasks() {
      try {
        const res = await fetch("/api/tasks");
        if (!res.ok) {
          throw new Error("Failed to load tasks from server.");
        }
        const data = await res.json();
        if (!ignore) {
          setTasks(data);
          setError(null);
        }
      } catch (err: unknown) {
        if (!ignore) {
          if (err instanceof Error) {
            setError(err.message);
          } else {
            setError("Error connecting to server.");
          }
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }
    loadInitialTasks();
    return () => {
      ignore = true;
    };
  }, []);

  // Create or Update task
  const handleSaveTask = async (data: TaskFormData, id?: string) => {
    if (!user) {
      router.push("/login");
      return;
    }

    if (id) {
      // Update
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to update task.");
      }
      const updated = await res.json();
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
    } else {
      // Create
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to create task.");
      }
      const created = await res.json();
      setTasks((prev) => [created, ...prev]);
    }
  };

  // Delete task
  const handleDeleteTask = async (id: string) => {
    if (!user) {
      router.push("/login");
      return;
    }

    const res = await fetch(`/api/tasks/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const errorData = await res.json();
      alert(errorData.error || "Failed to delete task.");
      return;
    }
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  // Quick Status change
  const handleStatusChange = async (id: string, newStatus: TaskStatusType) => {
    if (!user) {
      router.push("/login");
      return;
    }

    const res = await fetch(`/api/tasks/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (!res.ok) {
      const errorData = await res.json();
      alert(errorData.error || "Failed to update status.");
      return;
    }
    const updated = await res.json();
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
  };

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesStatus =
        selectedStatus === "ALL" || task.status === selectedStatus;
      const matchesSearch =
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.description &&
          task.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesStatus && matchesSearch;
    });
  }, [tasks, selectedStatus, searchQuery]);

  // Statistics counters
  const stats = useMemo(() => {
    return {
      total: tasks.length,
      todo: tasks.filter((t) => t.status === "TODO").length,
      inProgress: tasks.filter((t) => t.status === "IN_PROGRESS").length,
      done: tasks.filter((t) => t.status === "DONE").length,
    };
  }, [tasks]);

  return (
    <div className="space-y-10">
      {/* Hero & Intro Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-indigo-950 to-zinc-950 text-white p-8 sm:p-10 shadow-xl border border-indigo-800/40">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-indigo-200 backdrop-blur-sm border border-white/15 mb-4">
            <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
            <span>TaskFlow v2.0 – Task & Team Management Platform</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight mb-4">
            {user ? (
              <>Welcome back, <span className="text-indigo-300">{user.name}</span>!</>
            ) : (
              "Organize work, boost productivity, and lead your team."
            )}
          </h1>

          <p className="text-base sm:text-lg text-indigo-100/80 mb-6 leading-relaxed">
            {user ? (
              "Access your team workspaces, delegate tasks to members, track real-time delivery with Kanban boards, and manage team permissions seamlessly."
            ) : (
              "A full-stack collaboration hub featuring User Authentication, Team Management with Owner/Member roles, and Kanban Task tracking with PostgreSQL & Prisma."
            )}
          </p>

          <div className="flex flex-wrap items-center gap-3">
            {user ? (
              <>
                <Link
                  href="/teams"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-indigo-950 font-semibold text-sm hover:bg-indigo-50 transition shadow-lg shadow-black/20"
                >
                  <Users className="w-4 h-4" />
                  <span>Go to My Teams</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <button
                  onClick={() => {
                    setEditingTask(null);
                    setIsModalOpen(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Task</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-indigo-950 font-semibold text-sm hover:bg-indigo-50 transition shadow-lg shadow-black/20"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Register Free</span>
                </Link>
                <Link
                  href="/teams"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-medium transition backdrop-blur-sm border border-white/10"
                >
                  <span>Explore Teams</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Background decorative circles */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />
      </section>

      {/* Feature Showcase Grid (Highlights Assignment 2 requirements) */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
            <Shield className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-base text-zinc-900 dark:text-white mb-1.5">
            JWT Authentication & Security
          </h3>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Secure self-registration, credential login with bcrypt-hashed passwords, and HTTP-only JWT cookies for seamless sessions.
          </p>
        </div>

        <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
            <Crown className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-base text-zinc-900 dark:text-white mb-1.5">
            Team Model & Role Permissions
          </h3>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Create teams as Owner, add members by email, remove collaborators, and switch between multi-project workspaces easily.
          </p>
        </div>

        <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-4">
            <Kanban className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-base text-zinc-900 dark:text-white mb-1.5">
            Kanban Board & CRUD Tasks
          </h3>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Organize tasks into To Do, In Progress, and Done. Assign team members, set due dates, priorities, and enforce creator-only deletion.
          </p>
        </div>
      </section>

      {/* Metrics Row */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{stats.total}</div>
            <div className="text-xs font-medium text-zinc-500">Total Tasks</div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-amber-600">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{stats.todo}</div>
            <div className="text-xs font-medium text-zinc-500">To Do</div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/40 flex items-center justify-center text-sky-600">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{stats.inProgress}</div>
            <div className="text-xs font-medium text-zinc-500">In Progress</div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{stats.done}</div>
            <div className="text-xs font-medium text-zinc-500">Completed</div>
          </div>
        </div>
      </section>

      {/* Control Bar: Filters & Search */}
      <section className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Status filter tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-x-auto">
          {[
            { label: "All", value: "ALL" },
            { label: "To Do", value: "TODO" },
            { label: "In Progress", value: "IN_PROGRESS" },
            { label: "Done", value: "DONE" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setSelectedStatus(tab.value)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
                selectedStatus === tab.value
                  ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input & Action */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <button
            onClick={fetchTasks}
            className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            title="Refresh tasks"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-indigo-600" : ""}`} />
          </button>
        </div>
      </section>

      {/* Tasks List / Grid */}
      <section>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-44 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 animate-pulse p-5"
              />
            ))}
          </div>
        ) : error ? (
          <div className="p-8 text-center rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400">
            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
            <p className="font-semibold text-sm mb-1">{error}</p>
            <p className="text-xs text-rose-500 mb-4">Please make sure DATABASE_URL is configured properly.</p>
            <button
              onClick={fetchTasks}
              className="px-4 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition"
            >
              Try Again
            </button>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-50 dark:bg-zinc-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-3">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-zinc-800 dark:text-zinc-200 mb-1">
              No tasks found
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto mb-4">
              {searchQuery || selectedStatus !== "ALL"
                ? "No tasks match your current filters. Try resetting the search or filter."
                : "Your task list is empty. Click the button below to add your first task!"}
            </p>
            <button
              onClick={() => {
                if (!user) {
                  router.push("/login");
                  return;
                }
                setEditingTask(null);
                setIsModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Create Task</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onEdit={(t) => {
                  if (!user) {
                    router.push("/login");
                    return;
                  }
                  setEditingTask(t);
                  setIsModalOpen(true);
                }}
                onDelete={handleDeleteTask}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        )}
      </section>

      {/* Task Modal for Create / Edit */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTask(null);
        }}
        onSubmit={handleSaveTask}
        initialData={editingTask}
      />
    </div>
  );
}
