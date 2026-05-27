import fs from "node:fs";
import path from "node:path";

const envPath = path.join(process.cwd(), ".env");

export type PublicGeminiKey = {
  id: string;
  nickname: string;
  masked: string;
  active: boolean;
  createdAt?: string;
};

type StoredGeminiKey = {
  id: string;
  nickname: string;
  key: string;
  createdAt: string;
};

export function readEnvFile() {
  if (!fs.existsSync(envPath)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(envPath, "utf8")
      .split(/\r?\n/)
      .filter((line) => line.trim() && !line.trim().startsWith("#"))
      .map((line) => {
        const index = line.indexOf("=");
        if (index === -1) return [line, ""];
        return [line.slice(0, index), line.slice(index + 1)];
      }),
  ) as Record<string, string>;
}

export function maskSecret(value?: string) {
  if (!value) return "";
  if (value.length <= 10) return "••••";
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

export function getAiEnvironment() {
  const env = mergedEnvironment();
  const geminiKeys = publicGeminiKeys(env);
  return {
    geminiKeySet: Boolean(env.GEMINI_API_KEY),
    geminiKeyMasked: maskSecret(env.GEMINI_API_KEY),
    geminiModel: env.GEMINI_MODEL || "gemini-2.5-flash",
    geminiKeys,
  };
}

export function saveGeminiKey(nickname: string, key: string) {
  const env = mergedEnvironment();
  const keys = storedGeminiKeys(env);
  const nextKey: StoredGeminiKey = {
    id: `gemini-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    nickname: nickname.trim() || `Gemini Key ${keys.length + 1}`,
    key,
    createdAt: new Date().toISOString(),
  };
  const nextKeys = [...keys.filter((item) => item.key !== key), nextKey];
  updateEnvFile({
    GEMINI_API_KEYS: JSON.stringify(nextKeys),
    GEMINI_API_KEY: nextKey.key,
  });
}

export function deleteGeminiKey(id: string) {
  const env = mergedEnvironment();
  const keys = storedGeminiKeys(env);
  const remaining = keys.filter((item) => item.id !== id);
  const deleted = keys.length !== remaining.length || id === "legacy-gemini-key";
  if (!deleted) return;

  const activeKey = env.GEMINI_API_KEY;
  const deletedActive = id === "legacy-gemini-key" || keys.some((item) => item.id === id && item.key === activeKey);
  const nextActive = deletedActive ? remaining[0]?.key : activeKey;
  updateEnvFile(
    {
      ...(remaining.length ? { GEMINI_API_KEYS: JSON.stringify(remaining) } : {}),
      ...(nextActive ? { GEMINI_API_KEY: nextActive } : {}),
    },
    [
      ...(remaining.length ? [] : ["GEMINI_API_KEYS"]),
      ...(nextActive ? [] : ["GEMINI_API_KEY"]),
    ],
  );
}

export function updateEnvFile(updates: Record<string, string>, removals: string[] = []) {
  const current = readEnvFile();
  const next = { ...current, ...updates };
  delete next.AI_PROVIDER;
  delete next.OPENAI_API_KEY;
  delete next.OPENAI_MODEL;
  removals.forEach((key) => {
    delete next[key];
  });
  const preferredOrder = [
    "GEMINI_API_KEY",
    "GEMINI_API_KEYS",
    "GEMINI_MODEL",
    "APP_BASE_URL",
    "TZ",
  ];
  const keys = [...preferredOrder, ...Object.keys(next).filter((key) => !preferredOrder.includes(key))];
  const content = keys
    .filter((key, index) => keys.indexOf(key) === index)
    .filter((key) => next[key] !== undefined)
    .map((key) => `${key}=${next[key] ?? ""}`)
    .join("\n");
  fs.writeFileSync(envPath, `${content}\n`, "utf8");
  Object.entries(updates).forEach(([key, value]) => {
    process.env[key] = value;
  });
  removals.forEach((key) => {
    delete process.env[key];
  });
}

function storedGeminiKeys(env: Record<string, string>): StoredGeminiKey[] {
  const parsed = parseGeminiKeys(env.GEMINI_API_KEYS);
  if (parsed.length) return parsed;
  if (!env.GEMINI_API_KEY) return [];
  return [
    {
      id: "legacy-gemini-key",
      nickname: "Gemini Key",
      key: env.GEMINI_API_KEY,
      createdAt: "",
    },
  ];
}

function publicGeminiKeys(env: Record<string, string>): PublicGeminiKey[] {
  const activeKey = env.GEMINI_API_KEY;
  return storedGeminiKeys(env).map((item) => ({
    id: item.id,
    nickname: item.nickname,
    masked: maskSecret(item.key),
    active: Boolean(activeKey && item.key === activeKey),
    createdAt: item.createdAt,
  }));
}

function mergedEnvironment(): Record<string, string> {
  return Object.fromEntries(
    Object.entries({ ...readEnvFile(), ...process.env }).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
}

function parseGeminiKeys(raw?: string): StoredGeminiKey[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is StoredGeminiKey => {
        const value = item as Partial<StoredGeminiKey>;
        return Boolean(value && typeof value.id === "string" && typeof value.nickname === "string" && typeof value.key === "string");
      })
      .map((item) => ({ ...item, createdAt: item.createdAt || "" }));
  } catch {
    return [];
  }
}
