// Stage definitions for QuestLearn
export const STAGES = [
  {
    id: "beginner",
    name: "Beginner",
    emoji: "🌱",
    color: "#22d3ee",
    dimColor: "#0c2a33",
    questionIds: [1, 2, 3, 4],
    unlockAfter: null,
    bossBonus: false,
    xpRequired: 0,
  },
  {
    id: "explorer",
    name: "Explorer",
    emoji: "🗺️",
    color: "#a78bfa",
    dimColor: "#1e1040",
    questionIds: [5, 6, 7],
    unlockAfter: "beginner",
    bossBonus: false,
    xpRequired: 60,
  },
  {
    id: "challenger",
    name: "Challenger",
    emoji: "⚔️",
    color: "#fb923c",
    dimColor: "#1f1108",
    questionIds: [8, 9, 10],
    unlockAfter: "explorer",
    bossBonus: false,
    xpRequired: 120,
  },
  {
    id: "expert",
    name: "Expert",
    emoji: "🔬",
    color: "#34d399",
    dimColor: "#0c2117",
    questionIds: [11, 12, 13],
    unlockAfter: "challenger",
    bossBonus: false,
    xpRequired: 200,
  },
  {
    id: "boss",
    name: "Boss Level",
    emoji: "💀",
    color: "#f43f5e",
    dimColor: "#2d0a14",
    questionIds: [14, 15],
    unlockAfter: "expert",
    bossBonus: true,
    xpRequired: 300,
  },
];

export function getStage(id) {
  return STAGES.find((s) => s.id === id) ?? STAGES[0];
}

export default STAGES;
