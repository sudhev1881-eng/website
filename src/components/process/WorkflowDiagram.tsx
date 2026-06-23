"use client";

import { site } from "@/data/site";
import { workflowNodes } from "@/data/process";

const RADIUS = 118;
const CENTER = { x: 200, y: 180 };

function nodePosition(angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: CENTER.x + RADIUS * Math.cos(rad),
    y: CENTER.y + RADIUS * Math.sin(rad),
  };
}

export function WorkflowDiagram() {
  return (
    <div className="relative flex h-[min(360px,55dvh)] flex-col rounded-xl bg-[#EBEBEB] p-3 sm:p-4 md:h-[480px]">
      <div className="mb-3 flex items-center justify-between text-[11px] text-[#888]">
        <span className="rounded-md bg-white/80 px-2 py-1">
          {site.firstName.toLowerCase()}/workflow/frontend
        </span>
        <span className="rounded-md bg-white/80 px-2 py-1">60%</span>
      </div>

      <div className="relative flex flex-1 items-center justify-center">
        <svg
          viewBox="0 0 400 360"
          className="diagram-canvas h-full w-full max-h-[400px]"
          aria-label="Workflow diagram"
        >
          {workflowNodes.map((node) => {
            const pos = nodePosition(node.angle);
            return (
              <line
                key={`line-${node.id}`}
                x1={CENTER.x}
                y1={CENTER.y}
                x2={pos.x}
                y2={pos.y}
                className="diagram-line"
              />
            );
          })}

          {/* Center node */}
          <g className="diagram-center-pulse" transform={`translate(${CENTER.x}, ${CENTER.y})`}>
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
              ☀️
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

          {/* Outer nodes */}
          {workflowNodes.map((node) => {
            const pos = nodePosition(node.angle);
            const labelWidth = node.label.length * 7 + 24;
            return (
              <g key={node.id} transform={`translate(${pos.x}, ${pos.y})`}>
                <rect
                  x={-labelWidth / 2}
                  y="-14"
                  width={labelWidth}
                  height="28"
                  rx="6"
                  fill="white"
                  stroke="#DDD"
                  strokeWidth="1"
                />
                <text
                  x="0"
                  y="1"
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="500"
                  fill="#333"
                  dominantBaseline="middle"
                >
                  {node.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
