import { readConfig } from "@/lib/config";

export const resolveApiKey = async (
  argsApiKey: string | undefined,
): Promise<string | undefined> => {
  const config = await readConfig();
  return argsApiKey ?? process.env.LIDIAN_API_KEY ?? config.apiKey;
};
