import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizeStorageObjectPath } from "./supabase-storage.service.js";

describe("supabase storage path normalization", () => {
  it("keeps stored relative object paths intact", () => {
    assert.equal(
      normalizeStorageObjectPath("resumes/student-1/1700000000000-resume.pdf"),
      "resumes/student-1/1700000000000-resume.pdf",
    );
  });

  it("strips legacy API upload prefixes", () => {
    assert.equal(
      normalizeStorageObjectPath("/api/uploads/resumes/student-1/resume.pdf"),
      "resumes/student-1/resume.pdf",
    );
  });

  it("extracts object paths from Supabase public URLs", () => {
    assert.equal(
      normalizeStorageObjectPath(
        "https://project.supabase.co/storage/v1/object/public/studentlink/resumes/student-1/resume%20final.pdf",
      ),
      "resumes/student-1/resume final.pdf",
    );
  });

  it("extracts object paths from Supabase signed URLs", () => {
    assert.equal(
      normalizeStorageObjectPath(
        "https://project.supabase.co/storage/v1/object/sign/studentlink/resumes/student-1/resume.pdf?token=abc",
      ),
      "resumes/student-1/resume.pdf",
    );
  });

  it("leaves non-storage external URLs untouched", () => {
    assert.equal(
      normalizeStorageObjectPath("https://cdn.example.com/files/resume.pdf"),
      "https://cdn.example.com/files/resume.pdf",
    );
  });
});
