import React, { useState } from "react";
import { ArrowLeft, ArrowRight, Bookmark, Headphones, Pause, Volume2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import PageHeading from "../../components/common/PageHeading.jsx";
import ProgressBar from "../../components/common/ProgressBar.jsx";

export default function StoryReaderPage() {
  const navigate = useNavigate();
  const [chapter, setChapter] = useState(1);
  const [saved, setSaved] = useState(false);
  const [playing, setPlaying] = useState(false);

  return (
    <>
      <PageHeading eyebrow="YOUR STORY IS READY" title={<>The little astronaut's big discovery <span>🚀</span></>} description="A space adventure about our solar system." action={<button className={`icon-button bookmark-button ${saved ? "saved" : ""}`} aria-label="Save story" onClick={() => setSaved(!saved)}><Bookmark size={18} fill={saved ? "currentColor" : "none"} /></button>} />
      <section className="reader-card">
        <div className="reader-cover"><div className="cover-orbit orbit-one" /><div className="cover-orbit orbit-two" /><span className="cover-star cover-star-one">✦</span><span className="cover-star cover-star-two">✧</span><span className="cover-moon">🌙</span><span className="cover-astronaut">🧑‍🚀</span><span className="cover-planet">🪐</span><div className="cover-title">A little astronaut's<br />big discovery</div><span className="cover-tag">A SPACE STORY</span></div>
        <div className="reader-controls"><div className="reader-chapter"><span>CHAPTER {chapter} OF 3</span><strong>{chapter === 1 ? "A very curious question" : chapter === 2 ? "The dancing planets" : "A sky full of wonders"}</strong></div><div className="reader-control-buttons"><button className="icon-button" aria-label={playing ? "Pause story audio" : "Play story audio"} onClick={() => setPlaying(!playing)}>{playing ? <Pause size={17} /> : <Headphones size={18} />}</button><button className="icon-button" aria-label="Audio settings"><Volume2 size={18} /></button></div></div>
        <ProgressBar value={chapter * 33} className="reader-progress" />
        <article className="story-text">
          <p className="story-dropcap">M</p>
          <p>Milo had a question that kept bouncing around his brain: <em>What makes our planet so special?</em> So he climbed into his shiny little rocket, fastened his star-shaped seat belt, and zoomed up, up, and away!</p>
          <p>First, Milo spotted <strong>Mercury</strong>, the smallest planet, zipping close to the Sun. Next came <strong>Venus</strong>, glowing bright like a golden marble. And then—there it was—<strong>Earth</strong>, his blue-and-green home.</p>
          <div className="story-callout"><span>🌍</span><p>Earth is just the right distance from the Sun. That means it has liquid water and just-right temperatures for living things!</p></div>
          <p>Milo smiled. From space, Earth looked like a tiny blue marble wrapped in soft, swirly clouds. “Home really is amazing,” he whispered.</p>
        </article>
        <div className="reader-footer"><Link to="/create-story" className="button button-quiet"><ArrowLeft size={16} /> Story settings</Link><button className="button button-primary" onClick={() => chapter < 3 ? setChapter(chapter + 1) : navigate("/quiz")}>{chapter < 3 ? "Next chapter" : "Ready for a quick quiz?"}<ArrowRight size={17} /></button></div>
      </section>
      <div className="reader-hint"><span>✨</span> Read at your own pace. Your story will be right here when you come back.</div>
    </>
  );
}
