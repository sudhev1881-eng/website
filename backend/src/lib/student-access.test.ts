import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { studentLoginAccess } from "./student-access.js";

describe("studentLoginAccess", () => {
  it("allows active students", () => {
    const result = studentLoginAccess({ id: "stu-1", status: "active" });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.studentId, "stu-1");
    }
  });

  it("blocks missing student profiles", () => {
    const result = studentLoginAccess(undefined);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.status, 403);
      assert.match(result.error, /profile not found/i);
    }
  });

  it("blocks pending students with approval message", () => {
    const result = studentLoginAccess({ id: "stu-2", status: "pending" });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.status, 403);
      assert.match(result.error, /pending admin approval/i);
    }
  });

  it("blocks inactive students", () => {
    const result = studentLoginAccess({ id: "stu-3", status: "inactive" });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.status, 403);
      assert.match(result.error, /deactivated/i);
    }
  });
});
