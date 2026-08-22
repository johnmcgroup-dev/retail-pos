/**
 * Lightweight, URL-safe reversible encoding of a tenant ID for invitation links.
 *
 * This is obfuscation (XOR + base64url), NOT cryptographic encryption — the goal is
 * to avoid exposing the raw tenant ID in the URL and to make the token non-guessable.
 * The real authorization still happens server-side in the claimTenant backend
 * function, which only assigns the tenant to the currently authenticated user.
 */

const SECRET = "mR3t@1lPr0-JmtS0l-!nv1te-2024";
const VERSION = "v1";

function xor(str) {
  let out = "";
  for (let i = 0; i < str.length; i++) {
    out += String.fromCharCode(str.charCodeAt(i) ^ SECRET.charCodeAt(i % SECRET.length));
  }
  return out;
}

function toB64Url(str) {
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromB64Url(b64) {
  const pad = b64.replace(/-/g, "+").replace(/_/g, "/");
  return decodeURIComponent(escape(atob(pad)));
}

export function encryptTenantId(id) {
  if (!id) return "";
  return toB64Url(xor(`${VERSION}::${id}`));
}

export function decryptTenantId(token) {
  try {
    if (!token) return null;
    const payload = xor(fromB64Url(token));
    const parts = payload.split("::");
    if (parts.length < 2 || parts[0] !== VERSION) return null;
    return parts.slice(1).join("::") || null;
  } catch {
    return null;
  }
}