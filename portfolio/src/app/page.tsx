import { Hero } from "@/components/Hero";
import { Projects } from "@/components/Projects";
import { AboutGrid } from "@/components/AboutGrid";
import { Contact } from "@/components/Contact";

export default function Home() {
  return (
    <main className="flex-1">
      <Hero />
      <Projects />
      <AboutGrid />
      <Contact />
    </main>
  );
}
