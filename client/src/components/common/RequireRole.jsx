import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../app/AuthContext.jsx";

export default function RequireRole({ roles, children, allowGuest = false }) {
  const { user } = useAuth();
  const location = useLocation();
  const dashboardPath = {
    student: "/student/dashboard",
    parent: "/parent-dashboard",
    teacher: "/teacher-dashboard",
  };

  if (!user) {
    return allowGuest ? children : <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (!roles.includes(user.role)) {
    return <Navigate to={dashboardPath[user.role] ?? "/login"} replace />;
  }
  return children;
}
