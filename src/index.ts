#!/usr/bin/env bun

import { runAccountCommand } from "@/commands/account";
import { type PaymentRail, runConsumeCommand } from "@/commands/consume";
import { runDiscoverCommand } from "@/commands/discover";
import { runFeedbackCommand } from "@/commands/feedback";
import { runLoginCommand } from "@/commands/login";
import { resolveApiKey } from "@/lib/auth";
import { CliError } from "@/lib/errors";
import { createHttpClient } from "@/lib/http";
import {
  fail,
  print,
  printAccountResult,
  printConsumeResult,
  printDiscoverResult,
  printFeedbackResult,
} from "@/lib/output";

interface ParsedArgs {
  command: "discover" | "consume" | "feedback" | "account" | "login";
  options: Record<string, string | boolean>;
}

const DEFAULT_API_BASE = "https://api.lidian.ai";
const API_BASE_BY_ENV = {
  production: "https://api.lidian.ai",
  staging: "https://staging-api.lidian.ai",
} as const;
type Environment = keyof typeof API_BASE_BY_ENV;

const GLOBAL_OPTIONS = new Set(["api-key", "api-base", "env", "json", "help"]);
const BOOLEAN_OPTIONS = new Set(["json", "help"]);
const COMMAND_OPTIONS: Record<ParsedArgs["command"], Set<string>> = {
  discover: new Set([
    "q",
    "page",
    "pageSize",
    "category",
    "auth-type",
    "min-price",
    "max-price",
  ]),
  consume: new Set(["endpoint-id", "params", "payment-rail", "network"]),
  feedback: new Set(["execution-id", "rank", "feedback"]),
  account: new Set([]),
  login: new Set(["key"]),
};

const main = async (): Promise<void> => {
  if (process.argv.length <= 2 || process.argv.includes("--help")) {
    printUsage();
    return;
  }
  const parsed = parseArgs(process.argv.slice(2));
  const apiBase = resolveApiBase(
    asString(parsed.options["api-base"]),
    asEnvironment(asString(parsed.options.env) ?? process.env.LIDIAN_ENV),
  );
  const asJson = Boolean(parsed.options.json);
  const http = createHttpClient(apiBase);

  switch (parsed.command) {
    case "login": {
      const key = asString(parsed.options.key);
      const result = await runLoginCommand({ key });
      if (asJson) {
        print(JSON.stringify({ success: true, data: result }, null, 2));
      } else {
        print(`Saved API key to ${result.path}`);
      }
      return;
    }
    case "discover": {
      const apiKey = await resolveApiKey(asString(parsed.options["api-key"]));
      const qValue = asString(parsed.options.q);
      if (!qValue) {
        throw new CliError("Missing --q for discover command.");
      }
      const page = toInt(asString(parsed.options.page), 1);
      const pageSize = toInt(asString(parsed.options.pageSize), 1);
      const authType = asAuthType(asString(parsed.options["auth-type"]));
      const minPrice = toNumber(
        asString(parsed.options["min-price"]),
        "min-price",
      );
      const maxPrice = toNumber(
        asString(parsed.options["max-price"]),
        "max-price",
      );
      const result = await runDiscoverCommand(http, apiKey, {
        q: qValue,
        page,
        pageSize,
        category: asString(parsed.options.category),
        ...(authType ? { authType } : {}),
        ...(typeof minPrice === "number" ? { minPrice } : {}),
        ...(typeof maxPrice === "number" ? { maxPrice } : {}),
      });
      printDiscoverResult(result, asJson);
      return;
    }
    case "consume": {
      const apiKey = await resolveApiKey(asString(parsed.options["api-key"]));
      const endpointIdValue = asString(parsed.options["endpoint-id"]);
      if (!endpointIdValue) {
        throw new CliError("Missing --endpoint-id for consume command.");
      }
      const paramsRaw = asString(parsed.options.params) ?? "{}";
      const params = parseJsonObject(paramsRaw, "--params");
      const paymentRail = resolvePaymentRail(
        asString(parsed.options["payment-rail"]),
        apiKey,
      );
      const network = asNetwork(asString(parsed.options.network));
      const result = await runConsumeCommand(http, apiKey, {
        endpointId: endpointIdValue,
        params,
        paymentRail,
        ...(network ? { network } : {}),
      });
      printConsumeResult(result, asJson);
      return;
    }
    case "account": {
      const apiKey = await resolveApiKey(asString(parsed.options["api-key"]));
      const result = await runAccountCommand(http, apiKey);
      printAccountResult(result, asJson);
      return;
    }
    case "feedback": {
      const apiKey = await resolveApiKey(asString(parsed.options["api-key"]));
      const executionId = asString(parsed.options["execution-id"]);
      if (!executionId) {
        throw new CliError("Missing --execution-id for feedback command.");
      }
      const rankRaw = asString(parsed.options.rank);
      if (!rankRaw) {
        throw new CliError("Missing --rank for feedback command.");
      }
      const rank = toIntInRange(rankRaw, "rank", 0, 10);
      const feedback = asString(parsed.options.feedback);
      const result = await runFeedbackCommand(http, apiKey, {
        executionId,
        rank,
        ...(feedback ? { feedback } : {}),
      });
      printFeedbackResult(result, asJson);
      return;
    }
    default:
      throw new CliError("Unknown command.", 1);
  }
};

const parseArgs = (argv: string[]): ParsedArgs => {
  const command = argv[0];
  if (
    command !== "discover" &&
    command !== "consume" &&
    command !== "feedback" &&
    command !== "account" &&
    command !== "login"
  ) {
    printUsage();
    throw new CliError(
      "Invalid command. Use one of: login, discover, consume, feedback, account.",
      1,
    );
  }

  const options: Record<string, string | boolean> = {};
  let index = 1;
  while (index < argv.length) {
    const token = argv[index];
    if (!token || !token.startsWith("--")) {
      throw new CliError(`Unexpected argument: ${token ?? "<empty>"}`);
    }

    const key = token.slice(2);
    const allowedForCommand = COMMAND_OPTIONS[command];
    if (!GLOBAL_OPTIONS.has(key) && !allowedForCommand.has(key)) {
      throw new CliError(`Unknown option for ${command}: --${key}`);
    }
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      if (!BOOLEAN_OPTIONS.has(key)) {
        throw new CliError(`Missing value for --${key}`);
      }
      options[key] = true;
      index += 1;
      continue;
    }

    options[key] = next;
    index += 2;
  }

  return {
    command,
    options,
  };
};

const printUsage = (): void => {
  print("Usage:");
  print("  lidian login [--key ld_...] [--json]");
  print(
    '  lidian discover --q "<term>" [--page 1] [--pageSize 1..3] [--category <name>] [--auth-type none|api_key|bearer|basic|oauth2|custom]',
  );
  print(
    "               [--min-price <cents>] [--max-price <cents>] [--api-key <key>] [--env production|staging] [--api-base <url>] [--json]",
  );
  print(
    "  lidian consume --endpoint-id <uuid> --params '<json>' [--payment-rail prepaid_credits|x402] [--api-key <key>] [--env production|staging] [--api-base <url>] [--json]",
  );
  print("             [--network base|ethereum]");
  print(
    '  lidian feedback --execution-id <uuid> --rank <0..10> [--feedback "<text>"] [--api-key <key>] [--env production|staging] [--api-base <url>] [--json]',
  );
  print(
    "  lidian account [--api-key <key>] [--env production|staging] [--api-base <url>] [--json]",
  );
  print("");
  print("Env resolution:");
  print("  --api-base > LIDIAN_API_BASE > --env > LIDIAN_ENV > production");
  print(`  production=${API_BASE_BY_ENV.production}`);
  print(`  staging=${API_BASE_BY_ENV.staging}`);
};

const asString = (value: string | boolean | undefined): string | undefined => {
  if (typeof value === "string") return value;
  return undefined;
};

const toInt = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 1) {
    throw new CliError(`Invalid integer value: ${value}`);
  }
  return parsed;
};

const toIntInRange = (
  value: string,
  flagName: string,
  min: number,
  max: number,
): number => {
  const parsed = Number.parseInt(value, 10);
  if (
    Number.isNaN(parsed) ||
    String(parsed) !== value ||
    parsed < min ||
    parsed > max
  ) {
    throw new CliError(
      `Invalid --${flagName} value: ${value}. Expected integer ${min}..${max}.`,
    );
  }
  return parsed;
};

const toNumber = (
  value: string | undefined,
  flagName: string,
): number | undefined => {
  if (!value) return undefined;
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new CliError(`Invalid --${flagName} value: ${value}`);
  }
  return parsed;
};

const parseJsonObject = (
  value: string,
  flagName: string,
): Record<string, unknown> => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value) as unknown;
  } catch {
    throw new CliError(`${flagName} must be valid JSON.`);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new CliError(`${flagName} must be a JSON object.`);
  }
  return parsed as Record<string, unknown>;
};

const asPaymentRail = (value: string): PaymentRail => {
  if (value === "prepaid_credits" || value === "x402") return value;
  throw new CliError("Invalid --payment-rail. Use prepaid_credits or x402.");
};

const resolvePaymentRail = (
  value: string | undefined,
  apiKey: string | undefined,
): PaymentRail => {
  if (value) {
    return asPaymentRail(value);
  }
  return apiKey && apiKey.trim().length > 0 ? "prepaid_credits" : "x402";
};

const asAuthType = (
  value: string | undefined,
):
  | "none"
  | "api_key"
  | "bearer"
  | "basic"
  | "oauth2"
  | "custom"
  | undefined => {
  if (!value) return undefined;
  const valid = new Set([
    "none",
    "api_key",
    "bearer",
    "basic",
    "oauth2",
    "custom",
  ]);
  if (valid.has(value)) {
    return value as
      | "none"
      | "api_key"
      | "bearer"
      | "basic"
      | "oauth2"
      | "custom";
  }
  throw new CliError(
    "Invalid --auth-type. Use none, api_key, bearer, basic, oauth2, or custom.",
  );
};

const asNetwork = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  if (value === "base" || value === "ethereum") return value;
  throw new CliError("Invalid --network. Use base or ethereum.");
};

const asEnvironment = (value: string | undefined): Environment | undefined => {
  if (!value) return undefined;
  if (value === "production" || value === "staging") return value;
  throw new CliError("Invalid --env. Use production or staging.");
};

const resolveApiBase = (
  cliApiBase: string | undefined,
  environment: Environment | undefined,
): string => {
  if (cliApiBase) return cliApiBase;
  if (process.env.LIDIAN_API_BASE) return process.env.LIDIAN_API_BASE;
  if (environment) return API_BASE_BY_ENV[environment];
  return DEFAULT_API_BASE;
};

main().catch(fail);
