import { extractResumeText } from "../resume-text-extraction.service.js";
import { parseResumeHeuristic } from "../resume-structured-parser.service.js";
import { CertificationExtractor } from "./certification-extractor.js";
import { SectionOptimizer } from "./section-optimizer.js";
import { toIntelligentResumeData } from "./schema-mapper.js";
import type { IntelligentResumeData } from "./types.js";

export interface ParseResult {
  rawText: string;
  data: IntelligentResumeData;
  extractionConfidence: number;
}

/**
 * ResumeParser — wraps text extraction + heuristic structured parse.
 * Does not call OpenAI (that's AiEnhancementEngine).
 */
export class ResumeParser {
  constructor(
    private readonly certExtractor = new CertificationExtractor(),
    private readonly sectionOptimizer = new SectionOptimizer(),
  ) {}

  async parseBuffer(buffer: Buffer, fileNameOrPath?: string): Promise<ParseResult> {
    const rawText = await extractResumeText(buffer, fileNameOrPath);
    return this.parseText(rawText);
  }

  parseText(rawText: string): ParseResult {
    const heuristic = parseResumeHeuristic(rawText);
    const sectionExtras = this.sectionOptimizer.extractExtraSections(heuristic.structuredData.sections);
    const certifications = this.certExtractor.enrich(
      heuristic.structuredData.certifications,
      heuristic.structuredData.sections.certifications ?? "",
    );

    const data = toIntelligentResumeData(heuristic.structuredData, {
      certifications,
      ...sectionExtras,
    });

    return {
      rawText,
      data,
      extractionConfidence: heuristic.extractionConfidence,
    };
  }
}

export const resumeParser = new ResumeParser();
