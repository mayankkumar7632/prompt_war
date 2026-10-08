import React from "react";
import { ArrowRight, BookOpenText, ShieldCheck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../../app/AuthContext.jsx";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [role, setRole] = useState("student");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    if (form.get("password") !== form.get("confirmPassword")) {
      setError("Your passwords don't match yet. Please check them and try again.");
      setSubmitting(false);
      return;
    }
    try {
      await register({
        name: form.get("name"),
        email: form.get("email"),
        password: form.get("password"),
        confirmPassword: form.get("confirmPassword"),
        role,
        ...(role === "student"
          ? {
              age: Number(form.get("age")),
              grade: form.get("grade"),
              interests: form.get("interests")
                .split(",")
                .map((interest) => interest.trim())
                .filter(Boolean),
            }
          : {}),
      });
      const destinations = {
        student: "/student/dashboard",
        parent: "/parent-dashboard",
        teacher: "/teacher-dashboard",
      };
      navigate(destinations[role], { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <Link to="/" className="brand auth-brand"><span className="brand-mark"><BookOpenText size={23} /></span><span>storylearn<span className="brand-ai">AI</span><small>Little stories, big ideas</small></span></Link>
      <section className="auth-card register-card"><div className="auth-illustration">🌈<span>✦</span></div><div className="eyebrow">LET'S BEGIN</div><h1>Create your account</h1><p>Students get their own learning space. Parents and teachers can also create an account.</p><p className="auth-role-hint">To add another role to an existing email, enter the same password used for that account.</p><form onSubmit={handleSubmit}><label className="field"><span>Your name</span><input name="name" autoComplete="name" placeholder="e.g. Alex Morgan" required /></label><label className="field"><span>Email address</span><input name="email" type="email" autoComplete="email" placeholder="you@example.com" required /></label><label className="field"><span>Create a password</span><input name="password" type="password" autoComplete="new-password" minLength="8" placeholder="At least 8 characters" required /></label><label className="field"><span>Confirm password</span><input name="confirmPassword" type="password" autoComplete="new-password" minLength="8" placeholder="Type your password again" required /></label><label className="field"><span>I am a...</span><select name="role" value={role} onChange={(event) => setRole(event.target.value)}><option value="student">Student</option><option value="parent">Parent</option><option value="teacher">Teacher</option></select></label>{role === "student" && <div className="student-register-fields"><label className="field"><span>Age</span><input name="age" type="number" min="4" max="18" defaultValue="8" required /></label><label className="field"><span>Class / grade</span><input name="grade" placeholder="e.g. Grade 3" maxLength="40" required /></label><label className="field"><span>Learning interests <span className="optional">(optional)</span></span><input name="interests" placeholder="Space, animals" maxLength="200" /></label></div>}{error && <p className="auth-error" role="alert">{error}</p>}<button className="button button-primary auth-submit" type="submit" disabled={submitting}>{submitting ? "Creating account..." : "Create account"} <ArrowRight size={17} /></button></form><div className="auth-safe"><ShieldCheck size={15} /> Your password is encrypted before it is saved</div><div className="auth-divider"><span>Already have an account?</span></div><Link to="/login" className="text-link auth-login-link">Sign in instead <ArrowRight size={15} /></Link></section>
    </main>
  );
}
