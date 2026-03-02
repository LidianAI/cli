import { CliError } from "@/lib/errors";
import type { HttpClient } from "@/lib/http";

export interface FeedbackCommandInput {
  executionId: string;
  rank: number;
  feedback?: string;
}

export interface FeedbackApiResponse {
  executionId: string;
  rank: number;
  feedback: string | null;
  submittedBy: "agent" | "human";
  updatedAt: string;
}

export const runFeedbackCommand = async (
  http: HttpClient,
  input: FeedbackCommandInput,
): Promise<FeedbackApiResponse> => {
  if (!isUuid(input.executionId)) {
    throw new CliError("executionId must be a valid UUID.");
  }
  if (!Number.isInteger(input.rank) || input.rank < 0 || input.rank > 10) {
    throw new CliError("rank must be an integer between 0 and 10.");
  }
  if (typeof input.feedback === "string" && input.feedback.length > 1000) {
    throw new CliError("feedback cannot exceed 1000 characters.");
  }

  return http.post<FeedbackApiResponse, FeedbackCommandInput>(
    "/v1/consume/feedback",
    input,
    undefined,
  );
};

const isUuid = (value: string): boolean => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
};
