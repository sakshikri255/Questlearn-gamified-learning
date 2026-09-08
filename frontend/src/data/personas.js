// ─────────────────────────────────────────────────────────────────────────────
// personas.js — Persona Mode definitions
// Each persona changes the explanation prompt, feedback messages, accent colour,
// and the keyword set the backend checks against.
// ─────────────────────────────────────────────────────────────────────────────

const PERSONAS = [
  {
    id: "scientist",
    emoji: "🔬",
    name: "Scientist",
    tagline: "Hypothesize. Test. Conclude.",
    description: "Use evidence-based reasoning. Cite facts, causes, and effects.",
    accent: "#22d3ee",
    accentDim: "rgba(34,211,238,0.12)",
    promptLabel: "State your evidence-based reasoning…",
    placeholder: "Explain using words like: evidence, because, therefore, proves, data…",
    successMsg: "🔬 Hypothesis confirmed, Scientist!",
    failMsg: "🔬 Your hypothesis needs more evidence, Scientist.",
    chapterMsg: "🔬 Peer-reviewed and approved! Chapter unlocked.",
    keywords: ["evidence", "because", "therefore", "proves", "data", "fact", "result", "causes", "shows"],
  },
  {
    id: "detective",
    emoji: "🕵️",
    name: "Detective",
    tagline: "Every clue leads somewhere.",
    description: "Use deductive reasoning. Eliminate wrong options and deduce the answer.",
    accent: "#f59e0b",
    accentDim: "rgba(245,158,11,0.12)",
    promptLabel: "State your deduction…",
    placeholder: "Explain using words like: clue, suggests, eliminated, deduced, therefore…",
    successMsg: "🕵️ Case solved, Detective!",
    failMsg: "🕵️ The case remains open. Your deduction needs work.",
    chapterMsg: "🕵️ The mystery is cracked! Chapter unlocked.",
    keywords: ["clue", "suggests", "eliminated", "deduced", "therefore", "ruled out", "process", "conclude", "because"],
  },
  {
    id: "wizard",
    emoji: "🧙",
    name: "Wizard",
    tagline: "Ancient wisdom speaks through you.",
    description: "Use metaphors and analogies. Creative, story-like explanations win.",
    accent: "#a78bfa",
    accentDim: "rgba(167,139,250,0.12)",
    promptLabel: "Cast your wisdom in an analogy or metaphor…",
    placeholder: "Use a comparison or story — e.g. 'It's like a…', 'Think of it as…'",
    successMsg: "🧙 The spell is cast! Wisdom accepted.",
    failMsg: "🧙 Your magic lacks a metaphor. Try an analogy.",
    chapterMsg: "🧙 A legendary spell! Chapter unlocked.",
    keywords: ["like", "similar", "imagine", "think of", "as if", "analogy", "compared", "just as", "metaphor"],
  },
  {
    id: "warrior",
    emoji: "⚔️",
    name: "Warrior",
    tagline: "No hesitation. Strike fast.",
    description: "Answer in under 30 seconds. Short, direct, confident — no fluff.",
    accent: "#ef4444",
    accentDim: "rgba(239,68,68,0.12)",
    promptLabel: "Strike fast — explain in one sharp sentence…",
    placeholder: "Be direct and confident. State the core reason clearly.",
    successMsg: "⚔️ Swift and decisive! Victory is yours.",
    failMsg: "⚔️ Hesitation costs the battle. Try again, Warrior.",
    chapterMsg: "⚔️ A legendary strike! Chapter unlocked.",
    keywords: ["because", "therefore", "directly", "means", "result", "so", "causes", "leads to"],
    timerSeconds: 30,
  },
  {
    id: "sage",
    emoji: "🌿",
    name: "Sage",
    tagline: "True wisdom is teaching others.",
    description: "Explain as if teaching a beginner. Simple language, no jargon.",
    accent: "#34d399",
    accentDim: "rgba(52,211,153,0.12)",
    promptLabel: "Explain this to a complete beginner…",
    placeholder: "Use simple words. Avoid jargon. Pretend you're teaching a 10-year-old.",
    successMsg: "🌿 Beautifully clear! Your student would understand.",
    failMsg: "🌿 A true Sage simplifies. Avoid jargon and keep it clear.",
    chapterMsg: "🌿 Wisdom shared and understood! Chapter unlocked.",
    keywords: ["simply", "basically", "means", "think of", "in other words", "example", "like", "so", "because", "this works"],
  },
];

export default PERSONAS;

export function getPersona(id) {
  return PERSONAS.find((p) => p.id === id) ?? PERSONAS[0];
}
