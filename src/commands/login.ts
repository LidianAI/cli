import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";
import { getConfigPath, readConfig, writeConfig } from "@/lib/config";
import { CliError } from "@/lib/errors";
import { print } from "@/lib/output";

export interface LoginCommandInput {
  key?: string;
}

export const runLoginCommand = async (
  input: LoginCommandInput,
): Promise<{ path: string }> => {
  const key = input.key ?? (await promptForKeyViaBrowserFlow());
  validateApiKey(key);

  const current = await readConfig();
  await writeConfig({
    ...current,
    apiKey: key,
  });

  return { path: getConfigPath() };
};

const promptForKeyViaBrowserFlow = async (): Promise<string> => {
  const loginUrl = "https://app.lidian.ai/login?next=/user/api-keys";
  openUrl(loginUrl);
  print(
    `Open this URL to authenticate and create/copy an API key:\n${loginUrl}`,
  );

  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const entered = (await rl.question("Paste your API key (ld_...): ")).trim();
    if (!entered) {
      throw new CliError("No API key entered.");
    }
    return entered;
  } finally {
    rl.close();
  }
};

const validateApiKey = (key: string): void => {
  if (!key.startsWith("ld_")) {
    throw new CliError(
      "Invalid API key format. Expected key starting with ld_.",
    );
  }
};

const openUrl = (url: string): void => {
  try {
    if (process.platform === "darwin") {
      Bun.spawn(["open", url], { stdout: "ignore", stderr: "ignore" });
      return;
    }
    if (process.platform === "win32") {
      Bun.spawn(["cmd", "/c", "start", "", url], {
        stdout: "ignore",
        stderr: "ignore",
      });
      return;
    }
    Bun.spawn(["xdg-open", url], { stdout: "ignore", stderr: "ignore" });
  } catch {
    // URL is still printed for manual opening.
  }
};
