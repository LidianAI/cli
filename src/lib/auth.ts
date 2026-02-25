import { readConfig } from "@/lib/config";
import { CliError } from "@/lib/errors";

export const resolveApiKey = async (
  argsApiKey: string | undefined,
): Promise<string> => {
  const config = await readConfig();
  const key = argsApiKey ?? process.env.LIDIAN_API_KEY ?? config.apiKey;
  if (!key) {
    throw new CliError(
      "Missing API key. Use `lidian login --key ld_...`, pass --api-key, or set LIDIAN_API_KEY.",
    );
  }
  return key;
};
