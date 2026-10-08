import React, { useEffect, useState } from "react";
import { ArrowRight, CircleAlert, KeyRound, TrendingUp, UsersRound } from "lucide-react";
import PageHeading from "../../components/common/PageHeading.jsx";
import ProgressBar from "../../components/common/ProgressBar.jsx";
import TrendChart from "../../components/common/TrendChart.jsx";
import { useAuth } from "../../app/AuthContext.jsx";
import { apiRequest } from "../../services/apiClient.js";

const showPercent = (value) => value === null || value === undefined ? "—" : `${value}%`;

export default function TeacherDashboardPage() {
  const { token, user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [studentProgress, setStudentProgress] = useState(null);
  const [connectionCode, setConnectionCode] = useState("");
  const [codeExpiry, setCodeExpiry] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiRequest("/teacher/dashboard", { token })
      .then(({ dashboard: result }) => { if (active) setDashboard(result); })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, refresh]);

  useEffect(() => {
    let active = true;
    if (!selectedStudent) {
      setStudentProgress(null);
      return () => { active = false; };
    }
    apiRequest(`/teacher/students/${encodeURIComponent(selectedStudent)}/progress`, { token })
      .then((result) => { if (active) setStudentProgress(result); })
      .catch((requestError) => { if (active) setError(requestError.message); });
    return () => { active = false; };
  }, [token, selectedStudent]);

  async function createConnectionCode() {
    setError("");
    try {
      const result = await apiRequest("/teacher/connection-code", { token, method: "POST" });
      setConnectionCode(result.code);
      setCodeExpiry(result.expiresAt);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  if (loading && !dashboard) return <div className="student-state">Loading assigned class data...</div>;
  if (error && !dashboard) {
    return <div className="student-state error-state"><CircleAlert size={24} /><h2>We couldn't load the teacher dashboard</h2><p>{error}</p><button className="button button-secondary" onClick={() => setRefresh((value) => value + 1)}>Try again</button></div>;
  }

  const summary = dashboard?.summary;
  const students = dashboard?.students ?? [];

  return (
    <>
      <PageHeading eyebrow="TEACHER GROWTH" title={<>Class progress at a glance <span>🌿</span></>} description={`Welcome, ${user.name}. Only students who join your class appear here.`} />
      {error && <p className="auth-error" role="alert">{error}</p>}
      <section className="panel-card connection-panel">
        <div className="connection-copy"><span className="insight-icon"><KeyRound size={18} /></span><div><div className="eyebrow">STUDENT ASSIGNMENT</div><h2>Invite students to your class</h2><p>Create a class code and share it with students. Codes expire after 7 days.</p></div></div>
        <div className="connection-form"><button className="button button-primary" type="button" onClick={createConnectionCode}>Create class code <ArrowRight size={16} /></button>{connectionCode && <div className="class-code-result"><strong>{connectionCode}</strong><small>Expires {new Date(codeExpiry).toLocaleString()}</small></div>}</div>
      </section>

      {!students.length ? (
        <section className="student-empty-card dashboard-empty"><span>🏫</span><h2>No students have been assigned to your account yet.</h2><p>Share the class code above. Students enter it from their own profile to join your class.</p></section>
      ) : (
        <>
          <section className="teacher-welcome"><div className="teacher-welcome-icon">📚</div><div><span className="eyebrow">YOUR ASSIGNED STUDENTS</span><h2>Learning growth for {students.length} {students.length === 1 ? "student" : "students"}</h2><p>Class data updates from saved student stories and answers.</p></div><div className="teacher-week"><UsersRound size={17} /><small>Private class view</small></div></section>
          <section className="stats-grid dashboard-stats teacher-stats">
            <article className="stat-card"><span className="stat-icon stat-purple"><UsersRound size={19} /></span><strong>{summary.totalStudents}</strong><span>assigned students</span></article>
            <article className="stat-card"><span className="stat-icon stat-yellow">🎯</span><strong>{showPercent(summary.averageUnderstanding)}</strong><span>class understanding</span><small className="stat-note">{summary.evaluatedQuestions} evaluated answers</small></article>
            <article className="stat-card"><span className="stat-icon stat-green">📚</span><strong>{summary.storiesCompleted}</strong><span>stories completed</span><small className="stat-note">{summary.questionsAnswered} questions answered</small></article>
            <article className="stat-card"><span className="stat-icon stat-blue">🌱</span><strong>{summary.studentsNeedingSupport}</strong><span>students needing support</span><small className="stat-note">Below 60% accuracy</small></article>
          </section>

          <section className="dashboard-columns">
            <article className="panel-card trend-panel"><div className="panel-heading"><div><div className="eyebrow">CLASS TREND</div><h2>Understanding over time</h2></div><TrendingUp size={18} className="muted-icon" /></div><TrendChart points={dashboard.trend} title="Class understanding over time" /></article>
            <article className="panel-card"><div className="panel-heading"><div><div className="eyebrow">TOPIC PERFORMANCE</div><h2>Topics by class accuracy</h2></div></div>{dashboard.topicPerformance.length ? dashboard.topicPerformance.map((topic) => <div className="subject-progress" key={`${topic.subject}-${topic.topic}`}><div className="subject-line"><strong>{topic.subject} · {topic.topic}</strong><strong>{topic.score}%</strong></div><ProgressBar value={topic.score} className={topic.score >= 70 ? "bar-green" : "bar-yellow"} /><small>{topic.evaluatedQuestions} evaluated answers</small></div>) : <p className="student-empty">Topic performance appears after students answer checkpoints.</p>}</article>
          </section>

          <section className="panel-card students-panel">
            <div className="student-toolbar"><div><div className="eyebrow">LINKED LEARNERS</div><h2>Your students</h2></div></div>
            <div className="student-table-wrap"><table className="student-table"><thead><tr><th>STUDENT</th><th>GRADE</th><th>STORIES</th><th>UNDERSTANDING</th><th></th></tr></thead><tbody>{students.map((student) => <tr key={student.studentId}><td><span className="student-name"><span className="student-avatar">{student.name.slice(0, 2).toUpperCase()}</span><span><strong>{student.name}</strong><small>{student.questionsAnswered} answers</small></span></span></td><td>{student.grade ?? "—"}</td><td>{student.storiesCompleted}</td><td><div className="student-score">{student.understandingScore !== null && <ProgressBar value={student.understandingScore} className={student.understandingScore >= 70 ? "bar-green" : "bar-yellow"} />}<strong>{showPercent(student.understandingScore)}</strong></div></td><td><button className="table-arrow" aria-label={`View ${student.name}'s progress`} onClick={() => setSelectedStudent(student.studentId)}><ArrowRight size={16} /></button></td></tr>)}</tbody></table></div>
          </section>

          {studentProgress && (
            <section className="panel-card"><div className="panel-heading"><div><div className="eyebrow">STUDENT GROWTH</div><h2>{studentProgress.student.name}: {studentProgress.student.grade ?? "Class not set"}</h2></div><button className="button button-quiet" type="button" onClick={() => setSelectedStudent("")}>Close</button></div><div className="stats-grid dashboard-stats"><article className="stat-card"><strong>{showPercent(studentProgress.summary.understandingScore)}</strong><span>understanding</span></article><article className="stat-card"><strong>{studentProgress.summary.storiesCompleted}</strong><span>stories completed</span></article><article className="stat-card"><strong>{studentProgress.summary.questionsAnswered}</strong><span>questions answered</span></article><article className="stat-card"><strong>{studentProgress.summary.correctAnswers}/{studentProgress.summary.evaluatedQuestions}</strong><span>correct answers</span></article></div><TrendChart points={studentProgress.trend} title={`${studentProgress.student.name}'s understanding over time`} /></section>
          )}

          <section className="dashboard-columns">
            <article className="panel-card"><div className="panel-heading"><div><div className="eyebrow">COMMON MISCONCEPTIONS</div><h2>Ideas to revisit</h2></div></div>{dashboard.commonMisconceptions.length ? <ul className="dashboard-list">{dashboard.commonMisconceptions.map((item) => <li key={item.misconception}><strong>{item.misconception}</strong><span>Recorded for {item.students} {item.students === 1 ? "student" : "students"}</span></li>)}</ul> : <p className="student-empty">No misconceptions have been recorded.</p>}</article>
            <article className="panel-card"><div className="panel-heading"><div><div className="eyebrow">NEXT STEPS</div><h2>Practice recommendations</h2></div></div>{dashboard.recommendations.length ? <ul className="dashboard-list">{dashboard.recommendations.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="student-empty">Recommendations will appear when learning progress identifies concepts to practice.</p>}</article>
          </section>

          <section className="panel-card activity-panel"><div className="panel-heading"><div><div className="eyebrow">CLASS ACTIVITY</div><h2>Recent student answers</h2></div></div>{dashboard.recentActivity.length ? <div className="activity-list">{dashboard.recentActivity.map((activity) => <div className="activity-row" key={activity.id}><span className="activity-emoji">{activity.correct ? "✅" : activity.correct === false ? "🌱" : "📝"}</span><span className="activity-copy"><strong>{activity.student} · {activity.storyTitle}</strong><small>{activity.subject} · {activity.topic} · {activity.question}</small></span><span className="status-pill">{activity.correct === null ? "Review" : activity.correct ? "Correct" : "Practice"}</span></div>)}</div> : <p className="student-empty">No learning activity yet. Students' saved checkpoint answers appear here.</p>}</section>
        </>
      )}
    </>
  );
}
