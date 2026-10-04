"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { TeamItem } from "@/types/task";
import {
  Users,
  Plus,
  ArrowRight,
  Shield,
  Layers,
  Crown,
  Trash2,
  AlertCircle,
  RefreshCw,
  FolderGit2,
  LogIn,
  CheckCircle2,
  X
} from "lucide-react";

export default function TeamsPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();

  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamDescription, setNewTeamDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchTeams = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch("/api/teams");
      if (!res.ok) {
        if (res.status === 401) {
          setTeams([]);
          return;
        }
        throw new Error("Failed to fetch teams.");
      }
      const data = await res.json();
      setTeams(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error fetching teams";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function loadTeams() {
      if (isAuthLoading) return;
      if (!user) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await fetch("/api/teams");
        if (res.ok) {
          const data = await res.json();
          if (!ignore) {
            setTeams(data);
            setError(null);
          }
        } else if (res.status === 401) {
          if (!ignore) setTeams([]);
        } else {
          throw new Error("Failed to fetch teams.");
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Error fetching teams");
        }
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }
    loadTeams();
    return () => {
      ignore = true;
    };
  }, [user, isAuthLoading]);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!newTeamName.trim()) {
      setFormError("Team name is required");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTeamName.trim(),
          description: newTeamDescription.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create team");
      }

      setTeams((prev) => [data, ...prev]);
      setNewTeamName("");
      setNewTeamDescription("");
      setIsCreateModalOpen(false);
      router.push(`/teams/${data.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error creating team";
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTeam = async (teamId: string, teamName: string) => {
    if (!confirm(`Are you sure you want to delete the team "${teamName}"? All its tasks and members will be removed.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/teams/${teamId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete team");
      }

      setTeams((prev) => prev.filter((t) => t.id !== teamId));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error deleting team";
      alert(msg);
    }
  };

  // Nếu chưa đăng nhập: Hiển thị giao diện đăng nhập yêu cầu
  if (!isAuthLoading && !user) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center mb-6">
          <Users className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-3">
          Sign In to Access Teams
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 mb-8 max-w-md mx-auto text-sm leading-relaxed">
          Team collaboration, member management, and task assignments require an active account. Please sign in or register to continue.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/login"
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-sm transition"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In</span>
          </Link>
          <Link
            href="/register"
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-medium text-sm transition"
          >
            Create an Account
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
              My Teams & Workspaces
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
              {teams.length}
            </span>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Collaborate with teammates, delegate tasks, and monitor delivery progress
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchTeams()}
            disabled={isLoading}
            className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            title="Refresh Teams"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-indigo-600" : ""}`} />
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm shadow-sm transition shadow-indigo-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Create Team</span>
          </button>
        </div>
      </div>

      {/* Error notification */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-center justify-between text-sm text-rose-700 dark:text-rose-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => fetchTeams()}
            className="text-xs font-semibold underline hover:no-underline"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 animate-pulse space-y-4"
            >
              <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded-md w-3/4"></div>
              <div className="h-4 bg-zinc-100 dark:bg-zinc-800/60 rounded-md w-full"></div>
              <div className="h-4 bg-zinc-100 dark:bg-zinc-800/60 rounded-md w-1/2"></div>
              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-20"></div>
                <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded-lg w-24"></div>
              </div>
            </div>
          ))}
        </div>
      ) : teams.length === 0 ? (
        /* Empty State */
        <div className="p-12 text-center rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/20 max-w-xl mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center mb-4">
            <FolderGit2 className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">
            No Teams Found
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6 max-w-sm mx-auto">
            You don&apos;t belong to any team yet. Create your first team to start assigning and managing tasks!
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create Your First Team</span>
          </button>
        </div>
      ) : (
        /* Team Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team) => {
            const isOwner = team.ownerId === user?.id || team.currentUserRole === "OWNER";
            return (
              <div
                key={team.id}
                className="group relative flex flex-col justify-between p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:shadow-lg hover:border-indigo-300 dark:hover:border-indigo-900/70 transition duration-200"
              >
                <div>
                  {/* Top Bar: Role badge & Actions */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        isOwner
                          ? "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                          : "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                      }`}
                    >
                      {isOwner ? (
                        <>
                          <Crown className="w-3.5 h-3.5 text-amber-500" />
                          Owner
                        </>
                      ) : (
                        <>
                          <Shield className="w-3.5 h-3.5 text-indigo-500" />
                          Member
                        </>
                      )}
                    </span>

                    {isOwner && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTeam(team.id, team.name);
                        }}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                        title="Delete Team"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Team Title & Description */}
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition mb-2">
                    {team.name}
                  </h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 min-h-[40px] mb-4">
                    {team.description || "No description provided."}
                  </p>
                </div>

                {/* Bottom Meta & Action */}
                <div>
                  <div className="flex items-center gap-4 py-3 border-t border-zinc-100 dark:border-zinc-800 text-xs text-zinc-500 dark:text-zinc-400 mb-4">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-indigo-500" />
                      <span>{team._count?.members || team.members?.length || 1} members</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-purple-500" />
                      <span>{team._count?.tasks ?? (team.tasks?.length || 0)} tasks</span>
                    </div>
                  </div>

                  <Link
                    href={`/teams/${team.id}`}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 text-zinc-900 dark:text-zinc-100 font-semibold text-xs tracking-wide transition shadow-sm"
                  >
                    <span>Open Team Workspace</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Create Team */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                  Create a New Team
                </h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-start gap-2 text-xs text-rose-700 dark:text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                  Team Name *
                </label>
                <input
                  type="text"
                  required
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="e.g. Frontend Engineering, Product Design"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                  Description (Optional)
                </label>
                <textarea
                  rows={3}
                  value={newTeamDescription}
                  onChange={(e) => setNewTeamDescription(e.target.value)}
                  placeholder="Briefly describe the team's objectives or scope..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>

              <div className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 text-xs text-zinc-600 dark:text-zinc-400 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <span>You will automatically become the <strong>Owner</strong> of this team and can invite teammates right after creation.</span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium rounded-xl text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-sm font-medium rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition disabled:opacity-50"
                >
                  {isSubmitting ? "Creating..." : "Create Team"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
