import { describe, it } from "node:test";
import assert from "node:assert/strict";
import JSZip from "jszip";
import {
  extractTextFromDocx,
  LEGACY_DOC_MESSAGE,
} from "./docx-extraction.service.js";
import {
  detectResumeKind,
  extractResumeText,
  isExtractableResumeName,
  isLegacyDocName,
} from "./resume-text-extraction.service.js";
import { parseSkillsFromText } from "./skill-parser.service.js";

async function buildMinimalDocx(plainText: string): Promise<Buffer> {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
  );
  zip.folder("_rels")!.file(
    ".rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
  );
  zip.folder("word")!.file(
    "document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>${plainText.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</w:t></w:r></w:p>
  </w:body>
</w:document>`,
  );
  return zip.generateAsync({ type: "nodebuffer" });
}

describe("docx-extraction", () => {
  it("extracts plain text from a minimal DOCX via mammoth", async () => {
    const buffer = await buildMinimalDocx(
      "Skills: JavaScript, TypeScript, React, and Node.js",
    );
    const text = await extractTextFromDocx(buffer);
    assert.match(text, /JavaScript/);
    assert.match(text, /React/);
  });

  it("rejects legacy OLE2 .doc with a clear message", async () => {
    const ole2 = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0x00]);
    await assert.rejects(() => extractTextFromDocx(ole2), (err: Error) => {
      assert.equal(err.message, LEGACY_DOC_MESSAGE);
      return true;
    });
  });

  it("rejects empty buffers", async () => {
    await assert.rejects(() => extractTextFromDocx(Buffer.alloc(0)), /Empty DOCX/);
  });
});

describe("resume-text-extraction routing", () => {
  it("detects kinds from magic bytes and extensions", () => {
    assert.equal(
      detectResumeKind(Buffer.from("%PDF-1.4")),
      "pdf",
    );
    assert.equal(
      detectResumeKind(Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00])),
      "docx",
    );
    assert.equal(
      detectResumeKind(Buffer.from([0xd0, 0xcf, 0x11, 0xe0])),
      "doc",
    );
    assert.equal(detectResumeKind(Buffer.from("x"), "resume.pdf"), "pdf");
    assert.equal(detectResumeKind(Buffer.from("x"), "resume.docx"), "docx");
    assert.equal(detectResumeKind(Buffer.from("x"), "resume.doc"), "doc");
  });

  it("classifies extractable vs legacy names", () => {
    assert.equal(isExtractableResumeName("cv.pdf"), true);
    assert.equal(isExtractableResumeName("cv.DOCX"), true);
    assert.equal(isExtractableResumeName("cv.doc"), false);
    assert.equal(isLegacyDocName("cv.doc"), true);
    assert.equal(isLegacyDocName("cv.docx"), false);
  });

  it("extractResumeText on DOCX feeds skill parser", async () => {
    const buffer = await buildMinimalDocx(
      "Technical Skills: Python, Docker, Kubernetes, AWS",
    );
    const text = await extractResumeText(buffer, "resume.docx");
    const parsed = parseSkillsFromText(text);
    const names = parsed.skills.map((s) => s.name);
    assert.ok(names.includes("Python"), `got ${names.join(",")}`);
    assert.ok(names.includes("Docker"), `got ${names.join(",")}`);
    assert.ok(parsed.extractionConfidence > 0);
  });

  it("extractResumeText rejects legacy .doc", async () => {
    const ole2 = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    await assert.rejects(
      () => extractResumeText(ole2, "old.doc"),
      (err: Error) => {
        assert.equal(err.message, LEGACY_DOC_MESSAGE);
        return true;
      },
    );
  });
});
