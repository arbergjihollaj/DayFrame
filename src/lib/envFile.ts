import fs from "node:fs";
import path from "node:path";

const envPath = path.join(process.cwd(), ".env");

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
  const env = { ...readEnvFile(), ...process.env };
  return {
    geminiKeySet: Boolean(env.GEMINI_API_KEY),
    geminiKeyMasked: maskSecret(env.GEMINI_API_KEY),
    geminiModel: env.GEMINI_MODEL || "gemini-2.5-flash",
  };
}

export function updateEnvFile(updates: Record<string, string>) {
  const current = readEnvFile();
  const next = { ...current, ...updates };
  delete next.AI_PROVIDER;
  delete next.OPENAI_API_KEY;
  delete next.OPENAI_MODEL;
  const preferredOrder = [
    "GEMINI_API_KEY",
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
}
