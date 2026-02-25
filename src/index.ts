#!/usr/bin/env bun

import { runAccountCommand } from "@/commands/account";
import { type PaymentRail, runActCommand } from "@/commands/act";
import { runLoginCommand } from "@/commands/login";
import { runQueryCommand } from "@/commands/query";
import { resolveApiKey } from "@/lib/auth";
import { CliError } from "@/lib/errors";
import { createHttpClient } from "@/lib/http";
import {
  fail,
  print,
  printAccountResult,
  printActResult,
  printQueryResult,
} from "@/lib/output";

interface ParsedArgs {
  command: "query" | "act" | "account" | "login";
  options: Record<string, string | boolean>;
}

const DEFAULT_API_BASE = "https://api.lidian.ai";
const GLOBAL_OPTIONS = new Set(["api-key", "api-base", "json", "help"]);
const COMMAND_OPTIONS: Record<ParsedArgs["command"], Set<string>> = {
  query: new Set(["q", "page", "pageSize"]),
  act: new Set(["endpoint-id", "params", "payment-rail", "network"]),
  account: new Set([]),
  login: new Set(["key"]),
};

const main = async (): Promise<void> => {
  if (process.argv.length <= 2 || process.argv.includes("--help")) {
    printUsage();
    return;
  }
  const parsed = parseArgs(process.argv.slice(2));
  const apiBase = String(
    parsed.options["api-base"] ??
      process.env.LIDIAN_API_BASE ??
      DEFAULT_API_BASE,
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
    case "query": {
      const apiKey = await resolveApiKey(asString(parsed.options["api-key"]));
      const qValue = asString(parsed.options.q);
      if (!qValue) {
        throw new CliError("Missing --q for query command.");
      }
      const page = toInt(asString(parsed.options.page), 1);
      const pageSize = toInt(asString(parsed.options.pageSize), 1);
      const result = await runQueryCommand(http, apiKey, {
        q: qValue,
        page,
        pageSize,
      });
      printQueryResult(result, asJson);
      return;
    }
    case "act": {
      const apiKey = await resolveApiKey(asString(parsed.options["api-key"]));
      const endpointIdValue = asString(parsed.options["endpoint-id"]);
      if (!endpointIdValue) {
        throw new CliError("Missing --endpoint-id for act command.");
      }
      const paramsRaw = asString(parsed.options.params) ?? "{}";
      const params = parseJsonObject(paramsRaw, "--params");
      const paymentRail = asPaymentRail(
        asString(parsed.options["payment-rail"]) ?? "prepaid_credits",
      );
      const network = asString(parsed.options.network);
      const result = await runActCommand(http, apiKey, {
        endpointId: endpointIdValue,
        params,
        paymentRail,
        ...(network ? { network } : {}),
      });
      printActResult(result, asJson);
      return;
    }
    case "account": {
      const apiKey = await resolveApiKey(asString(parsed.options["api-key"]));
      const result = await runAccountCommand(http, apiKey);
      printAccountResult(result, asJson);
      return;
    }
    default:
      throw new CliError("Unknown command.", 1);
  }
};

const parseArgs = (argv: string[]): ParsedArgs => {
  const command = argv[0];
  if (
    command !== "query" &&
    command !== "act" &&
    command !== "account" &&
    command !== "login"
  ) {
    printUsage();
    throw new CliError(
      "Invalid command. Use one of: login, query, act, account.",
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
    '  lidian query --q "<term>" [--page 1] [--pageSize 1..3] [--api-key <key>] [--json]',
  );
  print(
    "  lidian act --endpoint-id <uuid> --params '<json>' [--payment-rail prepaid_credits|x402] [--api-key <key>] [--json]",
  );
  print("             [--network base|ethereum]");
  print("  lidian account [--api-key <key>] [--json]");
};

const asString = (value: string | boolean | undefined): string | undefined => {
  if (typeof value === "string") return value;
  return undefined;
};

const toInt = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new CliError(`Invalid integer value: ${value}`);
  }
  return parsed;
};

const parseJsonObject = (
  value: string,
  flagName: string,
): Record<string, unknown> => {
  const parsed = JSON.parse(value) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new CliError(`${flagName} must be a JSON object.`);
  }
  return parsed as Record<string, unknown>;
};

const asPaymentRail = (value: string): PaymentRail => {
  if (value === "prepaid_credits" || value === "x402") return value;
  throw new CliError("Invalid --payment-rail. Use prepaid_credits or x402.");
};

main().catch(fail);
