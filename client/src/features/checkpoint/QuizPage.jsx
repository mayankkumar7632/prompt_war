import React, { useState } from "react";
import { ArrowLeft, ArrowRight, Check, HelpCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import PageHeading from "../../components/common/PageHeading.jsx";
import ProgressBar from "../../components/common/ProgressBar.jsx";

const questions = [
  { type: "MULTIPLE CHOICE", prompt: "Why does Earth have liquid water?", options: ["It is the biggest planet", "It is just the right distance from the Sun", "It has more moons than other planets", "It spins faster than the Sun"], answer: 1 },
  { type: "TRUE OR FALSE", prompt: "Mercury is the smallest planet in our solar system.", options: ["True", "False"], answer: 0 },
  { type: "THINK IT THROUGH", prompt: "If a planet were much closer to the Sun than Earth, what might happen to its water?", options: ["It might get too hot and turn into vapor", "It would become ice right away", "Nothing would change"], answer: 0 },
  { type: "EXPLAIN IN YOUR OWN WORDS", prompt: "Why is Earth a good home for plants, animals, and people?", options: null },
];

export default function QuizPage() {
  const navigate = useNavigate();
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const question = questions[questionIndex];

  function nextQuestion() {
    if (selected === null || (typeof selected === "string" && !selected.trim())) return;
    if (questionIndex < questions.length - 1) {
      setQuestionIndex(questionIndex + 1);
      setSelected(null);
    } else {
      navigate("/result");
    }
  }

  return (
    <>
      <PageHeading eyebrow="CHECKPOINT · THE SOLAR SYSTEM" title={<>Show what you know! <span>🧠</span></>} description="No rush, space explorer. Just do your best!" />
      <section className="quiz-card">
        <div className="quiz-topline"><Link to="/story-reader" className="quiz-back"><ArrowLeft size={16} /> Back to story</Link><span>QUESTION {questionIndex + 1} <span className="muted">/ {questions.length}</span></span></div>
        <ProgressBar value={Math.round(((questionIndex + 1) / questions.length) * 100)} className="quiz-progress" />
        <div className="question-type"><HelpCircle size={14} /> {question.type}</div>
        <h2 className="question-prompt">{question.prompt}</h2>
        {question.options ? (
          <div className="answer-options">{question.options.map((option, index) => <button key={option} className={`answer-option ${selected === index ? "selected" : ""}`} onClick={() => setSelected(index)}><span className="option-letter">{String.fromCharCode(65 + index)}</span><span>{option}</span>{selected === index && <Check className="option-check" size={18} />}</button>)}</div>
        ) : (
          <label className="field answer-field"><span>Your idea</span><textarea value={selected ?? ""} onChange={(event) => setSelected(event.target.value)} placeholder="Tell us what you think..." rows="4" /></label>
        )}
        <div className="quiz-bottom"><span className="gentle-note"><span>🌱</span> Every try helps your brain grow.</span><button className="button button-primary" disabled={selected === null || (typeof selected === "string" && !selected.trim())} onClick={nextQuestion}>{questionIndex === questions.length - 1 ? "See my results" : "Check my answer"} <ArrowRight size={17} /></button></div>
      </section>
    </>
  );
}
