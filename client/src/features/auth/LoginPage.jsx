import React from "react";
import { ArrowRight, BookOpenText, Sparkles } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../../app/AuthContext.jsx";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [role, setRole] = useState("student");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    try {
      const session = await login({
        email: form.get("email"),
        password: form.get("password"),
        role,
      });
      const destinations = {
        student: "/student/dashboard",
        parent: "/parent-dashboard",
        teacher: "/teacher-dashboard",
      };
      navigate(destinations[session.user.role], { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <Link to="/" className="brand auth-brand"><span className="brand-mark"><BookOpenText size={23} /></span><span>storylearn<span className="brand-ai">AI</span><small>Little stories, big ideas</small></span></Link>
      <section className="auth-card"><div className="auth-illustration">📚<span>✦</span></div><div className="eyebrow">WELCOME BACK</div><h1>Ready for another story?</h1><p>Sign in to pick up where your learning adventure left off.</p><form onSubmit={handleSubmit}><label className="field"><span>Email address</span><input name="email" type="email" autoComplete="email" placeholder="you@example.com" required /></label><label className="field"><span>Password</span><input name="password" type="password" autoComplete="current-password" placeholder="Your password" required /></label><fieldset className="role-selector"><legend>Log in as</legend>{[["student", "Student"], ["parent", "Parent"], ["teacher", "Teacher"]].map(([value, label]) => <label className={`role-option ${role === value ? "selected" : ""}`} key={value}><input type="radio" name="role" value={value} checked={role === value} onChange={() => setRole(value)} /><span>{label}</span></label>)}</fieldset>{error && <p className="auth-error" role="alert">{error}</p>}<button className="button button-primary auth-submit" type="submit" disabled={submitting}>{submitting ? "Signing in..." : "Sign in"} <ArrowRight size={17} /></button></form><div className="auth-divider"><span>New to StoryLearn?</span></div><Link to="/register" className="button button-secondary auth-create">Create an account</Link><div className="auth-safe"><Sparkles size={14} /> A safe learning space for little minds</div></section>
    </main>
  );
}
