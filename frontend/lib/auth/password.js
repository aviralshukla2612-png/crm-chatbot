/**
 * Cryptographically Secure Password Hashing & Constant-Time Verification
 * Uses Node.js native crypto (scrypt / PBKDF2) - NIST-compliant with zero external binary dependencies.
 */

import crypto from "crypto";

const SCRYPT_KEYLEN = 64;
const SALT_BYTES = 16;

/**
 * Hash a plaintext password with a random cryptographic salt.
 * Format: scrypt:<salt_hex>:<hash_hex>
 */
export async function hashPassword(password) {
  if (!password || typeof password !== "string") {
    throw new Error("Password must be a non-empty string");
  }

  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(SALT_BYTES).toString("hex");
    crypto.scrypt(password, salt, SCRYPT_KEYLEN, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`scrypt:${salt}:${derivedKey.toString("hex")}`);
    });
  });
}

/**
 * Constant-time verification of password against stored hash.
 * Prevents timing attacks.
 */
export async function verifyPassword(password, storedHash) {
  if (!password || !storedHash || typeof storedHash !== "string") {
    return false;
  }

  const parts = storedHash.split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt") {
    return false;
  }

  const [, salt, originalHashHex] = parts;

  return new Promise((resolve) => {
    crypto.scrypt(password, salt, SCRYPT_KEYLEN, (err, derivedKey) => {
      if (err) return resolve(false);

      try {
        const keyBuffer = derivedKey;
        const originalBuffer = Buffer.from(originalHashHex, "hex");

        if (keyBuffer.length !== originalBuffer.length) {
          return resolve(false);
        }

        const match = crypto.timingSafeEqual(keyBuffer, originalBuffer);
        resolve(match);
      } catch {
        resolve(false);
      }
    });
  });
}
