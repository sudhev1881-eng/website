export const crosswordSection = {
  eyebrow: "Crossword",
  title: "Build across the stack",
  subtitle:
    "Solve it like a real crossword — type answers, use arrow keys, check your work, or reveal a hint when you're stuck.",
};

export type CrosswordDirection = "across" | "down";

export type CrosswordEntry = {
  id: string;
  number: number;
  direction: CrosswordDirection;
  row: number;
  col: number;
  answer: string;
  clue: string;
};

export const crosswordLayout = [
  "###########",
  "#PYTHON####",
  "###########",
  "##REACT####",
  "####P######",
  "#NJIT######",
  "###########",
  "#SQL#######",
  "###WEB#####",
  "###########",
  "###########",
] as const;

export const crosswordEntries: CrosswordEntry[] = [
  {
    id: "python-across",
    number: 1,
    direction: "across",
    row: 1,
    col: 1,
    answer: "PYTHON",
    clue: "Language for apps, automation, and data systems",
  },
  {
    id: "react-across",
    number: 2,
    direction: "across",
    row: 3,
    col: 2,
    answer: "REACT",
    clue: "UI library for modern web interfaces",
  },
  {
    id: "api-down",
    number: 3,
    direction: "down",
    row: 3,
    col: 4,
    answer: "API",
    clue: "How frontends talk to backends",
  },
  {
    id: "njit-across",
    number: 4,
    direction: "across",
    row: 5,
    col: 1,
    answer: "NJIT",
    clue: "Where I study Computer Engineering",
  },
  {
    id: "sql-across",
    number: 5,
    direction: "across",
    row: 7,
    col: 1,
    answer: "SQL",
    clue: "Structured queries for databases",
  },
  {
    id: "web-across",
    number: 6,
    direction: "across",
    row: 8,
    col: 3,
    answer: "WEB",
    clue: "What I build and ship in the browser",
  },
];

export const CROSSWORD_ROWS = crosswordLayout.length;
export const CROSSWORD_COLS = crosswordLayout[0].length;
