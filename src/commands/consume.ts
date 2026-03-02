import { CliError } from "@/lib/errors";
import type { HttpClient } from "@/lib/http";
import {
  type PaymentRequirementsResponse,
  requestPaymentRequirements,
  verifyPaymentAddress,
} from "@/lib/x402";

export type PaymentRail = "prepaid_credits" | "x402";

export interface ConsumeCommandInput {
  endpointId: string;
  params: Record<string, unknown>;
  paymentRail: PaymentRail;
  network?: string;
}

export interface ConsumeApiResponse {
  executionId: string;
  data: unknown;
  credits: {
    spent: number;
    balance: number;
  };
}

export interface ConsumeCommandResult {
  execution: ConsumeApiResponse;
  payment?: {
    requirements: PaymentRequirementsResponse;
    verified: boolean;
  };
}

export const runConsumeCommand = async (
  http: HttpClient,
  apiKey: string | undefined,
  input: ConsumeCommandInput,
): Promise<ConsumeCommandResult> => {
  if (!isUuid(input.endpointId)) {
    throw new CliError("endpointId must be a valid UUID.");
  }

  if (input.paymentRail === "x402") {
    const requirements = await requestPaymentRequirements(
      http,
      apiKey,
      input.endpointId,
      input.network,
    );
    const verification = await verifyPaymentAddress(
      http,
      apiKey,
      requirements.payTo,
    );

    const execution = await http.post<ConsumeApiResponse, ConsumeCommandInput>(
      "/v1/consume",
      input,
      apiKey,
    );

    return {
      execution,
      payment: {
        requirements,
        verified: verification.valid,
      },
    };
  }

  const execution = await http.post<ConsumeApiResponse, ConsumeCommandInput>(
    "/v1/consume",
    input,
    apiKey,
  );
  return { execution };
};

const isUuid = (value: string): boolean => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
};
