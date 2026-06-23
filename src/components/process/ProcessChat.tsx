"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp } from "lucide-react";
import {
  chatTabConfig,
  chatTabs,
  type ChatTab,
} from "@/data/process";
import { matchChatInput } from "@/lib/chatMatcher";
import { ChatMessage } from "@/components/process/ChatMessage";
import { ChatStatusBar } from "@/components/process/ChatStatusBar";
import { PromptChips } from "@/components/process/PromptChips";
import { cn } from "@/lib/utils";
import { expandTransition, fadeTransition } from "@/lib/motion";

type Message =
  | { id: string; type: "message"; role: "user" | "assistant"; content: string }
  | {
      id: string;
      type: "status";
      agent: string;
      task: string;
      state: "running" | "queued";
    };

function emptyTabMessages(): Record<ChatTab, Message[]> {
  return {
    Home: [],
    Process: [],
    Projects: [],
    Notes: [],
  };
}

export function ProcessChat() {
  const [tabMessages, setTabMessages] =
    useState<Record<ChatTab, Message[]>>(emptyTabMessages);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [activeTab, setActiveTab] = useState<ChatTab>("Process");
  const scrollRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(0);

  const tabConfig = chatTabConfig[activeTab];
  const messages = tabMessages[activeTab];

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
  }, [messages, typing, activeTab, scrollToBottom]);

  const updateMessages = useCallback(
    (tab: ChatTab, updater: (prev: Message[]) => Message[]) => {
      setTabMessages((prev) => ({
        ...prev,
        [tab]: updater(prev[tab]),
      }));
    },
    []
  );

  const sendMessage = useCallback(
    async (text: string, tab: ChatTab = activeTab) => {
      const trimmed = text.trim();
      if (!trimmed || typing) return;

      if (tab === activeTab) {
        setInput("");
      }

      updateMessages(tab, (prev) => [
        ...prev,
        { id: nextId(), type: "message", role: "user", content: trimmed },
      ]);

      setTyping(true);
      const { reply, status } = matchChatInput(trimmed, tab);

      await new Promise((r) => setTimeout(r, 700));

      setTyping(false);

      updateMessages(tab, (prev) => {
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
    [activeTab, typing, updateMessages]
  );

  const handleTabChange = (tab: ChatTab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    setInput("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="flex h-[min(420px,65dvh)] flex-col overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/[0.06] md:h-[480px] md:max-h-[480px]">
      <div
        className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-[#EEE] px-2 py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="Chat topics"
      >
        {chatTabs.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => handleTabChange(tab)}
            className={cn(
              "shrink-0 rounded-md px-3 py-1.5 text-[13px] transition-colors",
              activeTab === tab
                ? "bg-[#F3F3F3] font-medium text-[#1a1a1a]"
                : "text-[#888] hover:bg-[#FAFAFA] hover:text-[#555]"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={expandTransition}
            className="flex flex-col gap-3"
          >
            {messages.length === 0 && (
              <>
                <p className="text-[14px] leading-relaxed text-[#666]">
                  {tabConfig.intro}
                </p>

                {tabConfig.highlights && (
                  <div className="flex flex-wrap gap-2">
                    {tabConfig.highlights.map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        disabled={typing}
                        onClick={() =>
                          sendMessage(item.ask ?? `${item.label}: ${item.detail}`)
                        }
                        className="rounded-lg border border-[#E8E8E8] bg-[#FAFAFA] px-3 py-2 text-left transition-colors hover:border-[#CCC] hover:bg-white disabled:opacity-50"
                      >
                        <span className="block text-[11px] font-medium uppercase tracking-wide text-[#999]">
                          {item.label}
                        </span>
                        <span className="mt-0.5 block text-[12px] text-[#444]">
                          {item.detail}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {activeTab === "Projects" && (
                  <a
                    href="#projects"
                    className="inline-flex w-fit text-[12px] text-[#666] underline-offset-2 hover:text-[#1a1a1a] hover:underline"
                  >
                    Jump to Projects section →
                  </a>
                )}

                {activeTab === "Notes" && (
                  <a
                    href="#contact"
                    className="inline-flex w-fit text-[12px] text-[#666] underline-offset-2 hover:text-[#1a1a1a] hover:underline"
                  >
                    Open Contact section →
                  </a>
                )}
              </>
            )}

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
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="shrink-0 space-y-3 border-t border-[#EEE] px-4 py-3">
        <PromptChips
          prompts={tabConfig.prompts}
          onSelect={sendMessage}
          disabled={typing}
        />

        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={tabConfig.placeholder}
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
