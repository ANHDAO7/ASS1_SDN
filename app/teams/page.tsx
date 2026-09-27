import Link from "next/link";
import { Users, ArrowLeft, Sparkles, Shield, UserPlus } from "lucide-react";

export default function TeamsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center">
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 mb-6">
        <Sparkles className="w-3.5 h-3.5" />
        Assignment 2 Feature
      </div>

      <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-xl shadow-indigo-500/25 mb-8">
        <Users className="w-10 h-10" />
      </div>

      <h1 className="text-3xl sm:text-4xl font-extrabold text-zinc-900 dark:text-white tracking-tight mb-4">
        Teams & Collaborations – Coming Soon
      </h1>

      <p className="max-w-xl mx-auto text-base text-zinc-600 dark:text-zinc-400 mb-10 leading-relaxed">
        The team collaboration module is currently under development for Assignment 2. You will be able to invite teammates, assign roles, and manage permissions seamlessly.
      </p>

      {/* Feature Preview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto mb-10 text-left">
        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50">
          <div className="flex items-center gap-2.5 font-semibold text-sm text-zinc-900 dark:text-zinc-100 mb-1">
            <UserPlus className="w-4 h-4 text-indigo-600" />
            <span>Member Invitations</span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Invite colleagues by email and organize them into specialized project squads.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50">
          <div className="flex items-center gap-2.5 font-semibold text-sm text-zinc-900 dark:text-zinc-100 mb-1">
            <Shield className="w-4 h-4 text-indigo-600" />
            <span>Role-Based Access</span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Fine-grained roles (Owner, Admin, Member) to protect sensitive workflows.
          </p>
        </div>
      </div>

      <Link
        href="/"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-medium text-sm hover:opacity-90 transition shadow-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Homepage</span>
      </Link>
    </div>
  );
}
