import { useState } from 'react';
import artifacts from './data/artifacts.json';
import './App.css';

export default function App() {
  const [destination, setDestination] = useState('Moon');
  const filtered = artifacts.filter((item) => item.destination === destination);
  const [selectedId, setSelectedId] = useState(filtered[0].id);
  const [selectedOption, setSelectedOption] = useState(null);
  const [earnedBadges, setEarnedBadges] = useState([]);

  const current =
    filtered.find((item) => item.id === selectedId) || filtered[0];

  const handleDestinationChange = (newDest) => {
    setDestination(newDest);
    const firstInDest = artifacts.find((item) => item.destination === newDest);
    setSelectedId(firstInDest.id);
    setSelectedOption(null);
  };

  const handleSelectArtifact = (id) => {
    setSelectedId(id);
    setSelectedOption(null);
  };

  const handleQuizAnswer = (index) => {
    setSelectedOption(index);
    if (
      index === current.quiz.correctIndex &&
      !earnedBadges.includes(current.quiz.badge)
    ) {
      setEarnedBadges([...earnedBadges, current.quiz.badge]);
    }
  };

  return (
    <div className="app-container">
      <header className="hero">
        <span className="tag">NASA Space Apps 2026 • Interactive Space Museum</span>
        <h1>Ghost Rovers: Voices from the Cosmos</h1>
        <p>Explore the real NASA machines still resting across the Moon, Mars, and Deep Space.</p>
      </header>

      {/* Section 1: Destination Switcher */}
      <nav className="destination-tabs">
        {['Moon', 'Mars', 'Deep Space'].map((dest) => (
          <button
            key={dest}
            className={`tab-btn ${destination === dest ? 'active' : ''}`}
            onClick={() => handleDestinationChange(dest)}
          >
            {dest === 'Moon' ? '🌕 The Moon' : dest === 'Mars' ? '🔴 Mars' : '✨ Deep Space'}
          </button>
        ))}
      </nav>

      {/* Landing Zone Pin Selector */}
      <section className={`map-stage ${destination.toLowerCase().replace(' ', '-')}`}>
        <p className="map-hint">Select a spacecraft pin on {destination}:</p>
        <div className="pin-row">
          {filtered.map((item) => (
            <button
              key={item.id}
              className={`pin-btn ${current.id === item.id ? 'selected' : ''}`}
              onClick={() => handleSelectArtifact(item.id)}
            >
              📡 {item.name}
            </button>
          ))}
        </div>
      </section>

      {/* Section 2: Ghost Hardware Story Card & Audio Log */}
      <main className="story-card">
        <div className="card-header">
          <div>
            <h2>{current.name}</h2>
            <p className="meta">
              📍 {current.location} • 🗓️ {current.landingDate}
            </p>
          </div>
          <span className="status-pill">{current.status}</span>
        </div>

        <div className="audio-box">
          <label>🎙️ Incoming Transmission Log:</label>
          <audio controls key={current.audioFile} src={current.audioFile}>
            Your browser does not support the audio element.
          </audio>
        </div>

        <blockquote className="story-quote">“{current.storyHook}”</blockquote>

        <div className="science-box">
          <strong>🔬 What I Discovered:</strong> {current.scienceBreakthrough}
        </div>

        {/* Section 3: Kashelle's "By the Numbers" Space Math */}
        <h3>📐 By the Numbers (Space Math)</h3>
        <div className="math-grid">
          {current.spaceMath.map((stat, idx) => (
            <div className="math-card" key={idx}>
              <span className="math-value">{stat.value}</span>
              <span className="math-label">{stat.label}</span>
              <small>{stat.detail}</small>
            </div>
          ))}
        </div>

        {/* Section 4: Donovan's Junior Space Detective Quiz */}
        <div className="quiz-box">
          <h3>🕵️ Junior Space Detective Challenge</h3>
          <p className="quiz-q">{current.quiz.question}</p>
          <div className="quiz-options">
            {current.quiz.options.map((opt, idx) => {
              let btnClass = 'quiz-btn';
              if (selectedOption !== null) {
                if (idx === current.quiz.correctIndex) btnClass += ' correct';
                else if (idx === selectedOption) btnClass += ' wrong';
              }
              return (
                <button
                  key={idx}
                  className={btnClass}
                  onClick={() => handleQuizAnswer(idx)}
                >
                  {opt}
                </button>
              );
            })}
          </div>
          {selectedOption === current.quiz.correctIndex && (
            <p className="unlock-msg">
              🎉 Unlocked: <strong>{current.quiz.badge}</strong>!
            </p>
          )}
        </div>
      </main>

      {/* Explorer Badge Tray */}
      <footer className="badge-tray">
        <h4>🏅 Explorer Badges Earned ({earnedBadges.length} / {artifacts.length})</h4>
        <div className="badge-list">
          {earnedBadges.length === 0 ? (
            <span>Complete a Space Detective quiz above to earn your first badge!</span>
          ) : (
            earnedBadges.map((b) => (
              <span key={b} className="earned-badge">⭐ {b}</span>
            ))
          )}
        </div>
      </footer>
    </div>
  );
}