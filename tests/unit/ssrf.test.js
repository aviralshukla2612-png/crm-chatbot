import test from "node:test";
import assert from "node:assert/strict";
import { validateUrlForSSRF } from "../../frontend/lib/security/ssrf.js";

test("SSRF Guard - blocks localhost and 127.0.0.1", async () => {
  const res1 = await validateUrlForSSRF("http://127.0.0.1/admin", { allowLocalhost: false });
  assert.equal(res1.valid, false);

  const res2 = await validateUrlForSSRF("http://localhost:11434/api/tags", { allowLocalhost: false });
  assert.equal(res2.valid, false);
});

test("SSRF Guard - blocks AWS/GCP cloud metadata IP (169.254.169.254)", async () => {
  const res = await validateUrlForSSRF("http://169.254.169.254/latest/meta-data/", { allowLocalhost: false });
  assert.equal(res.valid, false);
});

test("SSRF Guard - blocks private RFC 1918 addresses", async () => {
  const r10 = await validateUrlForSSRF("http://10.0.0.1/api", { allowLocalhost: false });
  assert.equal(r10.valid, false);

  const r192 = await validateUrlForSSRF("http://192.168.1.1/router", { allowLocalhost: false });
  assert.equal(r192.valid, false);

  const r172 = await validateUrlForSSRF("http://172.16.0.5:8080/data", { allowLocalhost: false });
  assert.equal(r172.valid, false);
});

test("SSRF Guard - blocks non-HTTP/HTTPS protocols", async () => {
  const fileRes = await validateUrlForSSRF("file:///etc/passwd", { allowLocalhost: false });
  assert.equal(fileRes.valid, false);

  const ftpRes = await validateUrlForSSRF("ftp://internal.server/data", { allowLocalhost: false });
  assert.equal(ftpRes.valid, false);
});

test("SSRF Guard - permits valid public HTTPS web URLs", async () => {
  const publicRes = await validateUrlForSSRF("https://emperorsmartsolutions.com");
  assert.equal(publicRes.valid, true);
  assert.ok(publicRes.normalizedUrl.startsWith("https://emperorsmartsolutions.com"));
});
