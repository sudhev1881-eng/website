import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { ProcessSection } from "@/components/process/ProcessSection";
import { ProjectsSection } from "@/components/projects/ProjectsSection";
import { SkillsSection } from "@/components/skills/SkillsSection";
import { ContactSection } from "@/components/contact/ContactSection";
import { ExperienceSection } from "@/components/experience/ExperienceSection";
import { WordSearchSection } from "@/components/wordsearch/WordSearchSection";

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <ProcessSection />
      <SkillsSection />
      <WordSearchSection />
      <ProjectsSection />
      <ExperienceSection />
      <ContactSection />
    </main>
  );
}
