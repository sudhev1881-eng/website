export type WordDirection = "across" | "down";

export type WordCategory =
  | "AI"
  | "Machine Learning"
  | "Automation"
  | "Startups"
  | "Engineering"
  | "Product"
  | "Security"
  | "Research"
  | "Infrastructure"
  | "Cloud"
  | "Data"
  | "Analytics"
  | "Design"
  | "Marketing"
  | "Sales"
  | "Growth"
  | "Development";

export type GraphLetter = {
  id: string;
  char: string;
  row: number;
  col: number;
  wordId: string;
  opacity: number;
  reveal: number;
  depth: number;
  active: boolean;
};

export type GraphWord = {
  id: string;
  text: string;
  row: number;
  col: number;
  direction: WordDirection;
  category: WordCategory;
  opacity: number;
  reveal: number;
  createdAt: number;
  depth: number;
};

export type GraphEdge = {
  id: string;
  fromWordId: string;
  toWordId: string;
  x1: number;
  y1: number;
  z1: number;
  x2: number;
  y2: number;
  z2: number;
  strength: number;
};

export type GraphParticle = {
  x: number;
  y: number;
  z: number;
  size: number;
  speed: number;
};

export type GraphSnapshot = {
  words: GraphWord[];
  letters: GraphLetter[];
  edges: GraphEdge[];
  particles: GraphParticle[];
  centerRow: number;
  centerCol: number;
};
