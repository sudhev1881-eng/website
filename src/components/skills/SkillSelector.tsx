"use client";

import { skillNodes, type SkillId } from "@/data/skills";
import { cn } from "@/lib/utils";

interface SkillSelectorProps {
  active: SkillId;
  onSelect: (skill: SkillId) => void;
}

export function SkillSelector({ active, onSelect }: SkillSelectorProps) {
  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] md:mx-0 md:flex-wrap md:justify-center md:overflow-visible md:px-0 md:pb-0 [&::-webkit-scrollbar]:hidden">
      {skillNodes.map((node) => (
        <button
          key={node.id}
          type="button"
          onClick={() => onSelect(node.id)}
          className={cn(
            "shrink-0 rounded-full px-4 py-2 text-[13px] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] md:px-5 md:py-2.5 md:text-[14px]",
            active === node.id
              ? "bg-[#1a1a1a] text-white shadow-sm"
              : "border border-[#E0E0E0] bg-white text-[#555] hover:border-[#CCC] hover:text-[#1a1a1a]"
          )}
        >
          {node.label}
        </button>
      ))}
    </div>
  );
}
