import { CliError } from "@/lib/errors";

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiFailure {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export interface HttpClient {
  get<T>(path: string, apiKey: string): Promise<T>;
  post<T, B>(path: string, body: B, apiKey: string): Promise<T>;
}

export const createHttpClient = (baseUrl: string): HttpClient => {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, "");

  return {
    async get<T>(path: string, apiKey: string): Promise<T> {
      const response = await fetch(`${normalizedBaseUrl}${path}`, {
        method: "GET",
        headers: authHeaders(apiKey),
      });
      return handleResponse<T>(response);
    },
    async post<T, B>(path: string, body: B, apiKey: string): Promise<T> {
      const response = await fetch(`${normalizedBaseUrl}${path}`, {
        method: "POST",
        headers: {
          ...authHeaders(apiKey),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      return handleResponse<T>(response);
    },
  };
};

const authHeaders = (apiKey: string): HeadersInit => ({
  Authorization: `Bearer ${apiKey}`,
});

const handleResponse = async <T>(response: Response): Promise<T> => {
  const json = (await response
    .json()
    .catch(() => null)) as ApiResponse<T> | null;

  if (!response.ok) {
    if (json && "success" in json && json.success === false) {
      throw new CliError(`${json.error.code}: ${json.error.message}`, 1);
    }
    throw new CliError(`Request failed with status ${response.status}`, 1);
  }

  if (!json || !("success" in json) || json.success !== true) {
    throw new CliError("Unexpected API response format", 1);
  }

  return json.data;
};
