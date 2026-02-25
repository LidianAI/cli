import { CliError } from "@/lib/errors";
import type { HttpClient } from "@/lib/http";

export interface QueryCommandInput {
  q: string;
  page: number;
  pageSize: number;
}

export interface QueryApiResponse {
  items: Array<{
    id: string;
    merchantId: string | null;
    name: string;
    description: string | null;
    endpointBase: string;
    authType: "none" | "api_key" | "bearer" | "basic" | "oauth2" | "custom";
    defaultCostPerUse: number;
    isActive: boolean;
    openapiSpecUrl: string | null;
    createdAt: string;
    updatedAt: string;
    matchScore?: number;
    matchPercent?: number;
  }>;
  total: number;
  page: number;
  pageSize: number;
}

export const runQueryCommand = async (
  http: HttpClient,
  apiKey: string,
  input: QueryCommandInput,
): Promise<QueryApiResponse> => {
  if (input.pageSize < 1 || input.pageSize > 3) {
    throw new CliError("pageSize must be between 1 and 3.");
  }
  const params = new URLSearchParams({
    q: input.q,
    page: String(input.page),
    pageSize: String(input.pageSize),
  });
  return http.get<QueryApiResponse>(`/v1/query?${params.toString()}`, apiKey);
};
