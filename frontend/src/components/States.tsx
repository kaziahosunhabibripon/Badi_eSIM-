export function LoadingState({ text = "Loading..." }: { text?: string }) {
  return <p className="state loading">{text}</p>;
}

export function ErrorState({
  message = "Unable to load data.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="state error">
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="btn btn-secondary" onClick={onRetry}>
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
    <div className="state empty">
      <p>{message}</p>
      {action && <div className="empty-action">{action}</div>}
    </div>
  );
}
