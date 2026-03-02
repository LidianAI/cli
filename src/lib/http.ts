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

interface PlainApiError {
  error?: string;
  message?: string;
}

type ApiResponse<T> = ApiSuccess<T> | ApiFailure | PlainApiError;

export interface HttpClient {
  get<T>(path: string, apiKey?: string): Promise<T>;
  post<T, B>(path: string, body: B, apiKey?: string): Promise<T>;
}

export const createHttpClient = (baseUrl: string): HttpClient => {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, "");

  return {
    async get<T>(path: string, apiKey?: string): Promise<T> {
      const response = await fetch(`${normalizedBaseUrl}${path}`, {
        method: "GET",
        headers: authHeaders(apiKey),
      });
      return handleResponse<T>(response);
    },
    async post<T, B>(path: string, body: B, apiKey?: string): Promise<T> {
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

const authHeaders = (apiKey?: string): HeadersInit => {
  if (!apiKey || apiKey.trim().length === 0) {
    return {};
  }
  return {
    Authorization: `Bearer ${apiKey}`,
  };
};

const handleResponse = async <T>(response: Response): Promise<T> => {
  const hasPaymentHeader =
    response.headers.get("x402") !== null ||
    response.headers.get("payment-required") !== null;

  const json = (await response
    .json()
    .catch(() => null)) as ApiResponse<T> | null;

  if (!response.ok) {
    if (json && "success" in json && json.success === false) {
      throw new CliError(`${json.error.code}: ${json.error.message}`, 1);
    }
    if (
      json &&
      typeof json === "object" &&
      "error" in json &&
      typeof json.error === "string"
    ) {
      throw new CliError(json.error, 1);
    }
    if (
      json &&
      typeof json === "object" &&
      "message" in json &&
      typeof json.message === "string"
    ) {
      throw new CliError(json.message, 1);
    }
    throw new CliError(`Request failed with status ${response.status}`, 1);
  }

  if (hasPaymentHeader) {
    return null as T;
  }

  if (!json || !("success" in json) || json.success !== true) {
    throw new CliError("Unexpected API response format", 1);
  }

  return json.data;
};
