"use client";

import { site } from "@/data/site";
import { skillNodes, type SkillId } from "@/data/skills";
import { cn } from "@/lib/utils";

const RADIUS = 118;
const CENTER = { x: 200, y: 180 };

function nodePosition(angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: CENTER.x + RADIUS * Math.cos(rad),
    y: CENTER.y + RADIUS * Math.sin(rad),
  };
}

interface SkillsDiagramProps {
  active: SkillId;
  onSelect: (skill: SkillId) => void;
}

export function SkillsDiagram({ active, onSelect }: SkillsDiagramProps) {
  return (
    <div className="relative flex h-[420px] flex-col rounded-xl bg-[#EBEBEB] p-4">
      <div className="mb-3 flex items-center justify-between text-[11px] text-[#888]">
        <span className="rounded-md bg-white/80 px-2 py-1">
          {site.firstName.toLowerCase()}/skills/stack
        </span>
        <span className="rounded-md bg-white/80 px-2 py-1 capitalize">
          {active}
        </span>
      </div>

      <div className="relative flex flex-1 items-center justify-center">
        <svg
          viewBox="0 0 400 360"
          className="diagram-canvas h-full w-full max-h-[340px]"
          aria-label="Skills diagram"
        >
          {skillNodes.map((node) => {
            const pos = nodePosition(node.angle);
            const isActive = node.id === active;
            return (
              <line
                key={`line-${node.id}`}
                x1={CENTER.x}
                y1={CENTER.y}
                x2={pos.x}
                y2={pos.y}
                className="diagram-line"
                stroke={isActive ? "#999" : undefined}
                strokeWidth={isActive ? 1.5 : 1}
              />
            );
          })}

          <g
            className="diagram-center-pulse"
            transform={`translate(${CENTER.x}, ${CENTER.y})`}
          >
            <rect
              x="-44"
              y="-28"
              width="88"
              height="56"
              rx="10"
              fill="white"
              stroke="#DDD"
              strokeWidth="1"
            />
            <text
              x="0"
              y="-4"
              textAnchor="middle"
              fontSize="16"
              dominantBaseline="middle"
            >
              ⚡
            </text>
            <text
              x="0"
              y="16"
              textAnchor="middle"
              fontSize="12"
              fontWeight="500"
              fill="#1a1a1a"
              dominantBaseline="middle"
            >
              {site.firstName}
            </text>
          </g>

          {skillNodes.map((node) => {
            const pos = nodePosition(node.angle);
            const labelWidth = node.label.length * 7 + 24;
            const isActive = node.id === active;
            return (
              <g
                key={node.id}
                transform={`translate(${pos.x}, ${pos.y})`}
                className="cursor-pointer"
                onClick={() => onSelect(node.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(node.id);
                  }
                }}
              >
                <rect
                  x={-labelWidth / 2}
                  y="-14"
                  width={labelWidth}
                  height="28"
                  rx="6"
                  fill={isActive ? "#1a1a1a" : "white"}
                  stroke={isActive ? "#1a1a1a" : "#DDD"}
                  strokeWidth="1"
                />
                <text
                  x="0"
                  y="1"
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="500"
                  fill={isActive ? "white" : "#333"}
                  dominantBaseline="middle"
                >
                  {node.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-2 flex flex-wrap justify-center gap-2">
        {skillNodes.map((node) => (
          <button
            key={node.id}
            type="button"
            onClick={() => onSelect(node.id)}
            className={cn(
              "rounded-full px-3 py-1 text-[11px] transition-colors",
              active === node.id
                ? "bg-[#1a1a1a] text-white"
                : "bg-white/80 text-[#666] hover:bg-white"
            )}
          >
            {node.label}
          </button>
        ))}
      </div>
    </div>
  );
}
