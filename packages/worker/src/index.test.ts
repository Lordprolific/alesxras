import assert from "node:assert/strict";
import test from "node:test";
import { isSupportedJob } from "./index.ts";

test("worker rejects unknown job kinds", () => {
  assert.equal(isSupportedJob("evaluate_procurement"), true);
  assert.equal(isSupportedJob("arbitrary_code"), false);
});
