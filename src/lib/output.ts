import type { AccountApiResponse } from "@/commands/account";
import type {
  ConsumeApiResponse,
  ConsumeCommandResult,
} from "@/commands/consume";
import type { DiscoverApiResponse } from "@/commands/discover";
import type { FeedbackApiResponse } from "@/commands/feedback";
import { CliError } from "@/lib/errors";

export const print = (message: string): void => {
  process.stdout.write(`${message}\n`);
};

export const printError = (message: string): void => {
  process.stderr.write(`${message}\n`);
};

export const printResult = (result: unknown, asJson: boolean): void => {
  if (asJson) {
    print(JSON.stringify(result, null, 2));
    return;
  }
  print(formatForHuman(result));
};

export const printDiscoverResult = (
  result: DiscoverApiResponse,
  asJson: boolean,
): void => {
  if (asJson) {
    printResult(result, true);
    return;
  }
  if (result.items.length === 0) {
    print("No APIs found.");
    return;
  }
  print(
    `Found ${result.items.length} of ${result.total} APIs (page ${result.page}).`,
  );
  for (const item of result.items) {
    const confidence = item.matchPercent
      ? ` confidence=${item.matchPercent.toFixed(1)}%`
      : "";
    print(
      `- ${item.name} (${item.id}) auth=${item.authType} cost=${item.defaultCostPerUse}c (${formatUsd(item.defaultCostPerUse)})${confidence}`,
    );
  }
};

export const printConsumeResult = (
  result: ConsumeCommandResult,
  asJson: boolean,
): void => {
  if (asJson) {
    printResult(result.execution, true);
    return;
  }
  if (result.payment) {
    print(
      `x402 preflight: payTo=${result.payment.requirements.payTo} amount=${result.payment.requirements.amountFormatted} verified=${String(result.payment.verified)}`,
    );
  }
  printExecutionResult(result.execution);
};

export const printAccountResult = (
  result: AccountApiResponse,
  asJson: boolean,
): void => {
  if (asJson) {
    printResult(result, true);
    return;
  }
  print(`Account: ${result.user.id}`);
  print(
    `Balance: ${result.balance.balance} cents (${formatUsd(result.balance.balance)})`,
  );
};

export const printFeedbackResult = (
  result: FeedbackApiResponse,
  asJson: boolean,
): void => {
  if (asJson) {
    printResult(result, true);
    return;
  }
  const feedback = result.feedback ?? "<none>";
  print(
    `Feedback saved for execution=${result.executionId} rank=${result.rank} submittedBy=${result.submittedBy}`,
  );
  print(`Updated at: ${result.updatedAt}`);
  print(`Comment: ${feedback}`);
};

const printExecutionResult = (result: ConsumeApiResponse): void => {
  print(`Execution ID: ${result.executionId}`);
  print(
    `Execution succeeded. Spent=${result.credits.spent} cents (${formatUsd(result.credits.spent)}) balance=${result.credits.balance} cents (${formatUsd(result.credits.balance)})`,
  );
  print(JSON.stringify(result.data, null, 2));
};

const formatForHuman = (value: unknown): string => {
  if (typeof value === "string") {
    return value;
  }
  return JSON.stringify(value, null, 2);
};

const formatUsd = (cents: number): string => {
  return `$${(cents / 100).toFixed(2)}`;
};

export const fail = (error: unknown): never => {
  if (error instanceof CliError) {
    printError(`Error: ${error.message}`);
    process.exit(error.code);
  }
  if (error instanceof Error) {
    printError(`Error: ${error.message}`);
    process.exit(1);
  }
  printError("Error: Unknown failure");
  process.exit(1);
};
