import { CliError } from "@/lib/errors";
import type { HttpClient } from "@/lib/http";

export interface DiscoverCommandInput {
  q: string;
  page: number;
  pageSize: number;
  category?: string;
  authType?: "none" | "api_key" | "bearer" | "basic" | "oauth2" | "custom";
  minPrice?: number;
  maxPrice?: number;
}

export interface DiscoverApiResponse {
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

export const runDiscoverCommand = async (
  http: HttpClient,
  apiKey: string,
  input: DiscoverCommandInput,
): Promise<DiscoverApiResponse> => {
  if (input.pageSize < 1 || input.pageSize > 3) {
    throw new CliError("pageSize must be between 1 and 3.");
  }
  const params = new URLSearchParams();
  params.set("q", input.q);
  params.set("page", String(input.page));
  params.set("pageSize", String(input.pageSize));
  if (input.category) params.set("category", input.category);
  if (input.authType) params.set("authType", input.authType);
  if (typeof input.minPrice === "number") {
    params.set("minPrice", String(input.minPrice));
  }
  if (typeof input.maxPrice === "number") {
    params.set("maxPrice", String(input.maxPrice));
  }
  return http.get<DiscoverApiResponse>(
    `/v1/discover?${params.toString()}`,
    apiKey,
  );
};
