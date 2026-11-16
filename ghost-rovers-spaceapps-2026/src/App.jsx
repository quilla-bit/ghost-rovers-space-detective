import { useState, useEffect } from 'react';
import rawArtifacts from './data/artifacts.json';
import './App.css';

const artifacts = Array.isArray(rawArtifacts)
  ? rawArtifacts
  : rawArtifacts?.artifacts || [];

const TARGET_FREQUENCIES = {
  'apollo-11-lrrr': 142,
  'surveyor-3': 168,
  'opportunity-rover': 215,
  'insight-lander': 184,
  'ingenuity-helicopter': 240,
  'voyager-1': 112,
};

export default function App() {
  if (artifacts.length === 0) {
    return (
      <div className="app-container" style={{ textAlign: 'center', paddingTop: '4rem' }}>
        <h1>⚠️ Mission Data Not Found</h1>
        <p>Check that <code>src/data/artifacts.json</code> has the 6 spacecraft saved inside it!</p>
      </div>
    );
  }

  const [destination, setDestination] = useState('Moon');
  const filtered = artifacts.filter(
    (item) => item.destination?.toLowerCase() === destination.toLowerCase()
  );
  const activeList = filtered.length > 0 ? filtered : artifacts;
  const [selectedId, setSelectedId] = useState(activeList[0].id);

  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [unlockedSignals, setUnlockedSignals] = useState([]);
  const [tunerValue, setTunerValue] = useState(150);
  const [selectedOption, setSelectedOption] = useState(null);
  const [earnedBadges, setEarnedBadges] = useState([]);
  const [audioError, setAudioError] = useState(false);

  const current =
    activeList.find((item) => item.id === selectedId) || activeList[0];

  const targetFreq = TARGET_FREQUENCIES[current.id] || 150;
  const diff = Math.abs(tunerValue - targetFreq);
  const signalStrength = Math.max(0, Math.min(100, Math.round(100 - diff * 1.6)));
  const isSignalLocked =
    unlockedSignals.includes(current.id) || signalStrength >= 95;

  useEffect(() => {
    if (signalStrength >= 95 && !unlockedSignals.includes(current.id)) {
      setUnlockedSignals((prev) => [...prev, current.id]);
      setXp((prev) => prev + 50);
    }
  }, [signalStrength, current.id, unlockedSignals]);

  const getRank = () => {
    if (xp >= 550) return '👑 Cosmic Legend';
    if (xp >= 350) return '🚀 Orbital Commander';
    if (xp >= 150) return '🛰️ Mission Specialist';
    return '🧑‍🚀 Space Cadet';
  };

  const handleDestinationChange = (newDest) => {
    setDestination(newDest);
    const firstInDest = artifacts.find(
      (item) => item.destination?.toLowerCase() === newDest.toLowerCase()
    );
    if (firstInDest) setSelectedId(firstInDest.id);
    setSelectedOption(null);
    setAudioError(false);
    setTunerValue(150);
  };

  const handleSelectArtifact = (id) => {
    setSelectedId(id);
    setSelectedOption(null);
    setAudioError(false);
    setTunerValue(150);
  };

  const handleQuizAnswer = (index) => {
    if (!current.quiz || selectedOption === current.quiz.correctIndex) return;
    setSelectedOption(index);

    if (index === current.quiz.correctIndex) {
      const bonus = streak >= 1 ? 75 : 50;
      setXp((prev) => prev + bonus);
      setStreak((prev) => prev + 1);
      if (!earnedBadges.includes(current.quiz.badge)) {
        setEarnedBadges((prev) => [...prev, current.quiz.badge]);
      }
    } else {
      setStreak(0);
    }
  };

  const isCorrect = current.quiz && selectedOption === current.quiz.correctIndex;

  return (
    <div className="app-container">
      {/* Top Game HUD */}
      <div className="game-hud">
        <div className="hud-item">
          <span className="hud-label">ASTRONAUT RANK</span>
          <strong className="hud-val">{getRank()}</strong>
        </div>
        <div className="hud-item">
          <span className="hud-label">MISSION XP</span>
          <strong className="hud-val xp-glow">{xp} XP</strong>
        </div>
        <div className="hud-item">
          <span className="hud-label">COMBO STREAK</span>
          <strong className="hud-val">🔥 {streak}x</strong>
        </div>
        <div className="hud-item">
          <span className="hud-label">MISSIONS SOLVED</span>
          <strong className="hud-val">
            🏅 {earnedBadges.length} / {artifacts.length}
          </strong>
        </div>
      </div>

      {/* Hero Header */}
      <header className="hero">
        <span className="tag">NASA Space Apps 2026 • Interactive Space Mission Game</span>
        <h1>Ghost Rovers: Voices from the Cosmos</h1>
        <p>
          Scan the solar system, tune your Deep Space Radio to lock onto lost NASA
          spacecraft, and decode their secret science logs!
        </p>
      </header>

      {/* Sector Switcher */}
      <nav className="destination-tabs" aria-label="Destination selector">
        {['Moon', 'Mars', 'Deep Space'].map((dest) => (
          <button
            key={dest}
            className={`tab-btn ${destination === dest ? 'active' : ''}`}
            onClick={() => handleDestinationChange(dest)}
          >
            {dest === 'Moon'
              ? '🌕 Sector 1: The Moon'
              : dest === 'Mars'
              ? '🔴 Sector 2: Mars'
              : '✨ Sector 3: Deep Space'}
          </button>
        ))}
      </nav>

      {/* Radar Map Stage */}
      <section className={`map-stage stage-${destination.toLowerCase().replace(' ', '-')}`}>
        <div className="map-overlay">
          <p className="map-hint">
            📡 Click a beacon on <strong>{destination}</strong> to target its radio frequency:
          </p>
          <div className="radar-canvas">
            {activeList.map((item) => {
              const decoded = item.quiz && earnedBadges.includes(item.quiz.badge);
              const pos = item.mapPosition || { top: '50%', left: '50%' };
              return (
                <button
                  key={item.id}
                  style={{ top: pos.top, left: pos.left }}
                  className={`beacon-pin ${current.id === item.id ? 'selected' : ''} ${
                    decoded ? 'completed' : ''
                  }`}
                  onClick={() => handleSelectArtifact(item.id)}
                >
                  <span className="pulse-dot"></span>
                  {decoded ? `✅ ${item.name}` : item.name}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Main Mission Console */}
      <main className="story-card">
        <div className="card-header">
          <div>
            <h2>{current.name}</h2>
            <p className="meta">
              📍 {current.location} &nbsp;•&nbsp; 🗓️ {current.landingDate}
            </p>
          </div>
          <span className="status-pill">{current.status}</span>
        </div>

        {/* Mini-Game 1: Deep Space Frequency Tuner */}
        <div className={`tuner-box ${isSignalLocked ? 'locked' : ''}`}>
          <div className="tuner-top">
            <strong>
              {isSignalLocked
                ? '🟢 SIGNAL LOCKED (+50 XP)! Transmission Decoded:'
                : '📻 MINI-GAME: Drag the frequency dial to lock onto the weak signal!'}
            </strong>
            <span className="freq-readout">
              {tunerValue} MHz • Signal: <strong>{signalStrength}%</strong>
            </span>
          </div>

          {!isSignalLocked && (
            <div className="slider-wrap">
              <input
                type="range"
                min="100"
                max="260"
                value={tunerValue}
                onChange={(e) => setTunerValue(Number(e.target.value))}
                className="freq-slider"
              />
              <div className="signal-bar">
                <div
                  className="signal-fill"
                  style={{ width: `${signalStrength}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* Unlocked Mission Transmission & Science Data */}
        {isSignalLocked ? (
          <div className="unlocked-content">
            <div className="audio-box">
              <div className="audio-label">
                <strong>🎙️ Incoming Voice Transmission</strong>
                <small>Recovered audio log from {current.name}</small>
              </div>
              {!audioError && current.audioFile ? (
                <audio
                  controls
                  key={current.audioFile}
                  src={current.audioFile}
                  onError={() => setAudioError(true)}
                >
                  Your browser does not support the audio element.
                </audio>
              ) : (
                <span className="audio-fallback">
                  🔇 Audio file pending ({current.audioFile}) — read the transcript below!
                </span>
              )}
            </div>

            <blockquote className="story-quote">“{current.storyHook}”</blockquote>

            <div className="science-box">
              <strong>🔬 Decoded Discovery:</strong> {current.scienceBreakthrough}
            </div>

            {current.spaceMath && (
              <>
                <h3>📐 By the Numbers (Space Math Telemetry)</h3>
                <div className="math-grid">
                  {current.spaceMath.map((stat, idx) => (
                    <div className="math-card" key={idx}>
                      <span className="math-value">{stat.value}</span>
                      <span className="math-label">{stat.label}</span>
                      <small>{stat.detail}</small>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Mini-Game 2: Space Detective Challenge */}
            {current.quiz && (
              <div className="quiz-box">
                <h3>🕵️ Mission Decoder Challenge (+50 XP & Badge)</h3>
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
                {selectedOption !== null && (
                  <div className={`quiz-feedback ${isCorrect ? 'success' : 'retry'}`}>
                    {isCorrect ? (
                      <p>
                        🎉 <strong>Mission Complete!</strong> {current.quiz.explanation} —
                        Badge Unlocked: <strong>{current.quiz.badge}</strong>!
                      </p>
                    ) : (
                      <p>❌ Signal interference! Check the mission log above and try again.</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="locked-placeholder">
            <p>
              🔒 Transmission encrypted. Slide the radio tuner above until signal reaches{' '}
              <strong>95%+</strong> to unlock audio & telemetry!
            </p>
          </div>
        )}
      </main>

      {/* Explorer Badge Trophy Case */}
      <section className="badge-tray">
        <h4>
          🏆 Trophy Case ({earnedBadges.length} / {artifacts.length} Badges Unlocked)
        </h4>
        <div className="badge-list">
          {earnedBadges.length === 0 ? (
            <span>Lock onto a spacecraft signal and solve its challenge to earn badges!</span>
          ) : (
            earnedBadges.map((badge) => (
              <span key={badge} className="earned-badge">
                ⭐ {badge}
              </span>
            ))
          )}
        </div>
      </section>

      <footer className="sources-footer">
        <p>
          <strong>NASA Open Data Sources:</strong>{' '}
          <a href="https://science.nasa.gov/missions/" target="_blank" rel="noreferrer">
            NASA Science Missions
          </a>{' '}
          •{' '}
          <a href="https://mars.nasa.gov/" target="_blank" rel="noreferrer">
            NASA/JPL Mars Exploration
          </a>{' '}
          •{' '}
          <a href="https://voyager.jpl.nasa.gov/" target="_blank" rel="noreferrer">
            NASA/JPL Voyager Mission
          </a>
        </p>
      </footer>
    </div>
  );
}