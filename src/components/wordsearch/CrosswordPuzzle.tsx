"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  crosswordEntries,
  crosswordLayout,
  CROSSWORD_COLS,
  CROSSWORD_ROWS,
  type CrosswordDirection,
  type CrosswordEntry,
} from "@/data/crossword";
import { cn } from "@/lib/utils";
import { fadeTransition, itemTransition } from "@/lib/motion";

type CellState = {
  type: "block" | "letter";
  number?: number;
  across?: number;
  down?: number;
};

type Selection = {
  row: number;
  col: number;
  direction: CrosswordDirection;
};

function buildCells(): CellState[][] {
  const cells: CellState[][] = crosswordLayout.map((row) =>
    row.split("").map((char) =>
      char === "#"
        ? { type: "block" as const }
        : { type: "letter" as const }
    )
  );

  const numberAt = new Map<string, number>();

  crosswordEntries.forEach((entry) => {
    const key = `${entry.row},${entry.col}`;
    if (!numberAt.has(key)) {
      numberAt.set(key, entry.number);
    }
  });

  crosswordEntries.forEach((entry) => {
    const cell = cells[entry.row]?.[entry.col];
    if (!cell || cell.type === "block") return;

    cell.number = numberAt.get(`${entry.row},${entry.col}`);

    for (let index = 0; index < entry.answer.length; index += 1) {
      const row = entry.direction === "across" ? entry.row : entry.row + index;
      const col = entry.direction === "across" ? entry.col + index : entry.col;
      const target = cells[row]?.[col];
      if (!target || target.type === "block") continue;

      if (entry.direction === "across") {
        target.across = entry.number;
      } else {
        target.down = entry.number;
      }
    }
  });

  return cells;
}

function buildSolutionMap() {
  const solution = new Map<string, string>();

  crosswordLayout.forEach((row, rowIndex) => {
    row.split("").forEach((char, colIndex) => {
      if (char !== "#") {
        solution.set(cellKey(rowIndex, colIndex), char);
      }
    });
  });

  return solution;
}

function getEntryCells(entry: CrosswordEntry) {
  return Array.from({ length: entry.answer.length }, (_, index) => ({
    row: entry.direction === "across" ? entry.row : entry.row + index,
    col: entry.direction === "across" ? entry.col + index : entry.col,
  }));
}

function cellKey(row: number, col: number) {
  return `${row},${col}`;
}

function getEntryForSelection(
  cells: CellState[][],
  selection: Selection | null
) {
  if (!selection) return null;

  const cell = cells[selection.row]?.[selection.col];
  if (!cell || cell.type === "block") return null;

  const number =
    selection.direction === "across" ? cell.across : cell.down;
  if (!number) return null;

  return (
    crosswordEntries.find(
      (entry) =>
        entry.number === number && entry.direction === selection.direction
    ) ?? null
  );
}

const STATIC_CELLS = buildCells();
const SOLUTION = buildSolutionMap();

function createEmptyInput() {
  const input: Record<string, string> = {};
  SOLUTION.forEach((_, key) => {
    input[key] = "";
  });
  return input;
}

export function CrosswordPuzzle() {
  const gridRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<Selection>({
    row: 1,
    col: 1,
    direction: "across",
  });
  const [input, setInput] = useState<Record<string, string>>(createEmptyInput);
  const [solvedIds, setSolvedIds] = useState<Set<string>>(new Set());
  const [wrongCells, setWrongCells] = useState<Set<string>>(new Set());
  const [pulseId, setPulseId] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [cellMin, setCellMin] = useState("1.5rem");

  useEffect(() => {
    const updateCellSize = () => {
      const width = window.innerWidth;
      if (width < 380) {
        setCellMin("1.35rem");
      } else if (width < 640) {
        setCellMin("1.55rem");
      } else {
        setCellMin("2rem");
      }
    };

    updateCellSize();
    window.addEventListener("resize", updateCellSize);
    return () => window.removeEventListener("resize", updateCellSize);
  }, []);

  const activeEntry = useMemo(
    () => getEntryForSelection(STATIC_CELLS, selection),
    [selection]
  );

  const highlighted = useMemo(() => {
    if (!activeEntry) return new Set<string>();
    return new Set(
      getEntryCells(activeEntry).map((cell) => cellKey(cell.row, cell.col))
    );
  }, [activeEntry]);

  const isComplete = solvedIds.size === crosswordEntries.length;

  const updateSolvedFromInput = useCallback(
    (nextInput: Record<string, string>) => {
      const nextSolved = new Set<string>();

      crosswordEntries.forEach((entry) => {
        const cells = getEntryCells(entry);
        const isCorrect = cells.every((cell) => {
          const key = cellKey(cell.row, cell.col);
          return nextInput[key]?.toUpperCase() === SOLUTION.get(key);
        });

        if (isCorrect) {
          nextSolved.add(entry.id);
        }
      });

      setSolvedIds(nextSolved);
      return nextSolved;
    },
    []
  );

  const selectCell = useCallback((row: number, col: number) => {
    const cell = STATIC_CELLS[row]?.[col];
    if (!cell || cell.type === "block") return;

    setSelection((current) => {
      if (
        current.row === row &&
        current.col === col &&
        current.direction === "across" &&
        cell.down
      ) {
        return { row, col, direction: "down" };
      }

      if (
        current.row === row &&
        current.col === col &&
        current.direction === "down" &&
        cell.across
      ) {
        return { row, col, direction: "across" };
      }

      if (cell.across) {
        return { row, col, direction: "across" };
      }

      if (cell.down) {
        return { row, col, direction: "down" };
      }

      return current;
    });

    gridRef.current?.focus();
  }, []);

  const selectClue = (entry: CrosswordEntry) => {
    setSelection({
      row: entry.row,
      col: entry.col,
      direction: entry.direction,
    });
    gridRef.current?.focus();
  };

  const moveSpatial = useCallback(
    (dRow: number, dCol: number, direction: CrosswordDirection) => {
      let row = selection.row + dRow;
      let col = selection.col + dCol;

      while (row >= 0 && row < CROSSWORD_ROWS && col >= 0 && col < CROSSWORD_COLS) {
        const cell = STATIC_CELLS[row]?.[col];
        if (cell?.type === "letter") {
          setSelection({ row, col, direction });
          return;
        }
        row += dRow;
        col += dCol;
      }
    },
    [selection.col, selection.row]
  );

  const moveAlongWord = useCallback(
    (delta: number) => {
      if (!activeEntry) return;

      const cells = getEntryCells(activeEntry);
      const index = cells.findIndex(
        (cell) => cell.row === selection.row && cell.col === selection.col
      );
      const next = cells[index + delta];
      if (!next) return;

      setSelection((current) => ({
        ...current,
        row: next.row,
        col: next.col,
      }));
    },
    [activeEntry, selection.col, selection.row]
  );

  const setLetter = useCallback(
    (letter: string) => {
      const key = cellKey(selection.row, selection.col);
      if (!SOLUTION.has(key)) return;

      const nextInput = {
        ...input,
        [key]: letter.toUpperCase(),
      };

      setInput(nextInput);
      setWrongCells(new Set());
      setChecked(false);
      updateSolvedFromInput(nextInput);
      moveAlongWord(1);
    },
    [input, moveAlongWord, selection.col, selection.row, updateSolvedFromInput]
  );

  const clearLetter = useCallback(() => {
    const key = cellKey(selection.row, selection.col);
    if (!SOLUTION.has(key)) return;

    const nextInput = { ...input, [key]: "" };
    setInput(nextInput);
    setWrongCells(new Set());
    updateSolvedFromInput(nextInput);
    moveAlongWord(-1);
  }, [input, moveAlongWord, selection.col, selection.row, updateSolvedFromInput]);

  const checkPuzzle = () => {
    const wrong = new Set<string>();

    SOLUTION.forEach((answer, key) => {
      const value = input[key]?.toUpperCase() ?? "";
      if (!value || value !== answer) {
        wrong.add(key);
      }
    });

    setWrongCells(wrong);
    setChecked(true);

    const nextSolved = updateSolvedFromInput(input);
    if (nextSolved.size === crosswordEntries.length) {
      setPulseId("complete");
      window.setTimeout(() => setPulseId(null), 1200);
    }
  };

  const revealWord = () => {
    if (!activeEntry || solvedIds.has(activeEntry.id)) return;

    const nextInput = { ...input };
    getEntryCells(activeEntry).forEach((cell) => {
      const key = cellKey(cell.row, cell.col);
      const answer = SOLUTION.get(key);
      if (answer) nextInput[key] = answer;
    });

    setInput(nextInput);
    setWrongCells(new Set());
    const nextSolved = updateSolvedFromInput(nextInput);
    setPulseId(activeEntry.id);
    window.setTimeout(() => setPulseId(null), 500);

    if (nextSolved.has(activeEntry.id)) {
      setSolvedIds(nextSolved);
    }
  };

  const revealAll = () => {
    const nextInput = { ...input };
    SOLUTION.forEach((answer, key) => {
      nextInput[key] = answer;
    });
    setInput(nextInput);
    setWrongCells(new Set());
    updateSolvedFromInput(nextInput);
    setPulseId("complete");
    window.setTimeout(() => setPulseId(null), 1200);
  };

  const resetPuzzle = () => {
    setInput(createEmptyInput());
    setSolvedIds(new Set());
    setWrongCells(new Set());
    setChecked(false);
    setSelection({ row: 1, col: 1, direction: "across" });
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const focused =
        document.activeElement === gridRef.current ||
        gridRef.current?.contains(document.activeElement);
      if (!focused) return;

      if (event.key === "Backspace") {
        event.preventDefault();
        clearLetter();
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        moveSpatial(0, 1, "across");
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        moveSpatial(0, -1, "across");
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        moveSpatial(1, 0, "down");
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        moveSpatial(-1, 0, "down");
        return;
      }

      if (event.key === " " && activeEntry) {
        event.preventDefault();
        setSelection((current) => ({
          ...current,
          direction: current.direction === "across" ? "down" : "across",
        }));
        return;
      }

      if (/^[a-zA-Z]$/.test(event.key)) {
        event.preventDefault();
        setLetter(event.key);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeEntry, clearLetter, moveSpatial, setLetter]);

  const across = crosswordEntries.filter((entry) => entry.direction === "across");
  const down = crosswordEntries.filter((entry) => entry.direction === "down");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-[12px] tracking-wide text-[#888] uppercase">
          {solvedIds.size} of {crosswordEntries.length} solved
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={checkPuzzle}
            className="rounded-full border border-[#1a1a1a] bg-[#1a1a1a] px-4 py-1.5 text-[13px] text-white transition-opacity hover:opacity-90"
          >
            Check puzzle
          </button>
          <button
            type="button"
            onClick={revealWord}
            disabled={!activeEntry || solvedIds.has(activeEntry.id)}
            className="rounded-full border border-[#E0E0E0] bg-white px-4 py-1.5 text-[13px] text-[#444] transition-colors hover:border-[#CCC] disabled:opacity-40"
          >
            Reveal word
          </button>
          <button
            type="button"
            onClick={resetPuzzle}
            className="rounded-full border border-[#E0E0E0] bg-white px-4 py-1.5 text-[13px] text-[#444] transition-colors hover:border-[#CCC]"
          >
            Reset
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isComplete ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-[14px] font-medium text-emerald-800"
          >
            Puzzle complete — you nailed the stack.
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <div className="overflow-x-auto rounded-2xl border border-[#E0E0E0] bg-white p-4 shadow-sm sm:p-6">
          <div
            ref={gridRef}
            tabIndex={0}
            role="grid"
            aria-label="Crossword puzzle"
            className="mx-auto grid w-fit border-2 border-[#1a1a1a] outline-none focus-visible:ring-2 focus-visible:ring-[#93C5FD] focus-visible:ring-offset-2"
            style={{
              gridTemplateColumns: `repeat(${CROSSWORD_COLS}, minmax(${cellMin}, 2.5rem))`,
            }}
          >
            {STATIC_CELLS.map((row, rowIndex) =>
              row.map((cell, colIndex) => {
                if (cell.type === "block") {
                  return (
                    <div
                      key={cellKey(rowIndex, colIndex)}
                      className="aspect-square bg-[#1a1a1a]"
                    />
                  );
                }

                const key = cellKey(rowIndex, colIndex);
                const value = input[key] ?? "";
                const isHighlighted = highlighted.has(key);
                const isFocused =
                  selection.row === rowIndex && selection.col === colIndex;
                const isWrong = checked && wrongCells.has(key);
                const isCorrectCell =
                  value && value === SOLUTION.get(key) && !isWrong;

                const solvedEntry = crosswordEntries.find((entry) => {
                  if (!solvedIds.has(entry.id)) return false;
                  return getEntryCells(entry).some(
                    (item) => item.row === rowIndex && item.col === colIndex
                  );
                });

                return (
                  <motion.button
                    key={key}
                    type="button"
                    layout
                    onMouseDown={(event) => {
                      event.preventDefault();
                      selectCell(rowIndex, colIndex);
                    }}
                    animate={{
                      scale:
                        pulseId &&
                        solvedEntry &&
                        (pulseId === "complete" || pulseId === solvedEntry.id)
                          ? [1, 1.08, 1]
                          : 1,
                    }}
                    transition={fadeTransition}
                    className={cn(
                      "relative flex aspect-square items-center justify-center border border-[#D0D0D0] bg-white font-mono text-sm font-semibold uppercase transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] sm:text-base",
                      isHighlighted && !solvedEntry && "bg-[#EFF6FF] border-[#93C5FD]",
                      solvedEntry && "bg-emerald-100 border-emerald-300 text-emerald-950",
                      isFocused && "ring-2 ring-[#1a1a1a] ring-inset z-10",
                      isWrong && "bg-rose-50 border-rose-300 text-rose-700",
                      isCorrectCell && !solvedEntry && checked && "text-[#1a1a1a]"
                    )}
                  >
                    {cell.number ? (
                      <span className="absolute top-0.5 left-1 text-[9px] font-medium text-[#666]">
                        {cell.number}
                      </span>
                    ) : null}
                    {value}
                  </motion.button>
                );
              })
            )}
          </div>
          <p className="mt-4 text-center font-mono text-[10px] text-[#AAA] sm:text-[11px]">
            <span className="sm:hidden">Tap grid, type letters · arrows move</span>
            <span className="hidden sm:inline">
              Click the grid, then type. Arrows move · Space toggles direction
            </span>
          </p>
        </div>

        <div className="space-y-5 rounded-2xl border border-[#ECECEC] bg-[#FAFAFA] p-5">
          <AnimatePresence mode="wait">
            {activeEntry ? (
              <motion.div
                key={activeEntry.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={itemTransition}
                className="rounded-xl border border-[#E0E0E0] bg-white px-4 py-3"
              >
                <p className="font-mono text-[10px] tracking-[0.18em] text-[#999] uppercase">
                  {activeEntry.direction} · {activeEntry.number}
                </p>
                <p className="mt-1 text-[15px] leading-relaxed text-[#1a1a1a]">
                  {activeEntry.clue}
                </p>
                <p className="mt-2 font-mono text-[11px] text-[#AAA]">
                  {activeEntry.answer.length} letters
                  {solvedIds.has(activeEntry.id) ? " · solved" : ""}
                </p>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <ClueList
            title="Across"
            entries={across}
            activeId={activeEntry?.id}
            solvedIds={solvedIds}
            onSelect={selectClue}
          />

          <ClueList
            title="Down"
            entries={down}
            activeId={activeEntry?.id}
            solvedIds={solvedIds}
            onSelect={selectClue}
          />

          <button
            type="button"
            onClick={revealAll}
            className="w-full rounded-xl border border-dashed border-[#D0D0D0] bg-white px-4 py-2.5 text-[13px] text-[#666] transition-colors hover:border-[#AAA] hover:text-[#1a1a1a]"
          >
            Reveal entire puzzle
          </button>
        </div>
      </div>
    </div>
  );
}

function ClueList({
  title,
  entries,
  activeId,
  solvedIds,
  onSelect,
}: {
  title: string;
  entries: CrosswordEntry[];
  activeId?: string;
  solvedIds: Set<string>;
  onSelect: (entry: CrosswordEntry) => void;
}) {
  return (
    <div>
      <h3 className="font-mono text-[11px] tracking-[0.18em] text-[#999] uppercase">
        {title}
      </h3>
      <ul className="mt-3 space-y-2">
        {entries.map((entry) => {
          const isSolved = solvedIds.has(entry.id);
          const isActive = activeId === entry.id;

          return (
            <li key={entry.id}>
              <button
                type="button"
                onClick={() => onSelect(entry)}
                className={cn(
                  "w-full rounded-lg px-3 py-2 text-left text-[14px] leading-snug transition-all",
                  isActive && "bg-[#1a1a1a] text-white shadow-sm",
                  !isActive && isSolved && "bg-emerald-50 text-emerald-900 line-through decoration-emerald-400",
                  !isActive && !isSolved && "text-[#444] hover:bg-white"
                )}
              >
                <span className="font-mono text-[12px]">{entry.number}.</span>{" "}
                {entry.clue}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
