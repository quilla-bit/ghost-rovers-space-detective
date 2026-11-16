# 🛰️ Ghost Rovers: Junior Space Detective

**NASA Space Apps Challenge 2026** | *Interactive Planetary Archaeology & Space Telemetry Game for Ages 8–14*

**Ghost Rovers: Junior Space Detective** brings discarded NASA hardware left behind on the **Moon**, **Mars**, and **Deep Space** back to life. Young explorers scan planetary radar sectors, tune deep-space radio frequencies to unlock first-person spacecraft voice transmissions, analyze real Space Math telemetry, crack cryptographic space ciphers, and test their knowledge across 25 curated NASA missions.

---

## ✨ Core Features

### 📡 Ghost Rovers Radar & Audio Experience
* **Interactive Planetary Sector Radar:** Switch between **Moon**, **Mars**, and **Deep Space** sectors to locate active voice beacons across landmark mission sites.
* **Deep Space Frequency Tuner:** Slide the radio frequency dial (`112–240 MHz`) to lock onto spacecraft signals (`95%+` signal strength) and unlock incoming audio logs.
* **Simulated Spacecraft Voice Transmissions:** First-person `.m4a` audio stories voiced from the perspective of iconic hardware—including the *Apollo 11 Laser Ranging Retroreflector*, *Surveyor 3*, *Opportunity Rover*, *InSight Lander*, *Ingenuity Mars Helicopter*, and *Voyager 1*.
* **Space Math Telemetry Cards:** Kid-friendly quantitative breakdowns of mission lifespans, lunar drift rates, marsquake magnitudes, rotor RPMs, and interstellar light-time delays.

### 🧭 Junior Space Detective Mission Engines
* **25 Curated NASA Mission Dossiers:** Covers **9 Lunar**, **9 Martian**, and **7 Deep Space** artifacts with mission objectives, scientific discoveries, current status, fun facts, and verified NASA archive links.
* **Multi-Format Detective Quiz Engine:** **53 questions** across five interactive formats with difficulty filtering, randomized order, per-difficulty scoring, and post-mission accuracy debriefs.
* **Cryptographic Space Decoder:** **10 cipher puzzles** (Caesar shifts, keyword substitution, number-to-letter encoding, and artifact riddles) powered by an explicit state machine with progressive hints and attempt tracking *(all simulated transmissions clearly labeled)*.
* **Explorer Badges & Offline Persistence:** **10 unlockable badges** (including a mastery badge) and automatic `localStorage` progress saving with defensive state repair and zero backend requirements.

---

## 🛠️ Tech Stack & Verification

* **Frontend:** React 19, Vite 8, Plain JavaScript (ES Modules), Responsive CSS (zero external UI frameworks)
* **Architecture:** Fully static, offline-ready client-side application after initial asset load
* **Automated Testing:** Vitest + React Testing Library (**7 test suites, 111/111 tests passing** covering dataset schema validation, quiz/decoder/badge engines, storage persistence, and end-to-end player journeys)

---

## 🚀 Quick Start (Local Development)

```bash
cd junior-space-detective
npm install
npm run dev
