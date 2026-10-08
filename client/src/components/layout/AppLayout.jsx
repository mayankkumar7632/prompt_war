import React from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  BookOpenText,
  ClipboardList,
  CircleUserRound,
  House,
  Lightbulb,
  LogOut,
  Menu,
  UsersRound,
  X,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "../../app/AuthContext.jsx";

const links = [
  { to: "/parent-dashboard", label: "Dashboard", icon: House, roles: ["parent"] },
  { to: "/parent-children", label: "Children", icon: UsersRound, roles: ["parent"] },
  { to: "/parent-growth", label: "Growth", icon: ClipboardList, roles: ["parent"] },
  { to: "/parent-recommendations", label: "Recommendations", icon: Lightbulb, roles: ["parent"] },
  { to: "/profile", label: "Profile", icon: CircleUserRound, roles: ["parent"] },
  { to: "/teacher-dashboard", label: "Dashboard", icon: House, roles: ["teacher"] },
  { to: "/teacher-students", label: "Students", icon: UsersRound, roles: ["teacher"] },
  { to: "/teacher-growth", label: "Class growth", icon: ClipboardList, roles: ["teacher"] },
  { to: "/teacher-topics", label: "Topics", icon: BookOpenText, roles: ["teacher"] },
  { to: "/teacher-recommendations", label: "Recommendations", icon: Lightbulb, roles: ["teacher"] },
  { to: "/profile", label: "Profile", icon: CircleUserRound, roles: ["teacher"] },
  { to: "/student/dashboard", label: "Dashboard", icon: House, roles: ["student"] },
  { to: "/student/create-story", label: "Create story", icon: BookOpenText, roles: ["student"] },
  { to: "/student/stories", label: "My stories", icon: ClipboardList, roles: ["student"] },
  { to: "/student/progress", label: "My progress", icon: Lightbulb, roles: ["student"] },
  { to: "/student/profile", label: "My profile", icon: CircleUserRound, roles: ["student"] },
];

export default function AppLayout() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const initials = user?.name?.trim()?.charAt(0)?.toUpperCase() || "S";
  const visibleLinks = user ? links.filter((link) => link.roles.includes(user.role)) : links.filter((link) => link.to === "/");
  const currentLabel = visibleLinks.find((link) => link.to === location.pathname)?.label ?? "Learning journey";

  function signOut() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="app-frame">
      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <NavLink className="brand" to="/" onClick={() => setOpen(false)}>
          <span className="brand-mark"><BookOpenText size={23} /></span>
          <span>storylearn<span className="brand-ai">AI</span><small>Little stories, big ideas</small></span>
        </NavLink>
        <div className="nav-caption">MENU</div>
        <nav className="side-nav" aria-label="Main navigation">
          {visibleLinks.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setOpen(false)}
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            >
              <Icon size={19} strokeWidth={2} />
              <span>{label}</span>
              {to.includes("create-story") && <span className="nav-sparkle">✦</span>}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-spacer" />
        <div className="sidebar-tip">
          <span className="tip-icon">🌟</span>
          <strong>Curiosity looks good on you!</strong>
          <span>Every question is a new adventure.</span>
        </div>
        {user ? (
          <div className="profile-mini">
            <span className="avatar avatar-small">{initials}</span>
            <span><strong>{user.name}</strong><small>{user.role} account</small></span>
            <button className="signout-button" onClick={signOut} aria-label="Sign out" title="Sign out"><LogOut size={16} /></button>
          </div>
        ) : (
          <div className="guest-account">
            <span className="guest-label">DEMO PREVIEW</span>
            <div className="guest-links"><NavLink to="/login">Sign in</NavLink><NavLink to="/register">Create account</NavLink></div>
          </div>
        )}
      </aside>
      {open && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setOpen(false)} />}
      <main className="main-panel">
        <header className="topbar">
          <button className="icon-button mobile-menu" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen(!open)}>
            {open ? <X size={21} /> : <Menu size={21} />}
          </button>
          <div className="breadcrumb">
            <span>My learning</span><span className="breadcrumb-slash">/</span>
            <strong>{currentLabel}</strong>
          </div>
          <div className="topbar-actions">
            {user ? (
              <>
                <span className="signed-in-name">{user.name}</span>
                <span className="avatar top-avatar" aria-label={`${user.role} account`}>{initials}</span>
              </>
            ) : (
              <>
                <NavLink to="/login" className="header-auth-link">Sign in</NavLink>
                <NavLink to="/register" className="button button-primary header-signup">Create account</NavLink>
              </>
            )}
          </div>
        </header>
        <div className="page-content"><Outlet /></div>
        <footer className="footer-note">Made for curious minds <span>✦</span> Grown-up approved</footer>
      </main>
    </div>
  );
}
