import { cn } from "@/lib/utils";

interface ChatStatusBarProps {
  agent: string;
  task: string;
  state: "running" | "queued";
}

export function ChatStatusBar({ agent, task, state }: ChatStatusBarProps) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-white px-4 py-2.5 shadow-sm ring-1 ring-black/[0.04]">
      <span className="text-[13px] text-[#555]">
        <span className="font-medium text-[#1a1a1a]">{agent}</span>: {task}
      </span>
      <span
        className={cn(
          "rounded-full px-2.5 py-0.5 text-[11px] font-medium",
          state === "running"
            ? "bg-blue-100 text-blue-700"
            : "bg-[#EEE] text-[#666]"
        )}
      >
        {state === "running" ? "Running" : "Queued"}
      </span>
    </div>
  );
}
