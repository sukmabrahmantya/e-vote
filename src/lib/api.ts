export type Candidate = {
  id: string;
  name: string;
  description: string;
};

export type CodeRow = {
  code: string;
  status: "unused" | "used";
  used_at: string;
};

export type ResultRow = {
  candidate_id: string;
  candidate_name: string;
  votes: number;
};

export type VoteLogRow = {
  id: string;
  code: string;
  candidate_id: string;
  candidate_name: string;
  custom_name: string;
  voted_at: string;
};

const jsonHeaders = {
  "Content-Type": "application/json"
};

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(data?.message ?? "Request failed", response.status);
  }

  return data as T;
}

export const api = {
  validateCode: (code: string) =>
    request<{ valid: boolean }>("/api/validate-code", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ code })
    }),

  getCandidates: () => request<{ candidates: Candidate[] }>("/api/candidates"),

  submitVote: (payload: { code: string; candidateId: string; customName?: string }) =>
    request<{ success: boolean }>("/api/vote", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify(payload)
    }),

  admin: {
    getCodes: (password: string) =>
      request<{ codes: CodeRow[] }>("/api/admin/codes", {
        headers: { "x-admin-password": password }
      }),

    generateCodes: (password: string, count: number) =>
      request<{ codes: string[] }>("/api/admin/codes/generate", {
        method: "POST",
        headers: { ...jsonHeaders, "x-admin-password": password },
        body: JSON.stringify({ count })
      }),

    getCandidates: (password: string) =>
      request<{ candidates: Candidate[] }>("/api/admin/candidates", {
        headers: { "x-admin-password": password }
      }),

    createCandidate: (password: string, payload: { name: string; description?: string }) =>
      request<{ candidate: Candidate }>("/api/admin/candidates", {
        method: "POST",
        headers: { ...jsonHeaders, "x-admin-password": password },
        body: JSON.stringify(payload)
      }),

    deleteCandidate: (password: string, id: string) =>
      request<{ success: boolean }>(`/api/admin/candidates/${id}`, {
        method: "DELETE",
        headers: { "x-admin-password": password }
      }),

    getResults: (password: string) =>
      request<{ results: ResultRow[] }>("/api/admin/results", {
        headers: { "x-admin-password": password }
      }),

    getVoteLogs: (password: string) =>
      request<{ logs: VoteLogRow[] }>("/api/admin/vote-logs", {
        headers: { "x-admin-password": password }
      })
  }
};
