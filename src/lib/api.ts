/**
 * StudentLink REST API client.
 *
 * The browser communicates ONLY with the backend API.
 * NFC hardware is accessed server-side — never from the frontend.
 */

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(
      (data as { error?: string; message?: string }).error ??
        (data as { message?: string }).message ??
        `Request failed (${res.status})`,
      res.status,
    );
  }

  return data as T;
}

export interface NfcReaderStatus {
  connected: boolean;
  readerName: string | null;
  message: string;
}

export interface NfcProgramResult {
  success: boolean;
  verified: boolean;
  cardUid?: string;
  urlWritten?: string;
  message: string;
  studentId?: string;
  cardNumber?: string | null;
}

export const api = {
  health: () => request<{ status: string; service: string }>("/health"),

  nfc: {
    status: () => request<NfcReaderStatus>("/nfc/status"),

    program: (payload: {
      studentId: string;
      studentSlug: string;
      cardNumber?: string;
    }) =>
      request<NfcProgramResult>("/nfc/program", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  },
};
