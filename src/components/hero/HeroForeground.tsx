export function HeroForeground() {
  return (
    <div
      className="pointer-events-none absolute right-[4%] bottom-[6%] hidden w-[min(420px,38vw)] lg:block"
      aria-hidden
    >
      {/* Laptop */}
      <div className="relative ml-auto w-[72%]">
        <div className="rounded-lg border border-white/20 bg-[#2a2a2a]/90 p-1 shadow-2xl backdrop-blur-sm">
          <div className="aspect-[16/10] overflow-hidden rounded-md bg-[#1a1a1a]">
            <div className="flex h-6 items-center gap-1.5 border-b border-white/10 px-2">
              <span className="h-2 w-2 rounded-full bg-[#FF5F57]" />
              <span className="h-2 w-2 rounded-full bg-[#FFBD2E]" />
              <span className="h-2 w-2 rounded-full bg-[#28CA41]" />
            </div>
            <div className="space-y-1.5 p-3 font-mono text-[8px] leading-relaxed text-emerald-400/80">
              <p>
                <span className="text-purple-400">export</span>{" "}
                <span className="text-sky-300">function</span> Hero() {"{"}
              </p>
              <p className="pl-3">
                <span className="text-purple-400">return</span>{" "}
                <span className="text-amber-200">&lt;Landing /&gt;</span>;
              </p>
              <p>{"}"}</p>
            </div>
          </div>
        </div>
        <div className="mx-auto -mt-0.5 h-2 w-[88%] rounded-b-md bg-[#3a3a3a]/80" />
      </div>

      {/* Notebook */}
      <div className="absolute -bottom-2 left-0 w-[38%] rotate-[-8deg]">
        <div className="rounded-sm border border-amber-900/40 bg-[#8B6914] p-1 shadow-xl">
          <div className="aspect-[3/4] rounded-sm bg-[#F5E6C8] p-2">
            <div className="space-y-1.5">
              <div className="h-px w-full bg-amber-900/20" />
              <div className="h-px w-4/5 bg-amber-900/15" />
              <div className="h-px w-full bg-amber-900/20" />
              <div className="h-px w-3/5 bg-amber-900/15" />
            </div>
          </div>
        </div>
        <div className="absolute top-1/2 -right-3 h-16 w-1 rotate-12 rounded-full bg-gradient-to-b from-amber-700 to-amber-900" />
      </div>
    </div>
  );
}
