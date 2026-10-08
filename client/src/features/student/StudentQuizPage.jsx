import React, { useEffect, useState } from "react";
import { ArrowRight, Check, CircleAlert, HelpCircle } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PageHeading from "../../components/common/PageHeading.jsx";
import ProgressBar from "../../components/common/ProgressBar.jsx";
import { useAuth } from "../../app/AuthContext.jsx";
import { apiRequest } from "../../services/apiClient.js";

function typeLabel(type) {
  return {
    multiple_choice: "MULTIPLE CHOICE",
    true_false: "TRUE OR FALSE",
    application: "THINK IT THROUGH",
    explain: "EXPLAIN IN YOUR OWN WORDS",
  }[type] ?? "CHECKPOINT";
}

export default function StudentQuizPage() {
  const { storyId } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [assessment, setAssessment] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest(`/student/stories/${storyId}`, { token })
      .then(setData)
      .catch((requestError) => setError(requestError.message));
  }, [storyId, token]);

  async function submit() {
    if (!answer.trim() || !data) return;
    setError("");
    setSubmitting(true);
    try {
      const result = await apiRequest(`/student/questions/${data.questions[index]._id}/answer`, {
        token,
        method: "POST",
        body: { response: answer },
      });
      if (result.assessment.additionalQuestion) {
        setData((current) => ({
          ...current,
          questions: [...current.questions, result.assessment.additionalQuestion],
        }));
      }
      setAssessment(result.assessment);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function startFreshSet() {
    setError("");
    setRetrying(true);
    try {
      const result = await apiRequest(`/student/stories/${storyId}/quiz-attempt`, {
        token,
        method: "POST",
      });
      setData((current) => ({ ...current, questions: result.questions }));
      setIndex(0);
      setAnswer("");
      setAssessment(null);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setRetrying(false);
    }
  }

  function next() {
    if (index + 1 >= data.questions.length) {
      navigate("/student/progress");
      return;
    }
    setIndex(index + 1);
    setAnswer("");
    setAssessment(null);
  }

  if (error && !data) return <div className="student-state error-state"><CircleAlert /><p>{error}</p></div>;
  if (!data) return <div className="student-state">Loading your checkpoints...</div>;
  const question = data.questions[index];
  if (!question) return <div className="student-empty-card"><h2>This story has no questions yet.</h2><Link to={`/student/stories/${storyId}`} className="button button-secondary">Back to story</Link></div>;

  return (
    <>
      <PageHeading eyebrow={`CHECKPOINT · ${data.story.topic}`} title={<>Show what you know! <span>🧠</span></>} description="Take your time. Every try helps your brain grow." />
      <section className="quiz-card">
        <div className="quiz-topline"><Link to={`/student/stories/${storyId}`} className="quiz-back">← Back to story</Link><span>QUESTION {index + 1} <span className="muted">/ {data.questions.length}</span></span></div>
        <ProgressBar value={Math.round(((index + (assessment ? 1 : 0)) / data.questions.length) * 100)} className="quiz-progress" />
        <div className="question-type"><HelpCircle size={14} /> {typeLabel(question.questionType)}</div>
        <h2 className="question-prompt">{question.prompt}</h2>
        {!assessment && question.questionType === "explain"
          ? <label className="field answer-field"><span>Your idea</span><textarea value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Tell us what you think..." rows="4" /></label>
          : !assessment && <div className="answer-options">{(question.options?.length ? question.options : question.questionType === "true_false" ? ["True", "False"] : []).map((option, optionIndex) => <button key={option} className={`answer-option ${answer === option ? "selected" : ""}`} onClick={() => setAnswer(option)}><span className="option-letter">{String.fromCharCode(65 + optionIndex)}</span><span>{option}</span>{answer === option && <Check className="option-check" size={18} />}</button>)}</div>}
        {assessment && <div className={`assessment-feedback ${assessment.correct ? "feedback-correct" : "feedback-practice"}`}><strong>{assessment.correct ? "Nice work!" : assessment.correct === false ? "Let's learn it together." : "Answer saved for review."}</strong><p>{assessment.feedback}</p>{assessment.adaptiveExplanation && <div className="adaptive-explanation"><strong>A simpler way to think about it</strong><p>{assessment.adaptiveExplanation.explanation}</p><p><strong>Example:</strong> {assessment.adaptiveExplanation.example}</p></div>}{assessment.misconception && <small>We'll practice this idea some more.</small>}</div>}
        {error && <p className="auth-error" role="alert">{error}</p>}
        <div className="quiz-bottom"><span className="gentle-note">🌱 Your answers help personalize your learning.</span>{assessment ? <div className="quiz-actions"><button className="button button-primary" onClick={next}>{index + 1 >= data.questions.length ? "See my progress" : "Next question"} <ArrowRight size={17} /></button>{index + 1 >= data.questions.length && <button className="button button-secondary" disabled={retrying} onClick={startFreshSet}>{retrying ? "Making fresh questions..." : "Try a fresh question set"}</button>}</div> : <button className="button button-primary" disabled={!answer.trim() || submitting} onClick={submit}>{submitting ? "Checking..." : "Check my answer"} <ArrowRight size={17} /></button>}</div>
      </section>
    </>
  );
}
