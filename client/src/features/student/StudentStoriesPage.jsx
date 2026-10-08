import React, { useEffect, useState } from "react";
import { ArrowRight, BookOpenText } from "lucide-react";
import { Link } from "react-router-dom";
import PageHeading from "../../components/common/PageHeading.jsx";
import { useAuth } from "../../app/AuthContext.jsx";
import { apiRequest } from "../../services/apiClient.js";

export default function StudentStoriesPage() {
  const { token } = useAuth();
  const [stories, setStories] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest("/student/stories", { token })
      .then((data) => setStories(data.stories))
      .catch((requestError) => setError(requestError.message));
  }, [token]);

  return (
    <>
      <PageHeading eyebrow="YOUR STORY SHELF" title={<>My stories <span>📚</span></>} description="Your learning adventures are saved here." action={<Link className="button button-primary" to="/student/create-story"><BookOpenText size={16} /> New story</Link>} />
      {error && <p className="auth-error" role="alert">{error}</p>}
      {stories === null && !error && <div className="student-state">Loading your stories...</div>}
      {stories?.length === 0 && <div className="student-empty-card"><span>📖</span><h2>Your story shelf is ready</h2><p>Create your first story adventure to see it here.</p><Link className="button button-primary" to="/student/create-story">Create a story <ArrowRight size={16} /></Link></div>}
      {stories?.length > 0 && <div className="student-story-grid">{stories.map((story) => <Link className="student-story-card" key={story._id} to={`/student/stories/${story._id}`}><span className="story-card-emoji">📘</span><span className="eyebrow">{story.subject} · {story.topic}</span><h2>{story.title}</h2><p>{story.learningObjective}</p><span className={`status-pill ${story.status === "completed" ? "status-green" : "status-yellow"}`}>{story.status === "completed" ? "Completed" : "In progress"}</span><span className="story-open-link">Open story <ArrowRight size={15} /></span></Link>)}</div>}
    </>
  );
}
