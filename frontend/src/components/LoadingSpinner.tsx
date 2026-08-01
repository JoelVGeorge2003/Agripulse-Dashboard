interface LoadingSpinnerProps {
  label?: string;
}

export function LoadingSpinner({ label = "Loading data" }: LoadingSpinnerProps) {
  return (
    <div className="state-panel" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <p>{label}…</p>
    </div>
  );
}
