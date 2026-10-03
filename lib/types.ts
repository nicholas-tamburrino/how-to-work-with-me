/**
 * Shared types for DB and app.
 */

export type ManualContext = "general" | "work" | "partner";

export interface ResponseRow {
  id: string;
  user_id: string;
  answers: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export interface ManualRow {
  id: string;
  user_id: string;
  response_id: string;
  context: ManualContext;
  version: number;
  content_markdown: string;
  created_at: string;
  deleted_at?: string | null;
  family_id?: string | null;
  answers_snapshot?: Record<string, string> | null;
  /** Optional user-edited markdown layer that sits on top of generated content. */
  edited_markdown?: string | null;
  /** Timestamp when the edit layer was last updated. */
  edited_at?: string | null;
}

export interface ShareLinkRow {
  id: string;
  manual_id: string;
  token_hash: string;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

/** Questionnaire answers keyed by question_id */
export type AnswersMap = Record<string, string>;
