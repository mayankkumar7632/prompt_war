import React, { useState } from "react";
import { ArrowRight, BookOpenText, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageHeading from "../../components/common/PageHeading.jsx";

export default function CreateStoryPage() {
  const navigate = useNavigate();
  const [subject, setSubject] = useState("Science");
  const [interest, setInterest] = useState("Space");
  const subjects = ["Science", "Math", "English", "Social studies"];
  const topics = { Science: ["The water cycle", "Plants and photosynthesis", "Our solar system"], Math: ["Fractions", "Multiplication", "Shapes and patterns"], English: ["Nouns and verbs", "Reading comprehension", "New vocabulary"], "Social studies": ["Maps and directions", "Communities", "Ancient civilizations"] };

  function handleSubmit(event) {
    event.preventDefault();
    navigate("/story-reader");
  }

  return (
    <>
      <PageHeading eyebrow="YOUR NEXT ADVENTURE" title={<>What shall we explore? <span>✨</span></>} description="Choose a school topic. We'll weave it into a story just for you." />
      <form className="form-card create-form" onSubmit={handleSubmit}>
        <div className="form-section-title"><span className="step-dot">1</span><div><h2>Pick a subject</h2><p>What are you learning about today?</p></div></div>
        <div className="subject-grid">{subjects.map((item, index) => <button className={`subject-card ${subject === item ? "selected" : ""}`} type="button" onClick={() => setSubject(item)} key={item}><span className={`subject-emoji subject-${index}`}>{["🔬", "🔢", "📖", "🌍"][index]}</span><strong>{item}</strong><span className="selection-check">{subject === item ? "✓" : "+"}</span></button>)}</div>
        <div className="form-section-title topic-title"><span className="step-dot">2</span><div><h2>Choose your topic</h2><p>Pick something from {subject.toLowerCase()}.</p></div></div>
        <label className="field"><span>Learning topic</span><select defaultValue={topics[subject][0]} key={subject}>{topics[subject].map((topic) => <option key={topic}>{topic}</option>)}</select></label>
        <label className="field objective-field"><span>Anything special you'd like to learn? <span className="optional">(optional)</span></span><input placeholder="e.g. How water changes from liquid to gas" /></label>
        <div className="form-section-title topic-title"><span className="step-dot">3</span><div><h2>Pick a story vibe</h2><p>Choose the kind of adventure you like.</p></div></div>
        <div className="vibe-row">{["Space", "Animals", "Fantasy", "Sports", "Mystery"].map((item, index) => <button type="button" key={item} onClick={() => setInterest(item)} className={`vibe-chip ${interest === item ? "selected" : ""}`}><span>{["🪐", "🦊", "🧚", "🏆", "🕵️"][index]}</span>{item}</button>)}</div>
        <div className="generate-bar"><div className="generate-note"><span><Sparkles size={17} /></span><p><strong>Made for an 8-year-old learner</strong><small>Short chapters · fun questions · big ideas</small></p></div><button className="button button-primary" type="submit"><BookOpenText size={17} /> Make my story <ArrowRight size={17} /></button></div>
      </form>
    </>
  );
}
