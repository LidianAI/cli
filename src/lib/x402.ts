import type { HttpClient } from "@/lib/http";

export interface PaymentRequirementsResponse {
  paymentIntentId: string;
  payTo: string;
  amount: number;
  amountFormatted: string;
  network: string;
  chainId: number;
  asset: string;
  expiresAt: string;
  resource?: {
    id: string;
    name: string;
    endpoint: {
      id: string;
      path: string;
      method: string;
    };
  };
}

export interface PaymentVerifyResponse {
  valid: boolean;
  verifiedAt: string;
}

export const requestPaymentRequirements = async (
  http: HttpClient,
  apiKey: string | undefined,
  endpointId: string,
  network?: string,
): Promise<PaymentRequirementsResponse> => {
  return http.post<
    PaymentRequirementsResponse,
    { endpointId: string; network?: string }
  >(
    "/v1/payments/requirements",
    { endpointId, ...(network ? { network } : {}) },
    apiKey,
  );
};

export const verifyPaymentAddress = async (
  http: HttpClient,
  apiKey: string | undefined,
  payTo: string,
): Promise<PaymentVerifyResponse> => {
  return http.post<PaymentVerifyResponse, { payTo: string }>(
    "/v1/payments/verify",
    { payTo },
    apiKey,
  );
};
