import React from "react";
import { ArrowRight, BookOpen, ChevronRight, CirclePlay, Clock3, Sparkles, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import { Navigate } from "react-router-dom";
import PageHeading from "../../components/common/PageHeading.jsx";
import ProgressBar from "../../components/common/ProgressBar.jsx";
import { useAuth } from "../../app/AuthContext.jsx";

const recentStories = [
  { emoji: "🚀", tint: "lavender", title: "The Moon's Missing Crater", subject: "Science · Space", progress: 100, time: "Yesterday" },
  { emoji: "🐢", tint: "mint", title: "Turtle's Fraction Picnic", subject: "Math · Fractions", progress: 68, time: "2 days ago" },
  { emoji: "🏰", tint: "peach", title: "The Kingdom of Verbs", subject: "English · Grammar", progress: 100, time: "Last week" },
];

export default function HomePage() {
  const { user } = useAuth();
  if (user) {
    const dashboard = {
      student: "/student/dashboard",
      parent: "/parent-dashboard",
      teacher: "/teacher-dashboard",
    };
    return <Navigate to={dashboard[user.role] ?? "/login"} replace />;
  }

  return (
    <>
      <PageHeading eyebrow="DEMO LEARNING SPACE" title={<>Hey, Sam! <span className="heading-emoji">👋</span></>} description="This is a sample learner space. Sign up or sign in to create your own account." />
      <section className="hero-card">
        <div className="hero-copy">
          <div className="hero-kicker"><Sparkles size={15} /> YOUR NEXT BIG ADVENTURE</div>
          <h2>Big ideas start<br />with a little story.</h2>
          <p>Pick something you're learning, and we'll turn it into an adventure made just for you.</p>
          <Link to={user ? "/create-story" : "/register"} className="button button-primary">{user ? "Create my story" : "Create student account"} <ArrowRight size={17} /></Link>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="hero-sun" />
          <span className="hero-star star-a">✦</span><span className="hero-star star-b">✧</span>
          <span className="hero-planet">🪐</span><span className="hero-book">📖</span>
          <span className="hero-cloud">☁️</span>
        </div>
        <div className="hero-decoration">✦</div>
      </section>

      <div className="section-heading">
        <div><h2>Your learning garden <span>🌱</span></h2><p>Look how much you've grown!</p></div>
        <Link to="/parent-dashboard" className="text-link">See all progress <ChevronRight size={16} /></Link>
      </div>
      <section className="stats-grid">
        <article className="stat-card"><span className="stat-icon stat-purple"><BookOpen size={19} /></span><strong>12</strong><span>stories explored</span><small className="stat-note">+3 this week</small></article>
        <article className="stat-card"><span className="stat-icon stat-yellow"><Trophy size={19} /></span><strong>86%</strong><span>understanding</span><small className="stat-note">You're on a roll!</small></article>
        <article className="stat-card"><span className="stat-icon stat-green">🔥</span><strong>3 days</strong><span>learning streak</span><small className="stat-note">Keep it growing</small></article>
        <article className="stat-card"><span className="stat-icon stat-blue"><Clock3 size={19} /></span><strong>2.5 hrs</strong><span>curious time</span><small className="stat-note">This week</small></article>
      </section>

      <div className="section-heading recent-heading">
        <div><h2>Pick up where you left off <span>📚</span></h2><p>Your adventures are right here.</p></div>
        <Link to="/story-reader" className="text-link">All stories <ChevronRight size={16} /></Link>
      </div>
      <section className="story-list">
        {recentStories.map((story) => (
          <article className="story-row" key={story.title}>
            <div className={`story-thumb ${story.tint}`}>{story.emoji}</div>
            <div className="story-row-main"><div className="story-title-line"><h3>{story.title}</h3><span className="story-date">{story.time}</span></div><p>{story.subject}</p><ProgressBar value={story.progress} /></div>
            <Link className="round-play" to={story.progress === 100 ? "/result" : "/story-reader"} aria-label={`Open ${story.title}`}><CirclePlay size={22} /></Link>
          </article>
        ))}
      </section>
    </>
  );
}
