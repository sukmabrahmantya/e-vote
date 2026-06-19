export type CodeStatus = "unused" | "used";

export type CodeRow = {
  code: string;
  status: CodeStatus;
  used_at: string;
};

export type CandidateRow = {
  id: string;
  name: string;
  description: string;
};

export type VoteRow = {
  id: string;
  code: string;
  candidate_id: string;
  custom_name: string;
  voted_at: string;
  user_agent: string;
};
