import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <section className="not-found panel">
      <span>404</span>
      <h2>This field is outside the mapped area.</h2>
      <p>The page you requested does not exist.</p>
      <Link to="/" className="button button-primary"><ArrowLeft size={15} /> Return to dashboard</Link>
    </section>
  );
}
