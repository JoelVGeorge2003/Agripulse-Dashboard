import { SearchX } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  message?: string;
}

export function EmptyState({
  title = "No matching data",
  message = "Try changing your search or filters."
}: EmptyStateProps) {
  return (
    <div className="state-panel">
      <SearchX size={25} />
      <div>
        <strong>{title}</strong>
        <p>{message}</p>
      </div>
    </div>
  );
}
