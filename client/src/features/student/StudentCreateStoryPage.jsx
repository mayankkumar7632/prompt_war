import React, { useEffect, useState } from "react";
import { ArrowRight, BookOpenText, CircleAlert, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageHeading from "../../components/common/PageHeading.jsx";
import { useAuth } from "../../app/AuthContext.jsx";
import { apiRequest } from "../../services/apiClient.js";

export default function StudentCreateStoryPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [interest, setInterest] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiRequest("/student/profile", { token })
      .then(({ profile: learner }) => {
        setProfile(learner);
        setInterest(learner.interests?.[0] ?? "");
      })
      .catch((requestError) => setError(requestError.message));
  }, [token]);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(event.currentTarget);
    try {
      const result = await apiRequest("/student/stories", {
        token,
        method: "POST",
        body: {
          subject: form.get("subject"),
          topic: form.get("topic"),
          learningObjective: form.get("learningObjective"),
          interest: interest || undefined,
        },
      });
      navigate(`/student/stories/${result.story._id}`, { state: { newlyCreated: true } });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHeading eyebrow="YOUR NEXT ADVENTURE" title={<>What shall we explore? <span>✨</span></>} description={profile ? `Stories will be made for age ${profile.age}, ${profile.grade}${profile.interests?.length ? `, with ${profile.interests.join(" and ")} adventures` : ""}.` : "Loading your learner profile..."} />
      <form className="form-card create-form" onSubmit={submit}>
        <div className="form-section-title"><span className="step-dot">1</span><div><h2>Choose a subject and topic</h2><p>Tell us what you are learning today.</p></div></div>
        <div className="form-grid student-story-fields">
          <label className="field"><span>Subject</span><select name="subject" required defaultValue=""><option value="" disabled>Choose a subject</option>{["Science", "Math", "English", "Social studies"].map((subject) => <option key={subject}>{subject}</option>)}</select></label>
          <label className="field"><span>Topic</span><input name="topic" placeholder="e.g. The water cycle" required maxLength="120" /></label>
        </div>
        <label className="field"><span>Anything special you want to learn? <span className="optional">(optional)</span></span><input name="learningObjective" placeholder="e.g. How water changes from liquid to vapor" maxLength="500" /></label>
        <div className="form-section-title topic-title"><span className="step-dot">2</span><div><h2>Pick a story vibe</h2><p>Your saved interests are ready to choose from.</p></div></div>
        <label className="field"><span>Story interest</span><select value={interest} onChange={(event) => setInterest(event.target.value)}><option value="">Adventure (surprise me)</option>{(profile?.interests ?? []).map((value) => <option key={value}>{value}</option>)}{["Space", "Animals", "Adventure", "Fantasy", "Sports", "Mystery"].filter((value) => !profile?.interests?.includes(value)).map((value) => <option key={value}>{value}</option>)}</select></label>
        {error && <p className="auth-error" role="alert"><CircleAlert size={15} /> {error}</p>}
        <div className="generate-bar student-generate-bar"><div className="generate-note"><span><Sparkles size={17} /></span><p><strong>Age-appropriate story and quiz</strong><small>Your learner profile is sent securely to the backend AI service.</small></p></div><button className="button button-primary" type="submit" disabled={loading || !profile}><BookOpenText size={17} /> {loading ? "Writing your adventure..." : "Make my story"} <ArrowRight size={17} /></button></div>
      </form>
    </>
  );
}
