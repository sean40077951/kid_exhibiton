// 後台登入 session 簽章／驗證。用 Web Crypto（crypto.subtle）而不是 node:crypto，
// 這樣同一份程式碼在 Next.js Middleware（預設跑在 Edge runtime）和一般 API Route 都能用。
// 單一角色、不分權限（PROJECT_SPEC.md 第 7 節），所以 session 只需要記錄 adminId。

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 天
const encoder = new TextEncoder();

function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    console.warn(
      "[admin-session] ADMIN_SESSION_SECRET 未設定，暫用開發用預設密鑰。正式環境上線前務必在環境變數設定一組隨機字串。"
    );
    return "dev-only-insecure-secret-change-me";
  }
  return secret;
}

async function getKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

function toBase64Url(bytes: ArrayBuffer): string {
  let bin = "";
  new Uint8Array(bytes).forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function sign(payload: string): Promise<string> {
  const key = await getKey(getSecret());
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return toBase64Url(sig);
}

export async function createSessionToken(adminId: string): Promise<string> {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payload = `${adminId}.${expiresAt}`;
  return `${payload}.${await sign(payload)}`;
}

// 匯出簽章函式僅供測試用（見 scripts/test-logic.ts），驗證「合法簽章但已過期」這個情境真的會被擋下，
// 而不是被簽章不符的誤判掩蓋掉。正式流程請一律用 createSessionToken / verifySessionToken。
export async function signForTesting(adminId: string, expiresAt: number): Promise<string> {
  const payload = `${adminId}.${expiresAt}`;
  return `${payload}.${await sign(payload)}`;
}

export async function verifySessionToken(
  token: string | undefined | null
): Promise<{ adminId: string } | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [adminId, expiresAtStr, signature] = parts;

  const expiresAt = Number(expiresAtStr);
  if (!adminId || !Number.isFinite(expiresAt) || expiresAt < Date.now()) return null;

  const expectedSignature = await sign(`${adminId}.${expiresAtStr}`);
  if (!timingSafeEqual(expectedSignature, signature)) return null;

  return { adminId };
}

export const ADMIN_SESSION_COOKIE = "admin_session";
export const ADMIN_SESSION_MAX_AGE_SECONDS = SESSION_TTL_MS / 1000;
