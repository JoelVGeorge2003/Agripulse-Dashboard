import { BarChart3, Bot, DatabaseZap, LayoutDashboard, Leaf } from "lucide-react";
import { NavLink } from "react-router-dom";
import { classNames } from "@/utils/classNames";

const links = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/commodities", label: "Commodities", icon: BarChart3 },
  { to: "/analyst", label: "AI Analyst", icon: Bot },
  { to: "/manage", label: "Data Manager", icon: DatabaseZap }
];

export function Sidebar() {
  return (
    <aside className="sidebar">
      <NavLink to="/" className="sidebar-brand" aria-label="AgriPulse dashboard">
        <span className="brand-icon"><Leaf size={21} /></span>
        <span>
          <strong>AgriPulse</strong>
          <small>Market & production</small>
        </span>
      </NavLink>

      <nav className="sidebar-nav" aria-label="Primary navigation">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => classNames("sidebar-link", isActive && "active")}
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-note">
        <span className="sidebar-note-dot" />
        <div>
          <strong>Source-aware</strong>
          <p>Observation dates and units stay visible across the app.</p>
        </div>
      </div>
    </aside>
  );
}
