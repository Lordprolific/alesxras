import assert from "node:assert/strict";
import test from "node:test";
import { assertTestnet } from "./index.ts";

test("transaction guard refuses mainnet", () => {
  assert.equal(assertTestnet("testnet"), undefined);
  assert.throws(() => assertTestnet("mainnet"), /Only testnet/);
});
