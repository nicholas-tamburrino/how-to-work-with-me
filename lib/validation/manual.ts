/**
 * Validation for generated manual content.
 * Required headings must exist in order; disallowed terms must be absent.
 * If validation fails, the API must NOT store the output (see generate route).
 */

const REQUIRED_HEADINGS = [
  "1. Best Ways to Communicate With Me",
  "2. How I Make Decisions",
  "3. Stress Signals & Support",
  "4. What Motivates Me",
  "5. Boundaries You Should Know",
  "6. Best Way to Work With Me (Summary)",
];

const DISALLOWED_TERMS = [
  "mbti",
  "big five",
  "enneagram",
  "diagnosis",
  "disorder",
  "personality type",
];

export interface ValidationResult {
  valid: boolean;
  missingHeadings?: string[];
  disallowedFound?: string[];
  outOfOrder?: boolean;
}

/**
 * Validates that all required section headings exist in the correct order
 * and that no disallowed terms appear in the content.
 */
export function validateManualContent(markdown: string): ValidationResult {
  const normalized = markdown.toLowerCase();
  const missingHeadings: string[] = [];
  for (const h of REQUIRED_HEADINGS) {
    if (!markdown.includes(h)) {
      missingHeadings.push(h);
    }
  }
  const disallowedFound: string[] = [];
  for (const term of DISALLOWED_TERMS) {
    if (normalized.includes(term)) {
      disallowedFound.push(term);
    }
  }
  let outOfOrder = false;
  if (missingHeadings.length === 0) {
    let lastIndex = -1;
    for (const h of REQUIRED_HEADINGS) {
      const idx = markdown.indexOf(h);
      if (idx === -1 || idx < lastIndex) {
        outOfOrder = true;
        break;
      }
      lastIndex = idx;
    }
  }
  const valid =
    missingHeadings.length === 0 &&
    disallowedFound.length === 0 &&
    !outOfOrder;
  return {
    valid,
    ...(missingHeadings.length > 0 && { missingHeadings }),
    ...(disallowedFound.length > 0 && { disallowedFound }),
    ...(outOfOrder && { outOfOrder: true }),
  };
}
