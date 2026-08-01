import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void | Promise<void>;
}

export function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <div className="state-panel state-panel-error" role="alert">
      <AlertTriangle size={24} />
      <div>
        <strong>We could not load this data</strong>
        <p>{message}</p>
      </div>
      {onRetry && (
        <button className="button button-secondary" onClick={() => void onRetry()}>
          <RefreshCw size={15} /> Retry
        </button>
      )}
    </div>
  );
}
