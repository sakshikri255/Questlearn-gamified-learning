// themes.js — all story theme definitions for QuestLearn.
// Each theme is self-contained: id, display name, emoji, accent colour,
// a short story intro shown on the mission page, and 3 chapter titles
// used to populate the chapter-progress bar.

const THEMES = [
  {
    id: "cyber",
    name: "Cyber City",
    emoji: "🌆",
    accent: "#22d3ee",        // cyan
    accentDim: "#164e63",     // dark cyan background tint
    story:
      "You are a rookie hacker in Neo-Tokyo, 2087. The city's power grid has been hijacked by a rogue AI. " +
      "To shut it down you must solve a series of code challenges hidden inside the grid's firewall. " +
      "The clock is ticking — one wrong answer and the city goes dark.",
    chapters: ["Breach the Firewall", "Crack the Core", "Shut Down the AI"],
  },
  {
    id: "space",
    name: "Space Rescue",
    emoji: "🚀",
    accent: "#a78bfa",        // violet
    accentDim: "#2e1065",     // dark violet background tint
    story:
      "Your deep-space rescue vessel picks up a distress signal from an abandoned research station orbiting Jupiter. " +
      "The station's navigation computer is corrupted. To dock safely and save the crew " +
      "you must debug the onboard code before the orbit decays.",
    chapters: ["Approach & Scan", "Dock & Debug", "Restore & Rescue"],
  },
  {
    id: "detective",
    name: "Detective Mystery",
    emoji: "🔍",
    accent: "#fbbf24",        // amber
    accentDim: "#451a03",     // dark amber background tint
    story:
      "The city's most valuable algorithm has been stolen from the DataVault. " +
      "You are the only detective in town who can read code. " +
      "Follow the clues, question the suspects, and reconstruct the missing logic " +
      "before the thief sells it to the highest bidder.",
    chapters: ["Examine the Scene", "Follow the Trail", "Catch the Thief"],
  },
];

// Helper — look up a theme by id, falling back to Cyber City if not found.
export function getTheme(id) {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

export default THEMES;
