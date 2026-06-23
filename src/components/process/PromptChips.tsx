"use client";

interface PromptChipsProps {
  prompts: string[];
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}

export function PromptChips({ prompts, onSelect, disabled }: PromptChipsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {prompts.map((prompt) => (
        <button
          key={prompt}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(prompt)}
          className="rounded-full border border-[#DDD] bg-white px-3 py-1.5 text-[12px] text-[#444] transition-colors hover:border-[#BBB] hover:bg-[#FAFAFA] disabled:opacity-50"
        >
          {prompt}
        </button>
      ))}
    </div>
  );
}
