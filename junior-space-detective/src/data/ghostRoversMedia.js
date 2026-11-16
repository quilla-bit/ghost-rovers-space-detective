export const GHOST_MISSIONS = [
  {
    key: "apollo11",
    matchKeywords: ["apollo 11", "retroreflector", "lrrr", "eagle"],
    destination: "Moon",
    frequencyMhz: 142,
    audioFile: "/audio/apollo11.m4a",
    mapPosition: { top: "40%", left: "64%" },
    voiceStory:
      "Incoming transmission from Tranquility Base on the Moon. Hey there, Earth explorer! Apollo 11 astronauts left me behind in the grey lunar dust back in 1969. Yet every week, scientists on Earth fire super-powered green lasers across 238,000 miles of space straight at my mirrors and bounce that light right back home in 2.5 seconds!",
    spaceMath: [
      { label: "Active Lifespan", value: "57+ Years", detail: "Longest-running lunar experiment" },
      { label: "Mirror Prisms", value: "100 Cubes", detail: "Fused-silica corner reflectors" },
      { label: "Laser Round-Trip", value: "2.5 Seconds", detail: "Light speed to Moon and back" },
      { label: "Lunar Drift Rate", value: "3.8 cm / yr", detail: "38 cm farther every decade" },
    ],
  },
  {
    key: "surveyor3",
    matchKeywords: ["surveyor 3", "surveyor"],
    destination: "Moon",
    frequencyMhz: 168,
    audioFile: "/audio/surveyor3.m4a",
    mapPosition: { top: "62%", left: "32%" },
    voiceStory:
      "BEEP-BOOP! Calling Earth from the Ocean of Storms! When I landed on the Moon in 1967, I sat alone in the freezing dark for 31 long months. Then THUMP, THUMP, THUMP! Apollo 12 astronauts walked right down into my crater, waved hello, and brought my camera back to Earth!",
    spaceMath: [
      { label: "Alone on Moon", value: "31 Months", detail: "944 days before astronaut visit" },
      { label: "Apollo 12 Distance", value: "180 Meters", detail: "Pinpoint landing right next door" },
      { label: "Parts Returned", value: "10 kg", detail: "TV camera and scoop brought home" },
      { label: "Trench Depth", value: "17.5 cm", detail: "Lunar soil tested by scoop" },
    ],
  },
  {
    key: "opportunity",
    matchKeywords: ["opportunity"],
    destination: "Mars",
    frequencyMhz: 215,
    audioFile: "/audio/opportunity.m4a",
    mapPosition: { top: "64%", left: "25%" },
    voiceStory:
      "Rover Opportunity reporting from Mars! When NASA built me, they gave me a 90-day warranty—and I kept rolling for nearly 15 Earth years! I drove over 28 miles across the red dust and proved liquid water once flowed on Mars before a massive dust storm turned the sky pitch black.",
    spaceMath: [
      { label: "Lifespan Bonus", value: "56.7x", detail: "5,111 sols vs. 90 sols planned" },
      { label: "Distance Driven", value: "45.16 km", detail: "28.06 miles off-world record" },
      { label: "Photos Sent", value: "217,594", detail: "Raw Martian images beamed home" },
      { label: "Active Years", value: "14.5 Years", detail: "Operational from 2004 to 2018" },
    ],
  },
  {
    key: "insight",
    matchKeywords: ["insight"],
    destination: "Mars",
    frequencyMhz: 184,
    audioFile: "/audio/insight.m4a",
    mapPosition: { top: "52%", left: "75%" },
    voiceStory:
      "Shhh, listen closely! This is the InSight Lander on Mars. I put my ear to the ground to listen to the heartbeat of Mars—feeling over 1,300 rumbling marsquakes and meteorite crashes to map Mars's deep liquid iron core!",
    spaceMath: [
      { label: "Marsquakes Heard", value: "1,319", detail: "First seismic map of Mars" },
      { label: "Biggest Quake", value: "Mag 4.7", detail: "Recorded in May 2022" },
      { label: "Liquid Core Radius", value: "1,830 km", detail: "Measured via seismic waves" },
      { label: "Solar Power Drop", value: "94% Loss", detail: "Dust blanketed solar panels" },
    ],
  },
  {
    key: "ingenuity",
    matchKeywords: ["ingenuity"],
    destination: "Mars",
    frequencyMhz: 240,
    audioFile: "/audio/ingenuity.m4a",
    mapPosition: { top: "26%", left: "48%" },
    voiceStory:
      "WHOOSH! Spinning up rotors at 2,400 RPM! Everyone said flying on Mars was impossible because the air is 100 times thinner than Earth's—yet I completed 72 flights across Jezero Crater instead of just 5!",
    spaceMath: [
      { label: "Flight Bonus", value: "14.4x", detail: "72 flights vs. 5 planned" },
      { label: "Blade Spin Speed", value: "2,400 RPM", detail: "10x faster than Earth choppers" },
      { label: "Total Distance", value: "17.0 km", detail: "10.5 miles flown across Mars" },
      { label: "Total Airtime", value: "128.8 Mins", detail: "Over 2 hours aloft on Mars" },
    ],
  },
  {
    key: "voyager1",
    matchKeywords: ["voyager 1", "voyager"],
    destination: "Deep Space",
    frequencyMhz: 112,
    audioFile: "/audio/voyager1.m4a",
    mapPosition: { top: "48%", left: "50%" },
    voiceStory:
      "Transmission received from interstellar space over 15 billion miles from Earth. I am Voyager 1, carrying the Golden Record—a time capsule of Earth's music, whale songs, and greetings in 55 languages—out among the stars!",
    spaceMath: [
      { label: "Distance from Earth", value: "24+ Billion km", detail: "Over 162x Earth-Sun distance" },
      { label: "Cruising Speed", value: "61,000 km/h", detail: "~38,000 miles per hour" },
      { label: "Radio Signal Delay", value: "22.5+ Hours", detail: "One-way travel at light speed" },
      { label: "Mission Age", value: "49 Years", detail: "Still transmitting since 1977" },
    ],
  },
];

export function getGhostMediaForArtifact(artifact) {
  if (!artifact) return null;
  const haystack = `${artifact.id || ""} ${artifact.name || ""} ${artifact.mission || ""}`.toLowerCase();
  return (
    GHOST_MISSIONS.find((entry) =>
      entry.matchKeywords.some((kw) => haystack.includes(kw))
    ) || null
  );
}