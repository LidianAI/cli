import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export interface LidianConfig {
  apiKey?: string;
}

const CONFIG_PATH = join(homedir(), ".lidian", "config.json");

export const getConfigPath = (): string => CONFIG_PATH;

export const readConfig = async (): Promise<LidianConfig> => {
  try {
    const raw = await readFile(CONFIG_PATH, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    const apiKey =
      "apiKey" in parsed && typeof parsed.apiKey === "string"
        ? parsed.apiKey
        : undefined;
    return { apiKey };
  } catch {
    return {};
  }
};

export const writeConfig = async (config: LidianConfig): Promise<void> => {
  await mkdir(dirname(CONFIG_PATH), { recursive: true });
  await writeFile(CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`, "utf8");
};
