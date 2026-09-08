// League level names — Beginner → Explorer → Challenger → Expert → Boss
export const LEAGUE_LEVELS = ["Beginner", "Explorer", "Challenger", "Expert", "Boss"];

// Initial league data: 29 bots + 1 player slot (30 total)
// Bots have varied coin totals so the table is visually interesting from the start.
const INITIAL_LEAGUE_DATA = [
  { id: "player",  name: "You",            coins: 0,    leagueLevel: "Beginner",   isPlayer: true  },
  { id: "bot-1",   name: "Ada Byte",        coins: 1980, leagueLevel: "Boss",       isPlayer: false },
  { id: "bot-2",   name: "Turing Ghost",    coins: 1850, leagueLevel: "Boss",       isPlayer: false },
  { id: "bot-3",   name: "Hex Maverick",    coins: 1720, leagueLevel: "Expert",     isPlayer: false },
  { id: "bot-4",   name: "Lambda Queen",    coins: 1640, leagueLevel: "Expert",     isPlayer: false },
  { id: "bot-5",   name: "Null Pointer",    coins: 1510, leagueLevel: "Expert",     isPlayer: false },
  { id: "bot-6",   name: "Stack Overflow",  coins: 1430, leagueLevel: "Expert",     isPlayer: false },
  { id: "bot-7",   name: "Async Arrow",     coins: 1350, leagueLevel: "Challenger", isPlayer: false },
  { id: "bot-8",   name: "Proto Chain",     coins: 1280, leagueLevel: "Challenger", isPlayer: false },
  { id: "bot-9",   name: "Closure Lord",    coins: 1200, leagueLevel: "Challenger", isPlayer: false },
  { id: "bot-10",  name: "Event Loop",      coins: 1110, leagueLevel: "Challenger", isPlayer: false },
  { id: "bot-11",  name: "Regex Rogue",     coins: 1050, leagueLevel: "Challenger", isPlayer: false },
  { id: "bot-12",  name: "Binary Blaze",    coins:  980, leagueLevel: "Explorer",   isPlayer: false },
  { id: "bot-13",  name: "Scope Creep",     coins:  910, leagueLevel: "Explorer",   isPlayer: false },
  { id: "bot-14",  name: "Hoisting Hero",   coins:  860, leagueLevel: "Explorer",   isPlayer: false },
  { id: "bot-15",  name: "Debounce Dan",    coins:  800, leagueLevel: "Explorer",   isPlayer: false },
  { id: "bot-16",  name: "Memoize Max",     coins:  740, leagueLevel: "Explorer",   isPlayer: false },
  { id: "bot-17",  name: "Curry Coder",     coins:  690, leagueLevel: "Beginner",   isPlayer: false },
  { id: "bot-18",  name: "Functor Fox",     coins:  630, leagueLevel: "Beginner",   isPlayer: false },
  { id: "bot-19",  name: "Monad Monk",      coins:  570, leagueLevel: "Beginner",   isPlayer: false },
  { id: "bot-20",  name: "Semaphore Sam",   coins:  510, leagueLevel: "Beginner",   isPlayer: false },
  { id: "bot-21",  name: "Bitwise Bex",     coins:  460, leagueLevel: "Beginner",   isPlayer: false },
  { id: "bot-22",  name: "Promise Pixie",   coins:  400, leagueLevel: "Beginner",   isPlayer: false },
  { id: "bot-23",  name: "Recursion Rex",   coins:  350, leagueLevel: "Beginner",   isPlayer: false },
  { id: "bot-24",  name: "Coercion Kid",    coins:  290, leagueLevel: "Beginner",   isPlayer: false },
  { id: "bot-25",  name: "Prototype Pat",   coins:  240, leagueLevel: "Beginner",   isPlayer: false },
  { id: "bot-26",  name: "Shallow Copy",    coins:  190, leagueLevel: "Beginner",   isPlayer: false },
  { id: "bot-27",  name: "Truthy Tina",     coins:  140, leagueLevel: "Beginner",   isPlayer: false },
  { id: "bot-28",  name: "Falsy Fred",      coins:  100, leagueLevel: "Beginner",   isPlayer: false },
  { id: "bot-29",  name: "NaN Nomad",       coins:   60, leagueLevel: "Beginner",   isPlayer: false },
];

export default INITIAL_LEAGUE_DATA;
