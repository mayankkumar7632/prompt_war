import React, { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, CircleAlert } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import PageHeading from "../../components/common/PageHeading.jsx";
import ProgressBar from "../../components/common/ProgressBar.jsx";
import { useAuth } from "../../app/AuthContext.jsx";
import { apiRequest } from "../../services/apiClient.js";

export default function StudentStoryPage() {
  const { storyId } = useParams();
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest(`/student/stories/${storyId}`, { token })
      .then(setData)
      .catch((requestError) => setError(requestError.message));
  }, [storyId, token]);

  if (error) return <div className="student-state error-state"><CircleAlert /><p>{error}</p><Link to="/student/stories" className="button button-secondary">Back to stories</Link></div>;
  if (!data) return <div className="student-state">Opening your story...</div>;

  const { story, questions } = data;
  const chapters = story.chapters?.length ? story.chapters : [{ title: story.title, text: story.content }];
  return (
    <>
      <PageHeading eyebrow={`${story.subject} · ${story.topic}`} title={<>{story.title} <span>📖</span></>} description={`Learning goal: ${story.learningObjective}`} />
      <section className="reader-card student-reader">
        <ProgressBar value={story.status === "completed" ? 100 : 30} label={story.status === "completed" ? "Adventure completed" : "Your story"} className="reader-progress" />
        {chapters.map((chapter, index) => <article className="student-chapter story-text" key={`${chapter.title}-${index}`}><div className="eyebrow">CHAPTER {index + 1} OF {chapters.length}</div><h2>{chapter.title}</h2>{chapter.text.split(/\n+/).filter(Boolean).map((paragraph, paragraphIndex) => <p key={paragraphIndex}>{paragraph}</p>)}</article>)}
        <div className="reader-footer"><Link to="/student/stories" className="button button-quiet"><ArrowLeft size={16} /> My stories</Link><Link to={`/student/quiz/${story._id}`} className="button button-primary">Try {questions.length} checkpoints <ArrowRight size={17} /></Link></div>
      </section>
    </>
  );
}
