import React, { useEffect, useState } from "react";
import { CircleAlert } from "lucide-react";
import PageHeading from "../../components/common/PageHeading.jsx";
import ProgressBar from "../../components/common/ProgressBar.jsx";
import { useAuth } from "../../app/AuthContext.jsx";
import { apiRequest } from "../../services/apiClient.js";

export default function StudentProgressPage() {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest("/student/progress", { token })
      .then(setData)
      .catch((requestError) => setError(requestError.message));
  }, [token]);

  if (error) return <div className="student-state error-state"><CircleAlert /><p>{error}</p></div>;
  if (!data) return <div className="student-state">Loading your progress...</div>;

  return (
    <>
      <PageHeading eyebrow="YOUR LEARNING GARDEN" title={<>Look how you're growing! <span>🌱</span></>} description="Your progress is yours. Every question is a step forward." />
      {data.progress.length
        ? <div className="student-progress-list">{data.progress.map((item) => <article className="panel-card" key={item._id}><div className="panel-heading"><div><div className="eyebrow">{item.subject}</div><h2>{item.topic}</h2></div><strong>{item.understandingScore}%</strong></div><ProgressBar value={item.understandingScore} className="bar-purple" /><p className="progress-detail">{item.evaluatedQuestions} questions checked · {item.storyCount} stories</p>{item.conceptMastery.map((concept) => <div className="subject-progress" key={concept.concept}><div className="subject-line"><span>{concept.concept}</span><strong>{concept.score}%</strong></div><ProgressBar value={concept.score} className={concept.score >= 70 ? "bar-green" : "bar-yellow"} /></div>)}{item.weakConcepts.length > 0 && <p className="practice-note">🌱 Keep practicing: {item.weakConcepts.join(", ")}</p>}</article>)}</div>
        : <div className="student-empty-card"><span>🌼</span><h2>Your progress starts with a story</h2><p>Explore a topic and answer a few questions to see your learning garden grow.</p></div>}
      {data.recentAnswers.length > 0 && <section className="panel-card activity-panel student-progress-answers"><div className="panel-heading"><div><div className="eyebrow">RECENT CHECKPOINTS</div><h2>Things you've tried</h2></div></div><div className="activity-list">{data.recentAnswers.map((answer) => <div className="activity-row" key={answer._id}><span className="activity-emoji">{answer.isCorrect ? "✅" : answer.isCorrect === false ? "🌱" : "📝"}</span><span className="activity-copy"><strong>{answer.story?.title ?? answer.question?.concept ?? "Checkpoint"}</strong><small>{answer.question?.prompt}</small></span><span className={`status-pill ${answer.isCorrect ? "status-green" : "status-yellow"}`}>{answer.isCorrect === null ? "Review" : answer.isCorrect ? "Correct" : "Practice"}</span></div>)}</div></section>}
    </>
  );
}
