import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  _hybridSearchTest,
  type SemanticSearchHit,
} from "./hybrid-search.service.js";

describe("hybrid search helpers", () => {
  it("escapeIlike escapes % and _", () => {
    assert.equal(_hybridSearchTest.escapeIlike("100%_done"), "100\\%\\_done");
  });

  it("keywordBaseScore ranks identity above resume", () => {
    assert.ok(
      _hybridSearchTest.keywordBaseScore("identity") >
        _hybridSearchTest.keywordBaseScore("resume"),
    );
  });

  it("mergeHits dedupes and marks hybrid when both sources match", () => {
    const vector: SemanticSearchHit[] = [
      {
        studentId: "a",
        resumeId: "r1",
        section: "skills",
        content: "react",
        score: 0.7,
        metadata: {},
        vectorId: "v1",
        source: "vector",
      },
    ];
    const keyword: SemanticSearchHit[] = [
      {
        studentId: "a",
        resumeId: "",
        section: "profile",
        content: "Ada Lovelace",
        score: 0.8,
        metadata: {},
        vectorId: "k1",
        source: "keyword",
      },
      {
        studentId: "b",
        resumeId: "",
        section: "skills",
        content: "python",
        score: 0.75,
        metadata: {},
        vectorId: "k2",
        source: "keyword",
      },
    ];

    const merged = _hybridSearchTest.mergeHits(vector, keyword, 10);
    assert.equal(merged.length, 2);
    const a = merged.find((h) => h.studentId === "a");
    assert.ok(a);
    assert.equal(a!.source, "hybrid");
    assert.ok(a!.score > 0.8);
  });

  it("mergeHits returns empty for empty inputs", () => {
    assert.deepEqual(_hybridSearchTest.mergeHits([], [], 5), []);
  });
});
