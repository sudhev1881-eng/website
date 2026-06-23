import { ALL_KNOWLEDGE_WORDS } from "@/data/knowledgeGraphWords";
import type {
  GraphEdge,
  GraphLetter,
  GraphParticle,
  GraphSnapshot,
  GraphWord,
  WordCategory,
  WordDirection,
} from "@/lib/knowledgeGraph/types";

const CELL = 1.35;
const MAX_WORDS = 140;
const MAX_LETTERS = 900;
const PARTICLE_COUNT = 220;

type GridCell = {
  char: string;
  wordIds: Set<string>;
};

type Placement = {
  row: number;
  col: number;
  direction: WordDirection;
  intersectWordId: string;
};

function cellKey(row: number, col: number) {
  return `${row},${col}`;
}

function wordCenter(word: GraphWord) {
  const mid = (word.text.length - 1) / 2;
  const x =
    word.direction === "across"
      ? (word.col + mid) * CELL
      : word.col * CELL;
  const y =
    word.direction === "across"
      ? -word.row * CELL
      : -(word.row + mid) * CELL;
  return { x, y, z: word.depth };
}

function relatedScore(a: WordCategory, b: WordCategory) {
  if (a === b) return 1;
  const pairs: [WordCategory, WordCategory][] = [
    ["AI", "Machine Learning"],
    ["Data", "Analytics"],
    ["Cloud", "Infrastructure"],
    ["Engineering", "Development"],
    ["Product", "Design"],
    ["Marketing", "Growth"],
    ["Sales", "Startups"],
    ["Security", "Infrastructure"],
    ["Research", "AI"],
    ["Automation", "Engineering"],
  ];
  return pairs.some(
    ([left, right]) =>
      (left === a && right === b) || (left === b && right === a)
  )
    ? 0.75
    : 0.35;
}

export class KnowledgeGraphEngine {
  private grid = new Map<string, GridCell>();
  private words = new Map<string, GraphWord>();
  private edges = new Map<string, GraphEdge>();
  private letters = new Map<string, GraphLetter>();
  private particles: GraphParticle[] = [];
  private usedTexts = new Set<string>();
  private wordCounter = 0;
  private edgeCounter = 0;
  private letterCounter = 0;
  private centerRow = 0;
  private centerCol = 4;
  private time = 0;

  constructor() {
    this.seedParticles();
    this.seedGraph();
  }

  private seedParticles() {
    this.particles = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: (Math.random() - 0.5) * 120,
      y: (Math.random() - 0.5) * 80,
      z: (Math.random() - 0.5) * 16,
      size: 0.02 + Math.random() * 0.05,
      speed: 0.08 + Math.random() * 0.25,
    }));
  }

  private seedGraph() {
    const seeds = [
      { text: "ENGINEERING", row: 0, col: 0, direction: "across" as const },
      { text: "AI", row: 0, col: 0, direction: "down" as const },
      { text: "DATA", row: 0, col: 4, direction: "down" as const },
      { text: "CLOUD", row: 2, col: 2, direction: "across" as const },
      { text: "PRODUCT", row: -3, col: 1, direction: "across" as const },
    ];

    seeds.forEach((seed) => {
      const entry = ALL_KNOWLEDGE_WORDS.find((item) => item.text === seed.text);
      if (!entry) return;
      this.commitWord(
        entry.text,
        entry.category,
        seed.row,
        seed.col,
        seed.direction
      );
    });
  }

  private commitWord(
    text: string,
    category: WordCategory,
    row: number,
    col: number,
    direction: WordDirection
  ) {
    const id = `w-${this.wordCounter++}`;
    const depth = (Math.random() - 0.5) * 3;
    const word: GraphWord = {
      id,
      text,
      row,
      col,
      direction,
      category,
      opacity: 0,
      reveal: 0,
      createdAt: this.time,
      depth,
    };

    this.words.set(id, word);
    this.usedTexts.add(text);

    for (let index = 0; index < text.length; index += 1) {
      const r = direction === "across" ? row : row + index;
      const c = direction === "across" ? col + index : col;
      const key = cellKey(r, c);
      const existing = this.grid.get(key);
      if (existing) {
        existing.wordIds.add(id);
      } else {
        this.grid.set(key, { char: text[index], wordIds: new Set([id]) });
      }

      const letterId = `l-${this.letterCounter++}`;
      this.letters.set(letterId, {
        id: letterId,
        char: text[index],
        row: r,
        col: c,
        wordId: id,
        opacity: 0,
        reveal: 0,
        depth,
        active: true,
      });
    }

    this.connectWord(id);
    this.trimGraph();
    return id;
  }

  private connectWord(wordId: string) {
    const word = this.words.get(wordId);
    if (!word) return;

    const center = wordCenter(word);

    for (const other of this.words.values()) {
      if (other.id === wordId) continue;
      const shared = this.shareIntersection(word, other);
      const score = relatedScore(word.category, other.category);
      if (!shared && score < 0.5) continue;

      const edgeKey = [wordId, other.id].sort().join(":");
      if (this.edges.has(edgeKey)) continue;

      const otherCenter = wordCenter(other);
      this.edges.set(edgeKey, {
        id: `e-${this.edgeCounter++}`,
        fromWordId: wordId,
        toWordId: other.id,
        x1: center.x,
        y1: center.y,
        z1: center.z,
        x2: otherCenter.x,
        y2: otherCenter.y,
        z2: otherCenter.z,
        strength: shared ? 1 : score,
      });
    }
  }

  private shareIntersection(a: GraphWord, b: GraphWord) {
    for (let i = 0; i < a.text.length; i += 1) {
      const ar = a.direction === "across" ? a.row : a.row + i;
      const ac = a.direction === "across" ? a.col + i : a.col;
      for (let j = 0; j < b.text.length; j += 1) {
        const br = b.direction === "across" ? b.row : b.row + j;
        const bc = b.direction === "across" ? b.col + j : b.col;
        if (ar === br && ac === bc) return true;
      }
    }
    return false;
  }

  private canPlace(
    text: string,
    row: number,
    col: number,
    direction: WordDirection
  ) {
    let intersectionCount = 0;

    for (let index = 0; index < text.length; index += 1) {
      const r = direction === "across" ? row : row + index;
      const c = direction === "across" ? col + index : col;
      const key = cellKey(r, c);
      const existing = this.grid.get(key);

      if (existing) {
        if (existing.char !== text[index]) return false;
        intersectionCount += 1;
        continue;
      }

      const neighbors = [
        [r - 1, c],
        [r + 1, c],
        [r, c - 1],
        [r, c + 1],
      ];

      for (const [nr, nc] of neighbors) {
        const neighbor = this.grid.get(cellKey(nr, nc));
        if (!neighbor) continue;

        const parallelConflict =
          direction === "across"
            ? nr === r && nc !== c
            : nc === c && nr !== r;

        if (parallelConflict && !neighbor.wordIds.size) {
          return false;
        }
      }
    }

    if (this.words.size === 0) return true;
    return intersectionCount > 0;
  }

  private findPlacements(text: string): Placement[] {
    const placements: Placement[] = [];

    for (const word of this.words.values()) {
      for (let wi = 0; wi < word.text.length; wi += 1) {
        for (let ti = 0; ti < text.length; ti += 1) {
          if (word.text[wi] !== text[ti]) continue;

          const wr = word.direction === "across" ? word.row : word.row + wi;
          const wc = word.direction === "across" ? word.col + wi : word.col;
          const direction: WordDirection =
            word.direction === "across" ? "down" : "across";
          const row = direction === "across" ? wr : wr - ti;
          const col = direction === "across" ? wc - ti : wc;

          if (this.canPlace(text, row, col, direction)) {
            placements.push({
              row,
              col,
              direction,
              intersectWordId: word.id,
            });
          }
        }
      }
    }

    return placements;
  }

  private pickNextWord() {
    const pool = ALL_KNOWLEDGE_WORDS.filter(
      (item) => !this.usedTexts.has(item.text)
    );
    if (pool.length === 0) {
      this.usedTexts.clear();
      return ALL_KNOWLEDGE_WORDS[
        Math.floor(Math.random() * ALL_KNOWLEDGE_WORDS.length)
      ];
    }

    const anchor = [...this.words.values()][
      Math.floor(Math.random() * this.words.size)
    ];
    const related = pool.filter(
      (item) => relatedScore(item.category, anchor.category) >= 0.75
    );
    const source = related.length > 0 ? related : pool;
    return source[Math.floor(Math.random() * source.length)];
  }

  private trimGraph() {
    while (this.words.size > MAX_WORDS) {
      const oldest = [...this.words.values()].sort(
        (a, b) => a.createdAt - b.createdAt
      )[0];
      if (!oldest) break;
      this.removeWord(oldest.id);
    }
  }

  private removeWord(wordId: string) {
    const word = this.words.get(wordId);
    if (!word) return;

    for (let index = 0; index < word.text.length; index += 1) {
      const r = word.direction === "across" ? word.row : word.row + index;
      const c = word.direction === "across" ? word.col + index : word.col;
      const key = cellKey(r, c);
      const cell = this.grid.get(key);
      if (cell) {
        cell.wordIds.delete(wordId);
        if (cell.wordIds.size === 0) {
          this.grid.delete(key);
        }
      }
    }

    for (const [id, letter] of this.letters) {
      if (letter.wordId === wordId) {
        letter.active = false;
      }
    }

    this.words.delete(wordId);

    for (const [key, edge] of this.edges) {
      if (edge.fromWordId === wordId || edge.toWordId === wordId) {
        this.edges.delete(key);
      }
    }

    this.usedTexts.delete(word.text);
  }

  expand() {
    const candidate = this.pickNextWord();
    const placements = this.findPlacements(candidate.text);

    if (placements.length === 0) {
      const direction: WordDirection = Math.random() > 0.5 ? "across" : "down";
      const row = this.centerRow + Math.floor(Math.random() * 8 - 4);
      const col = this.centerCol + Math.floor(Math.random() * 10 - 5);
      if (this.canPlace(candidate.text, row, col, direction)) {
        this.commitWord(candidate.text, candidate.category, row, col, direction);
      }
      return;
    }

    const best = placements.sort((a, b) => {
      const aw = this.words.get(a.intersectWordId);
      const bw = this.words.get(b.intersectWordId);
      const as = aw ? relatedScore(candidate.category, aw.category) : 0;
      const bs = bw ? relatedScore(candidate.category, bw.category) : 0;
      return bs - as;
    })[0];

    this.commitWord(
      candidate.text,
      candidate.category,
      best.row,
      best.col,
      best.direction
    );
  }

  tick(delta: number, pointer?: { x: number; y: number }) {
    this.time += delta;

    for (const word of this.words.values()) {
      const age = this.time - word.createdAt;
      word.reveal = Math.min(1, age * 1.8);
      word.opacity =
        age < 0.4
          ? Math.min(1, age / 0.4)
          : Math.max(0.18, 1 - Math.max(0, age - 18) * 0.04);
    }

    for (const letter of this.letters.values()) {
      const word = this.words.get(letter.wordId);
      if (!word) {
        letter.opacity = Math.max(0, letter.opacity - delta * 0.8);
        continue;
      }
      const index =
        word.direction === "across"
          ? letter.col - word.col
          : letter.row - word.row;
      const revealIndex = Math.floor(word.reveal * word.text.length);
      letter.reveal = index <= revealIndex ? 1 : 0;
      letter.opacity = word.opacity * letter.reveal;
      letter.active = true;
    }

    if (Math.random() < delta * 0.55) {
      this.expand();
    }

    this.particles = this.particles.map((particle) => ({
      ...particle,
      y: particle.y + particle.speed * delta,
      x: particle.x + Math.sin(this.time * particle.speed + particle.z) * 0.003,
      z: particle.z + Math.cos(this.time * 0.2 + particle.x) * 0.002,
    }));

    if (pointer) {
      for (const word of this.words.values()) {
        const center = wordCenter(word);
        const dx = center.x - pointer.x;
        const dy = center.y - pointer.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 6) {
          word.opacity = Math.min(1, word.opacity + (1 - dist / 6) * 0.45);
        }
      }
    }

    while (this.letters.size > MAX_LETTERS) {
      const stale = [...this.letters.entries()]
        .filter(([, letter]) => !letter.active || letter.opacity <= 0.02)
        .sort(([, a], [, b]) => a.opacity - b.opacity)[0];
      if (!stale) break;
      this.letters.delete(stale[0]);
    }
  }

  getSnapshot(): GraphSnapshot {
    return {
      words: [...this.words.values()],
      letters: [...this.letters.values()].filter((letter) => letter.opacity > 0.02),
      edges: [...this.edges.values()],
      particles: this.particles,
      centerRow: this.centerRow,
      centerCol: this.centerCol,
    };
  }
}

export { CELL as GRAPH_CELL_SIZE };
