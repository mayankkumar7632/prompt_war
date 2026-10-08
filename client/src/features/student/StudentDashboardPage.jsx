import React, { useEffect, useState } from "react";
import { ArrowRight, BookOpenText, CircleAlert } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../app/AuthContext.jsx";
import PageHeading from "../../components/common/PageHeading.jsx";
import ProgressBar from "../../components/common/ProgressBar.jsx";
import { apiRequest } from "../../services/apiClient.js";

const initialSummary = {
  storiesStarted: 0,
  storiesCompleted: 0,
  topicsStudied: 0,
  questionsAttempted: 0,
  understandingScore: null,
};

export default function StudentDashboardPage() {
  const { token, user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest("/student/dashboard", { token })
      .then(setDashboard)
      .catch((requestError) => setError(requestError.message));
  }, [token]);

  if (error) {
    return <div className="student-state error-state"><CircleAlert size={24} /><h2>We couldn't load your learning space</h2><p>{error}</p><button className="button button-secondary" onClick={() => window.location.reload()}>Try again</button></div>;
  }
  if (!dashboard) {
    return <div className="student-state">Loading your learning space...</div>;
  }

  const summary = { ...initialSummary, ...dashboard.summary };
  const student = dashboard.student;
  return (
    <>
      <PageHeading
        eyebrow="YOUR LEARNING SPACE"
        title={<>Welcome, {student.name}! <span>👋</span></>}
        description={`Age ${student.age} · ${student.grade} · Your own stories and progress, saved as you learn.`}
        action={<Link to="/student/create-story" className="button button-primary"><BookOpenText size={16} /> Start a story</Link>}
      />
      <section className="stats-grid dashboard-stats student-stats">
        <article className="stat-card"><span className="stat-icon stat-purple">📚</span><strong>{summary.storiesCompleted}</strong><span>stories completed</span><small className="stat-note">{summary.storiesStarted} started</small></article>
        <article className="stat-card"><span className="stat-icon stat-yellow">🎯</span><strong>{summary.understandingScore === null ? "—" : `${summary.understandingScore}%`}</strong><span>understanding score</span><small className="stat-note">{summary.questionsAttempted} questions tried</small></article>
        <article className="stat-card"><span className="stat-icon stat-green">🌱</span><strong>{summary.topicsStudied}</strong><span>topics studied</span><small className="stat-note">{summary.correctAnswers ?? 0} correct answers</small></article>
        <article className="stat-card"><span className="stat-icon stat-blue">💡</span><strong>{summary.incorrectAnswers ?? 0}</strong><span>more to practice</span><small className="stat-note">Every try helps you grow</small></article>
      </section>

      <section className="dashboard-columns">
        <article className="panel-card subject-panel">
          <div className="panel-heading"><div><div className="eyebrow">YOUR LEARNING GARDEN</div><h2>Progress by topic</h2></div></div>
          {dashboard.subjectProgress.length
            ? dashboard.subjectProgress.map((item) => <div className="subject-progress" key={`${item.subject}-${item.topic}`}><div className="subject-line"><span className="subject-label"><span>🌿</span><strong>{item.subject} · {item.topic}</strong></span><strong>{item.score}%</strong></div><ProgressBar value={item.score} className="bar-purple" /><small>{item.weakConcepts.length ? `Growing next: ${item.weakConcepts.join(", ")}` : "Looking strong!"}</small></div>)
            : <p className="student-empty">No learning activity yet. Start your first story.</p>}
        </article>
        <article className="panel-card insight-panel">
          <div className="insight-icon">✨</div><div className="eyebrow">YOUR NEXT ADVENTURE</div><h2>{dashboard.recommendation.text}</h2><p>Stories are made for your age, class, and learning interests.</p><Link to="/student/create-story" className="text-link">Choose a topic <ArrowRight size={15} /></Link>
        </article>
      </section>

      <section className="panel-card activity-panel">
        <div className="panel-heading"><div><div className="eyebrow">PICK UP YOUR JOURNEY</div><h2>Recent stories</h2></div><Link to="/student/stories" className="text-link">All stories <ArrowRight size={15} /></Link></div>
        {dashboard.recentStories.length
          ? <div className="activity-list">{dashboard.recentStories.map((story) => <Link to={`/student/stories/${story._id}`} className="activity-row" key={story._id}><span className="activity-emoji">📖</span><span className="activity-copy"><strong>{story.title}</strong><small>{story.subject} · {story.topic}</small></span><span className={`status-pill ${story.status === "completed" ? "status-green" : "status-yellow"}`}>{story.status === "completed" ? "Finished" : "In progress"}</span><ArrowRight size={16} /></Link>)}</div>
          : <p className="student-empty">Your first adventure is waiting. <Link to="/student/create-story">Create a story</Link>.</p>}
      </section>

      <section className="panel-card activity-panel student-quiz-panel">
        <div className="panel-heading"><div><div className="eyebrow">KEEP LEARNING</div><h2>Recent quiz answers</h2></div><Link to="/student/progress" className="text-link">My progress <ArrowRight size={15} /></Link></div>
        {dashboard.recentQuizResults.length
          ? <div className="activity-list">{dashboard.recentQuizResults.slice(0, 5).map((answer) => <div className="activity-row" key={answer.id}><span className="activity-emoji">{answer.correct ? "✅" : answer.correct === false ? "🌱" : "📝"}</span><span className="activity-copy"><strong>{answer.storyTitle}</strong><small>{answer.question}</small></span><span className={`status-pill ${answer.correct ? "status-green" : "status-yellow"}`}>{answer.correct === null ? "Review" : answer.correct ? "Correct" : "Practice"}</span></div>)}</div>
          : <p className="student-empty">Your quiz answers will appear here after you explore a story.</p>}
      </section>
    </>
  );
}
