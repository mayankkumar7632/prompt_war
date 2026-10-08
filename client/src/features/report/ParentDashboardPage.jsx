import React, { useCallback, useEffect, useState } from "react";
import { ArrowRight, CircleAlert, Link2, TrendingUp } from "lucide-react";
import PageHeading from "../../components/common/PageHeading.jsx";
import ProgressBar from "../../components/common/ProgressBar.jsx";
import TrendChart from "../../components/common/TrendChart.jsx";
import { useAuth } from "../../app/AuthContext.jsx";
import { apiRequest } from "../../services/apiClient.js";

function percent(value) {
  return value === null || value === undefined ? "—" : `${value}%`;
}

export default function ParentDashboardPage() {
  const { token, user } = useAuth();
  const [studentId, setStudentId] = useState("");
  const [data, setData] = useState(null);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);

  const reload = useCallback(() => setRefresh((value) => value + 1), []);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    const query = studentId ? `?studentId=${encodeURIComponent(studentId)}` : "";
    apiRequest(`/parent/dashboard${query}`, { token })
      .then((result) => { if (active) setData(result); })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, studentId, refresh]);

  async function connectStudent(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      const result = await apiRequest("/parent/connect-student", {
        token,
        method: "POST",
        body: { code },
      });
      setCode("");
      setMessage(result.message);
      reload();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  if (loading && !data) return <div className="student-state">Loading your family's learning data...</div>;
  if (error && !data) {
    return <div className="student-state error-state"><CircleAlert size={24} /><h2>We couldn't load the parent dashboard</h2><p>{error}</p><button className="button button-secondary" onClick={reload}>Try again</button></div>;
  }

  const dashboard = data?.dashboard;
  const summary = dashboard?.summary;

  return (
    <>
      <PageHeading eyebrow="PARENT GROWTH" title={<>Learning grows with support <span>🌱</span></>} description={`Welcome, ${user.name}. View progress only for students connected to your account.`} />
      <section className="panel-card connection-panel">
        <div className="connection-copy"><span className="insight-icon"><Link2 size={18} /></span><div><div className="eyebrow">SAFE FAMILY CONNECTION</div><h2>Connect a student</h2><p>Ask the student to create a one-time code from their profile. It expires after 24 hours.</p></div></div>
        <form className="connection-form" onSubmit={connectStudent}>
          <label className="field"><span>Student connection code</span><input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} maxLength={12} minLength={12} pattern="[A-Fa-f0-9]{12}" placeholder="12-character code" required /></label>
          <button className="button button-primary" type="submit">Connect student <ArrowRight size={16} /></button>
        </form>
        {message && <p className="success-message" role="status">{message}</p>}
        {error && <p className="auth-error" role="alert">{error}</p>}
      </section>

      {loading && <p className="student-state">Refreshing the latest progress...</p>}
      {!loading && !data?.children?.length && (
        <section className="student-empty-card dashboard-empty">
          <span>👨‍👩‍👧</span><h2>Your account is not connected to a student yet.</h2>
          <p>Enter a connection code above to see that student's learning growth here.</p>
        </section>
      )}
      {data?.children?.length > 0 && dashboard && (
        <>
          <section className="dashboard-welcome">
            <div className="avatar dashboard-avatar">{dashboard.student.name.slice(0, 1).toUpperCase()}</div>
            <div><span className="eyebrow">CONNECTED STUDENT</span><h2>{dashboard.student.name}, age {dashboard.student.age ?? "—"} · {dashboard.student.grade ?? "Class not set"}</h2><p>All figures below come from saved learning activity.</p></div>
            {data.children.length > 1 && <label className="child-select"><span>Choose child</span><select value={studentId || dashboard.student.studentId} onChange={(event) => setStudentId(event.target.value)}>{data.children.map((child) => <option key={child.studentId} value={child.studentId}>{child.name}</option>)}</select></label>}
          </section>

          {error && <p className="auth-error" role="alert">{error}</p>}
          <section className="stats-grid dashboard-stats">
            <article className="stat-card"><span className="stat-icon stat-purple">📚</span><strong>{summary.storiesCompleted}</strong><span>stories completed</span><small className="stat-note">{summary.storiesStarted} started</small></article>
            <article className="stat-card"><span className="stat-icon stat-yellow">🎯</span><strong>{percent(summary.understandingScore)}</strong><span>overall understanding</span><small className="stat-note">{summary.evaluatedQuestions} evaluated questions</small></article>
            <article className="stat-card"><span className="stat-icon stat-green">✅</span><strong>{summary.correctAnswers}</strong><span>correct answers</span><small className="stat-note">Saved assessments</small></article>
            <article className="stat-card"><span className="stat-icon stat-blue">🌱</span><strong>{summary.incorrectAnswers}</strong><span>incorrect answers</span><small className="stat-note">{summary.questionsAnswered} total answered</small></article>
          </section>

          <section className="dashboard-columns">
            <article className="panel-card trend-panel"><div className="panel-heading"><div><div className="eyebrow">WEEKLY LEARNING TREND</div><h2>Understanding over time</h2></div><TrendingUp size={18} className="muted-icon" /></div><TrendChart points={dashboard.trend} /></article>
            <article className="panel-card"><div className="panel-heading"><div><div className="eyebrow">GROWING KNOWLEDGE</div><h2>Topics studied</h2></div></div>{dashboard.topics.length ? dashboard.topics.map((topic) => <div className="subject-progress" key={`${topic.subject}-${topic.topic}`}><div className="subject-line"><strong>{topic.subject} · {topic.topic}</strong><strong>{percent(topic.score)}</strong></div>{topic.score !== null && <ProgressBar value={topic.score} className={topic.score >= 70 ? "bar-green" : "bar-yellow"} />}<small>{topic.evaluatedQuestions} evaluated questions · {topic.stories} stories</small></div>) : <p className="student-empty">No learning activity yet. Start a first story with the student.</p>}</article>
          </section>

          <section className="dashboard-columns">
            <article className="panel-card"><div className="panel-heading"><div><div className="eyebrow">STRENGTHS</div><h2>Strong topics</h2></div></div>{dashboard.strongTopics.length ? <ul className="dashboard-list">{dashboard.strongTopics.map((topic) => <li key={`${topic.subject}-${topic.topic}`}><strong>{topic.subject} · {topic.topic}</strong><span>{topic.strongConcepts.map((item) => `${item.name} ${item.score}%`).join(" · ")}</span></li>)}</ul> : <p className="student-empty">Strong topics will appear as the student practices.</p>}</article>
            <article className="panel-card"><div className="panel-heading"><div><div className="eyebrow">PRACTICE NEXT</div><h2>Needs improvement</h2></div></div>{dashboard.weakTopics.length ? <ul className="dashboard-list">{dashboard.weakTopics.map((topic) => <li key={`${topic.subject}-${topic.topic}`}><strong>{topic.subject} · {topic.topic} · {topic.score}%</strong><span>{topic.weakConcepts.length ? topic.weakConcepts.join(", ") : "Try another practice story."}</span></li>)}</ul> : <p className="student-empty">No topics are currently flagged for extra practice.</p>}</article>
          </section>

          <section className="dashboard-columns">
            <article className="panel-card"><div className="panel-heading"><div><div className="eyebrow">RECENT LEARNING</div><h2>Latest activity</h2></div></div>{dashboard.recentActivity.length ? <div className="activity-list">{dashboard.recentActivity.map((activity) => <div className="activity-row" key={activity.id}><span className="activity-emoji">{activity.correct === true ? "✅" : activity.correct === false ? "🌱" : "📝"}</span><span className="activity-copy"><strong>{activity.storyTitle}</strong><small>{activity.subject} · {activity.topic} · {activity.question}</small></span><span className="status-pill">{activity.correct === null ? "Review" : activity.correct ? "Correct" : "Practice"}</span></div>)}</div> : <p className="student-empty">No learning activity yet. Start a first story.</p>}</article>
            <article className="panel-card"><div className="panel-heading"><div><div className="eyebrow">SUPPORT TOGETHER</div><h2>Misconceptions & recommendations</h2></div></div>{dashboard.misconceptions.length ? <ul className="dashboard-list">{dashboard.misconceptions.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="student-empty">No misconceptions have been recorded.</p>}{dashboard.recommendations.length ? <ul className="dashboard-list recommendation-list">{dashboard.recommendations.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="student-empty">Recommendations will appear as learning progress is recorded.</p>}</article>
          </section>
          <section className="panel-card"><div className="panel-heading"><div><div className="eyebrow">STORY SHELF</div><h2>Recent stories</h2></div></div>{dashboard.recentStories.length ? <div className="activity-list">{dashboard.recentStories.map((story) => <div className="activity-row" key={story._id}><span className="activity-emoji">📖</span><span className="activity-copy"><strong>{story.title}</strong><small>{story.subject} · {story.topic}</small></span><span className={`status-pill ${story.status === "completed" ? "status-green" : "status-yellow"}`}>{story.status === "completed" ? "Completed" : "In progress"}</span></div>)}</div> : <p className="student-empty">No stories yet.</p>}</section>
        </>
      )}
    </>
  );
}
