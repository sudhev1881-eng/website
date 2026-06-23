"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp } from "lucide-react";
import { skillPromptChips } from "@/data/skills";
import type { SkillId } from "@/data/skills";
import { matchSkillInput } from "@/lib/skillMatcher";
import { ChatMessage } from "@/components/process/ChatMessage";
import { ChatStatusBar } from "@/components/process/ChatStatusBar";
import { PromptChips } from "@/components/process/PromptChips";
import { cn } from "@/lib/utils";
import { fadeTransition } from "@/lib/motion";

type Message =
  | { id: string; type: "message"; role: "user" | "assistant"; content: string }
  | {
      id: string;
      type: "status";
      agent: string;
      task: string;
      state: "running" | "queued";
    };

const skillTabs = ["JavaScript", "Python", "C++", "Performance"] as const;

const tabToSkill: Record<(typeof skillTabs)[number], SkillId> = {
  JavaScript: "javascript",
  Python: "python",
  "C++": "cpp",
  Performance: "performance",
};

interface SkillsChatProps {
  activeSkill: SkillId;
  onSkillChange: (skill: SkillId) => void;
  variant?: "desktop" | "mobile";
}

export function SkillsChat({
  activeSkill,
  onSkillChange,
  variant = "desktop",
}: SkillsChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(0);

  const activeTab =
    (Object.entries(tabToSkill).find(([, id]) => id === activeSkill)?.[0] as
      | (typeof skillTabs)[number]
      | undefined) ?? "JavaScript";

  const nextId = () => {
    idRef.current += 1;
    return String(idRef.current);
  };

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, typing, scrollToBottom]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || typing) return;

      setInput("");
      setMessages((prev) => [
        ...prev,
        { id: nextId(), type: "message", role: "user", content: trimmed },
      ]);

      setTyping(true);
      const { skill, reply, status } = matchSkillInput(trimmed);

      if (skill) {
        onSkillChange(skill);
      }

      await new Promise((r) => setTimeout(r, 700));

      setTyping(false);

      setMessages((prev) => {
        const next: Message[] = [
          ...prev,
          { id: nextId(), type: "message", role: "assistant", content: reply },
        ];
        if (status) {
          next.splice(next.length - 1, 0, {
            id: nextId(),
            type: "status",
            agent: status.agent,
            task: status.task,
            state: status.state,
          });
        }
        return next;
      });
    },
    [typing, onSkillChange]
  );

  const handleTabClick = (tab: (typeof skillTabs)[number]) => {
    const skill = tabToSkill[tab];
    onSkillChange(skill);
    sendMessage(`Tell me about ${tab}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/[0.06]",
        variant === "mobile"
          ? "h-[min(380px,52dvh)]"
          : "h-[min(420px,65dvh)] md:h-[480px] lg:h-[520px]"
      )}
    >
      <div
        className={cn(
          "flex shrink-0 items-center gap-3 overflow-x-auto border-b border-[#EEE] px-4 py-3 sm:gap-4 sm:px-5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          variant === "mobile" && "hidden"
        )}
      >
        {skillTabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => handleTabClick(tab)}
            className={cn(
              "shrink-0 text-[13px] transition-colors",
              activeTab === tab
                ? "font-medium text-[#1a1a1a]"
                : "text-[#888] hover:text-[#555]"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 sm:px-5 sm:py-4"
      >
        <div className="flex flex-col gap-3">
          {messages.length === 0 && (
            <p className="text-[13px] leading-relaxed text-[#666] sm:text-[14px]">
              Ask about {activeTab}, or how I boost performance. Type a question below.
            </p>
          )}

          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={fadeTransition}
              >
                {msg.type === "message" ? (
                  <ChatMessage role={msg.role} content={msg.content} />
                ) : (
                  <ChatStatusBar
                    agent={msg.agent}
                    task={msg.task}
                    state={msg.state}
                  />
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {typing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex w-fit gap-1 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-black/[0.04]"
            >
              <span className="h-2 w-2 animate-bounce rounded-full bg-[#CCC] [animation-delay:0ms]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-[#CCC] [animation-delay:150ms]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-[#CCC] [animation-delay:300ms]" />
            </motion.div>
          )}
        </div>
      </div>

      <div className="shrink-0 space-y-3 border-t border-[#EEE] px-4 py-3 sm:px-5 sm:py-4">
        {variant === "desktop" && (
          <PromptChips
            prompts={skillPromptChips}
            onSelect={sendMessage}
            disabled={typing}
          />
        )}

        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about my skills…"
            disabled={typing}
            className="flex-1 rounded-full border border-[#E5E5E5] bg-[#FAFAFA] px-4 py-2.5 text-[14px] text-[#1a1a1a] outline-none placeholder:text-[#AAA] focus:border-[#CCC] focus:ring-1 focus:ring-[#DDD] disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={typing || !input.trim()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1a1a1a] text-white transition-opacity hover:bg-[#333] disabled:opacity-40"
            aria-label="Send message"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
