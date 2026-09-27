"use client";

import { TaskItem, TaskStatusType } from "@/types/task";
import { 
  Calendar, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  Clock, 
  AlertCircle
} from "lucide-react";
import { useState } from "react";

interface TaskCardProps {
  task: TaskItem;
  onEdit: (task: TaskItem) => void;
  onDelete: (id: string) => Promise<void>;
  onStatusChange: (id: string, newStatus: TaskStatusType) => Promise<void>;
}

export default function TaskCard({
  task,
  onEdit,
  onDelete,
  onStatusChange,
}: TaskCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete task "${task.title}"?`)) {
      try {
        setIsDeleting(true);
        await onDelete(task.id);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleToggleStatus = async () => {
    try {
      setIsUpdatingStatus(true);
      const nextStatus: TaskStatusType = 
        task.status === "DONE" ? "TODO" : "DONE";
      await onStatusChange(task.id, nextStatus);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Badge Status Styles
  const getStatusBadge = (status: TaskStatusType) => {
    switch (status) {
      case "DONE":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Done
          </span>
        );
      case "IN_PROGRESS":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
            <Clock className="w-3.5 h-3.5" />
            In Progress
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <AlertCircle className="w-3.5 h-3.5" />
            To Do
          </span>
        );
    }
  };

  // Badge Priority Styles
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "HIGH":
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
            High
          </span>
        );
      case "MEDIUM":
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            Medium
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300">
            Low
          </span>
        );
    }
  };

  const formattedDueDate = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div className={`group relative bg-white dark:bg-zinc-900 border rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between ${
      task.status === "DONE" 
        ? "border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/40 opacity-90" 
        : "border-zinc-200 dark:border-zinc-800 hover:border-indigo-300 dark:hover:border-indigo-700"
    }`}>
      <div>
        {/* Top Badges & Actions */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            {getStatusBadge(task.status)}
            {getPriorityBadge(task.priority)}
          </div>

          <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(task)}
              className="p-1.5 text-zinc-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-zinc-800 dark:hover:text-indigo-400 rounded-md transition"
              title="Edit task"
              aria-label="Edit task"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="p-1.5 text-zinc-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-zinc-800 dark:hover:text-rose-400 rounded-md transition disabled:opacity-50"
              title="Delete task"
              aria-label="Delete task"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Title */}
        <h3 className={`text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-2 leading-snug ${
          task.status === "DONE" ? "line-through text-zinc-500 dark:text-zinc-400" : ""
        }`}>
          {task.title}
        </h3>

        {/* Description */}
        {task.description && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-3 mb-4 whitespace-pre-line leading-relaxed">
            {task.description}
          </p>
        )}
      </div>

      {/* Bottom info */}
      <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 mt-2">
        <div className="flex items-center gap-1.5">
          {formattedDueDate ? (
            <>
              <Calendar className="w-3.5 h-3.5" />
              <span>Due {formattedDueDate}</span>
            </>
          ) : (
            <span>No deadline</span>
          )}
        </div>

        <button
          onClick={handleToggleStatus}
          disabled={isUpdatingStatus}
          className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-50"
        >
          {task.status === "DONE" ? "Mark To Do" : "Mark as Done"}
        </button>
      </div>
    </div>
  );
}
