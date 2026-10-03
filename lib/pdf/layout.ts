/**
 * PDF layout constants and typography. Server-only; used by renderMarkdown.
 */

import type { PDFFont } from "pdf-lib";
import { rgb } from "pdf-lib";

// Page: US Letter
export const PAGE_WIDTH = 612;
export const PAGE_HEIGHT = 792;

// Margins and content
export const PAGE_MARGIN = 64;
export const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;

// Typography
export const TITLE_SIZE = 32;
export const SECTION_SIZE = 16;
export const SUBECTION_SIZE = 14; // ## heading
export const BODY_SIZE = 11;
export const FOOTER_SIZE = 9;

// Spacing
export const LINE_GAP = 4;
export const PARAGRAPH_GAP = 10;
export const SECTION_GAP = 18;

// Derived line height for body text
export const BODY_LINE_HEIGHT = BODY_SIZE + LINE_GAP;

// Body region (for page flow). yFromTop = distance from top of page.
export const FOOTER_BAND = 24;
export const BODY_Y_TOP = PAGE_MARGIN + FOOTER_BAND;
export const BODY_Y_BOTTOM = PAGE_HEIGHT - PAGE_MARGIN - FOOTER_BAND;

// Colors: slight gray for headings, black for body
export const COLOR_HEADING = rgb(0.35, 0.35, 0.35);
export const COLOR_BODY = rgb(0, 0, 0);
export const COLOR_META = rgb(0.5, 0.5, 0.5);

/**
 * Wrap text to fit maxWidth. Normalizes whitespace; preserves punctuation.
 */
export function wrapText(
  font: PDFFont,
  size: number,
  text: string,
  maxWidth: number
): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [""];

  const words = normalized.split(" ");
  if (words.length === 0) return [""];

  const lines: string[] = [];
  let current = words[0];

  for (let i = 1; i < words.length; i++) {
    const next = current + " " + words[i];
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      current = next;
    } else {
      lines.push(current);
      current = words[i];
    }
  }
  lines.push(current);
  return lines;
}

/** Convert yFromTop (distance from top) to pdf-lib Y (from bottom). */
export function yFromTopToPdfY(yFromTop: number): number {
  return PAGE_HEIGHT - yFromTop;
}
