import React from "react";
import { ArrowRight, BadgeCheck, BookOpen, RotateCcw, Sparkles, Star } from "lucide-react";
import { Link } from "react-router-dom";
import PageHeading from "../../components/common/PageHeading.jsx";
import ProgressBar from "../../components/common/ProgressBar.jsx";

const bars = [{ label: "Planet order", value: 92, color: "bar-purple" }, { label: "Earth & the Sun", value: 84, color: "bar-green" }, { label: "Liquid water", value: 67, color: "bar-yellow" }];

export default function ResultPage() {
  return (
    <>
      <PageHeading eyebrow="ADVENTURE COMPLETE" title={<>You did it, Sam! <span>🎉</span></>} description="You explored the solar system and learned something new." />
      <section className="result-hero">
        <div className="result-confetti" aria-hidden="true">✦　·　✧　·　✦</div>
        <div className="result-medal">🏅</div><div className="result-score">81<span>%</span></div><strong>Space explorer level: Super!</strong><p>You got 2 out of 3 questions right. Brilliant brainwork!</p>
        <div className="result-pill-row"><span>⭐ 25 stars earned</span><span>⏱ 8 minutes</span><span>📚 1 story finished</span></div>
      </section>
      <section className="result-grid">
        <article className="panel-card mastery-panel"><div className="panel-heading"><div><div className="eyebrow">YOUR LEARNING CHART</div><h2>Concept check-in</h2></div><span className="chart-badge">↗ Getting stronger</span></div><div className="mastery-bars">{bars.map((bar) => <div className="mastery-row" key={bar.label}><div className="mastery-label"><span>{bar.label}</span><strong>{bar.value}%</strong></div><ProgressBar value={bar.value} className={bar.color} /></div>)}</div><div className="chart-legend"><span><i className="legend-dot legend-strong" /> Feeling strong</span><span><i className="legend-dot legend-growing" /> Still growing</span></div></article>
        <article className="panel-card feedback-panel"><div className="feedback-icon">💡</div><div className="eyebrow">A LITTLE MORE PRACTICE</div><h2>Earth's just-right spot</h2><p>Earth is not too close or too far from the Sun. That helps keep water liquid—not boiling away or frozen solid.</p><div className="mini-example"><span>🌞</span><p><strong>Think of it like porridge!</strong><br />Too hot, too cold, or just right—Earth found its Goldilocks spot.</p></div><span className="practice-tag"><Sparkles size={14} /> You're already getting it</span></article>
      </section>
      <section className="strength-row">
        <article className="strength-card strength-good"><span>💪</span><div><strong>Your superpower</strong><p>You remembered how the planets are ordered!</p></div><BadgeCheck size={20} /></article>
        <article className="strength-card strength-practice"><span>🌱</span><div><strong>Keep growing</strong><p>Try explaining why Earth is just right for life.</p></div><Star size={19} /></article>
      </section>
      <div className="result-actions"><Link to="/create-story" className="button button-primary"><BookOpen size={17} /> Start another story <ArrowRight size={17} /></Link><Link to="/parent-dashboard" className="button button-secondary"><RotateCcw size={16} /> See learning report</Link></div>
    </>
  );
}
