/**
 * User-facing message when OpenAI rejects the API key (e.g. 401).
 * Used by AI layer (throw) and status API (detect to set errorCode). Never include key value.
 */
export const OPENAI_API_KEY_REJECTED_MESSAGE =
  "OpenAI rejected the API key. Check OPENAI_API_KEY in .env.local, restart server, and ensure the key is active.";
