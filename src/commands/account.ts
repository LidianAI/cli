import type { HttpClient } from "@/lib/http";

export interface AccountApiResponse {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    createdAt: string;
  };
  balance: {
    balance: number;
    createdAt: string;
    updatedAt: string;
  };
}

export const runAccountCommand = async (
  http: HttpClient,
  apiKey: string,
): Promise<AccountApiResponse> => {
  return http.get<AccountApiResponse>("/v1/account", apiKey);
};
