import { nanoid } from "nanoid";
import { z } from "zod";
import { readCsv, withWriteLock, writeCsv } from "../lib/csv-store";
import type { CandidateRow, CodeRow, VoteRow } from "../types";

const CODE_COLUMNS = ["code", "status", "used_at"];
const CANDIDATE_COLUMNS = ["id", "name", "description"];
const VOTE_COLUMNS = ["id", "code", "candidate_id", "custom_name", "voted_at", "user_agent"];

const codeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateCode(length = 8) {
  let value = "";

  for (let index = 0; index < length; index += 1) {
    value += codeAlphabet[Math.floor(Math.random() * codeAlphabet.length)];
  }

  return value;
}

export const schemas = {
  validateCode: z.object({
    code: z.string().trim().min(4).max(32)
  }),

  vote: z.object({
    code: z.string().trim().min(4).max(32),
    candidateId: z.string().trim().min(1),
    customName: z.string().trim().max(100).optional()
  }),

  generateCodes: z.object({
    count: z.number().int().min(1).max(500)
  }),

  createCandidate: z.object({
    name: z.string().trim().min(1).max(100),
    description: z.string().trim().max(300).optional()
  })
};

export async function getCandidates() {
  return readCsv<CandidateRow>("candidates.csv");
}

export async function validateCode(code: string) {
  const codes = await readCsv<CodeRow>("codes.csv");
  return codes.some((row) => row.code === code && row.status === "unused");
}

export async function generateCodes(count: number) {
  return withWriteLock(async () => {
    const existingCodes = await readCsv<CodeRow>("codes.csv");
    const existingSet = new Set(existingCodes.map((item) => item.code));
    const newCodes: CodeRow[] = [];

    while (newCodes.length < count) {
      const code = generateCode();

      if (!existingSet.has(code)) {
        existingSet.add(code);
        newCodes.push({
          code,
          status: "unused",
          used_at: ""
        });
      }
    }

    await writeCsv<CodeRow>("codes.csv", [...existingCodes, ...newCodes], CODE_COLUMNS);
    return newCodes.map((item) => item.code);
  });
}

export async function createCandidate(input: { name: string; description?: string }) {
  return withWriteLock(async () => {
    const candidates = await readCsv<CandidateRow>("candidates.csv");
    const candidate: CandidateRow = {
      id: `cand_${nanoid(10)}`,
      name: input.name,
      description: input.description ?? ""
    };

    await writeCsv<CandidateRow>("candidates.csv", [...candidates, candidate], CANDIDATE_COLUMNS);
    return candidate;
  });
}

export async function deleteCandidate(id: string) {
  return withWriteLock(async () => {
    const candidates = await readCsv<CandidateRow>("candidates.csv");
    const nextCandidates = candidates.filter((candidate) => candidate.id !== id);

    await writeCsv<CandidateRow>("candidates.csv", nextCandidates, CANDIDATE_COLUMNS);
  });
}

export async function submitVote(input: {
  code: string;
  candidateId: string;
  customName?: string;
  userAgent?: string;
}) {
  return withWriteLock(async () => {
    const codes = await readCsv<CodeRow>("codes.csv");
    const candidates = await readCsv<CandidateRow>("candidates.csv");
    const votes = await readCsv<VoteRow>("votes.csv");

    const codeIndex = codes.findIndex((item) => item.code === input.code);

    if (codeIndex === -1 || codes[codeIndex].status !== "unused") {
      throw new Error("Kode tidak valid atau sudah digunakan.");
    }

    const isCustom = input.candidateId === "custom";

    if (!isCustom) {
      const candidateExists = candidates.some((candidate) => candidate.id === input.candidateId);

      if (!candidateExists) {
        throw new Error("Kandidat tidak ditemukan.");
      }
    }

    if (isCustom && !input.customName?.trim()) {
      throw new Error("Nama kandidat custom wajib diisi.");
    }

    const now = new Date().toISOString();

    const vote: VoteRow = {
      id: `vote_${nanoid(12)}`,
      code: input.code,
      candidate_id: input.candidateId,
      custom_name: input.customName ?? "",
      voted_at: now,
      user_agent: input.userAgent ?? ""
    };

    codes[codeIndex] = {
      ...codes[codeIndex],
      status: "used",
      used_at: now
    };

    await writeCsv<CodeRow>("codes.csv", codes, CODE_COLUMNS);
    await writeCsv<VoteRow>("votes.csv", [...votes, vote], VOTE_COLUMNS);

    return vote;
  });
}

export async function getResults() {
  const candidates = await readCsv<CandidateRow>("candidates.csv");
  const votes = await readCsv<VoteRow>("votes.csv");

  const candidateMap = new Map(candidates.map((candidate) => [candidate.id, candidate.name]));
  const resultMap = new Map<string, { candidate_id: string; candidate_name: string; votes: number }>();

  for (const candidate of candidates) {
    resultMap.set(candidate.id, {
      candidate_id: candidate.id,
      candidate_name: candidate.name,
      votes: 0
    });
  }

  for (const vote of votes) {
    const id = vote.candidate_id === "custom" ? `custom:${vote.custom_name}` : vote.candidate_id;
    const name = vote.candidate_id === "custom" ? vote.custom_name : candidateMap.get(vote.candidate_id) ?? "Unknown";

    const current = resultMap.get(id) ?? {
      candidate_id: id,
      candidate_name: name || "Custom",
      votes: 0
    };

    current.votes += 1;
    resultMap.set(id, current);
  }

  return Array.from(resultMap.values()).sort((a, b) => b.votes - a.votes);
}

export async function getVoteLogs() {
  const candidates = await readCsv<CandidateRow>("candidates.csv");
  const votes = await readCsv<VoteRow>("votes.csv");
  const candidateMap = new Map(candidates.map((candidate) => [candidate.id, candidate.name]));

  return votes
    .map((vote) => ({
      ...vote,
      candidate_name: vote.candidate_id === "custom"
        ? "Isi sendiri"
        : candidateMap.get(vote.candidate_id) ?? "Unknown"
    }))
    .sort((a, b) => b.voted_at.localeCompare(a.voted_at));
}

export async function getCodes() {
  return readCsv<CodeRow>("codes.csv");
}
