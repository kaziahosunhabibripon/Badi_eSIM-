export function ConnectionIndicator({
  state,
}: {
  state: "live" | "reconnecting" | "offline";
}) {
  const labels = {
    live: "Live",
    reconnecting: "Reconnecting...",
    offline: "Offline",
  };

  return (
    <span className={`connection-indicator connection-${state}`} aria-live="polite">
      {labels[state]}
    </span>
  );
}
