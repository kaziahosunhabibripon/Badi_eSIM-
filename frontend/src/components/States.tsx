import { Loader2 } from "lucide-react";

export function LoadingState({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-slate-500">
      <Loader2 className="size-4 animate-spin" aria-hidden />
      <span>{text}</span>
    </div>
  );
}

export function ErrorState({
  message = "Unable to load data.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-600 text-lg">
        !
      </div>
      <p className="text-sm text-slate-700">{message}</p>
      {onRetry && (
        <button type="button" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  message = "No tickets found.",
  action,
}: {
  message?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </div>
      <p className="text-sm text-slate-500">{message}</p>
      {action && <div>{action}</div>}
    </div>
  );
}
