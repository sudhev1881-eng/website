import { cn } from "@/lib/utils";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[92%] rounded-2xl px-4 py-3 text-[14px] leading-relaxed",
          isUser
            ? "bg-[#E8E8E8] text-[#1a1a1a]"
            : "bg-white text-[#333] shadow-sm ring-1 ring-black/[0.04]"
        )}
      >
        {content}
      </div>
    </div>
  );
}
