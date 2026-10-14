import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { checkDistributedRateLimit } from "../../frontend/lib/security/distributedRateLimit.js";

describe("Distributed Rate Limiter Suite", () => {
  it("1. Allows requests within rate limit threshold", async () => {
    const key = `test_client_${Date.now()}`;
    const res1 = await checkDistributedRateLimit(key, 5, 10000);
    assert.equal(res1.ok, true);
    assert.equal(res1.remaining, 4);

    const res2 = await checkDistributedRateLimit(key, 5, 10000);
    assert.equal(res2.ok, true);
    assert.equal(res2.remaining, 3);
  });

  it("2. Blocks and throttles requests exceeding limit threshold", async () => {
    const key = `test_throttled_${Date.now()}`;

    // Exhaust 3 allowed requests
    await checkDistributedRateLimit(key, 3, 10000);
    await checkDistributedRateLimit(key, 3, 10000);
    await checkDistributedRateLimit(key, 3, 10000);

    // 4th request must be throttled
    const blocked = await checkDistributedRateLimit(key, 3, 10000);
    assert.equal(blocked.ok, false);
    assert.equal(blocked.remaining, 0);
    assert.ok(blocked.retrySec >= 1);
  });
});
