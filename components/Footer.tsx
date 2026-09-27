import { CheckSquare } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-xs">
            <CheckSquare className="w-3.5 h-3.5 stroke-[2.5]" />
          </div>
          <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
            TaskFlow App
          </span>
          <span className="text-xs text-zinc-500">
            • Assignment 1: Setup, Prisma & Deployment
          </span>
        </div>

        <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
          Built with Next.js, Prisma & Supabase
        </p>
      </div>
    </footer>
  );
}
