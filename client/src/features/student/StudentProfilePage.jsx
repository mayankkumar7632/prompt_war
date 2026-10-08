import React, { useEffect, useState } from "react";
import { Save, CircleAlert, KeyRound, Link2 } from "lucide-react";
import PageHeading from "../../components/common/PageHeading.jsx";
import { useAuth } from "../../app/AuthContext.jsx";
import { apiRequest } from "../../services/apiClient.js";

export default function StudentProfilePage() {
  const { token, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [parentCode, setParentCode] = useState("");
  const [parentCodeExpiry, setParentCodeExpiry] = useState("");
  const [classCode, setClassCode] = useState("");

  useEffect(() => {
    apiRequest("/student/profile", { token })
      .then(({ profile: data }) => setProfile(data))
      .catch((requestError) => setError(requestError.message));
  }, [token]);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);
    const form = new FormData(event.currentTarget);
    try {
      const { profile: updated } = await apiRequest("/student/profile", {
        token,
        method: "PUT",
        body: {
          name: form.get("name"),
          age: Number(form.get("age")),
          grade: form.get("grade"),
          interests: form.get("interests").split(",").map((value) => value.trim()).filter(Boolean),
        },
      });
      setProfile(updated);
      updateUser?.(updated);
      setMessage("Your profile is saved!");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function createParentCode() {
    setError("");
    setMessage("");
    try {
      const result = await apiRequest("/student/parent-connection-code", {
        token,
        method: "POST",
      });
      setParentCode(result.code);
      setParentCodeExpiry(result.expiresAt);
      setMessage("Share this one-time code with your parent. It expires in 24 hours.");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function joinTeacher(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      const form = new FormData(event.currentTarget);
      const result = await apiRequest("/student/join-teacher", {
        token,
        method: "POST",
        body: { code: form.get("classCode") },
      });
      setClassCode("");
      setMessage(result.message);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  if (error && !profile) return <div className="student-state error-state"><CircleAlert /><p>{error}</p></div>;
  if (!profile) return <div className="student-state">Loading your profile...</div>;

  return (
    <>
      <PageHeading eyebrow="YOUR ACCOUNT" title={<>My profile <span>🧑‍🚀</span></>} description="These details help us make stories just right for you." />
      <form className="form-card profile-form" onSubmit={submit}>
        <div className="form-grid student-profile-grid">
          <label className="field"><span>Full name</span><input name="name" defaultValue={profile.name} required maxLength="100" /></label>
          <label className="field"><span>Email address</span><input value={profile.email} disabled readOnly /></label>
          <label className="field"><span>Age</span><input name="age" type="number" min="4" max="18" defaultValue={profile.age} required /></label>
          <label className="field"><span>Class / grade</span><input name="grade" defaultValue={profile.grade} required maxLength="40" /></label>
          <label className="field student-interest-field"><span>Learning interests</span><input name="interests" defaultValue={(profile.interests ?? []).join(", ")} placeholder="Space, animals, sports" maxLength="200" /></label>
        </div>
        <div className="form-footer"><span className="privacy-note">Your account role is managed safely and can't be changed here.</span><button className="button button-primary" type="submit" disabled={saving}><Save size={16} /> {saving ? "Saving..." : "Save profile"}</button></div>
      </form>
      <section className="panel-card relationship-panel">
        <div className="connection-copy"><span className="insight-icon"><Link2 size={18} /></span><div><div className="eyebrow">FAMILY CONNECTION</div><h2>Connect a parent</h2><p>Make a one-time code and share it with your parent so they can view your learning progress.</p></div></div>
        <div className="connection-form"><button className="button button-primary" type="button" onClick={createParentCode}>Create parent code <KeyRound size={16} /></button>{parentCode && <div className="class-code-result"><strong>{parentCode}</strong><small>Expires {new Date(parentCodeExpiry).toLocaleString()}</small></div>}</div>
      </section>
      <section className="panel-card relationship-panel">
        <div className="connection-copy"><span className="insight-icon"><KeyRound size={18} /></span><div><div className="eyebrow">CLASS CONNECTION</div><h2>Join your teacher's class</h2><p>Enter the class code your teacher shares with you. It expires after 7 days.</p></div></div>
        <form className="connection-form" onSubmit={joinTeacher}><label className="field"><span>Class code</span><input name="classCode" value={classCode} onChange={(event) => setClassCode(event.target.value.toUpperCase())} maxLength={12} minLength={12} pattern="[A-Fa-f0-9]{12}" placeholder="12-character code" required /></label><button className="button button-primary" type="submit">Join class <Save size={16} /></button></form>
      </section>
      {error && <p className="auth-error" role="alert">{error}</p>}
      {message && <p className="success-message" role="status">{message}</p>}
    </>
  );
}
