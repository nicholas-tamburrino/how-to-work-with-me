/**
 * Simple markdown-to-blocks parser for manual content.
 * Uses split("\n") and keeps blank lines; no full markdown library.
 */

export type Block =
  | { type: "heading"; level: 1 | 2; text: string }
  | { type: "numbered_item"; number: number; text: string }
  | { type: "bullet_item"; text: string }
  | { type: "blank_line" }
  | { type: "paragraph"; text: string };

const NUMBERED_RE = /^(\d+)\.\s+/;

function isBlank(line: string): boolean {
  return line.length === 0;
}

function isHeading1(line: string): boolean {
  return line.startsWith("# ");
}

function isHeading2(line: string): boolean {
  return line.startsWith("## ");
}

function isNumbered(line: string): boolean {
  return NUMBERED_RE.test(line);
}

function isBullet(line: string): boolean {
  return (
    line.startsWith("- ") ||
    line.startsWith("• ") ||
    line.startsWith("* ")
  );
}

/**
 * Parse content_markdown into an array of semantic blocks.
 * Consecutive non-blank, non-heading, non-list lines are merged into one paragraph.
 */
export function parseMarkdownToBlocks(contentMarkdown: string): Block[] {
  const rawLines = contentMarkdown.split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < rawLines.length) {
    const line = rawLines[i];

    if (isBlank(line)) {
      blocks.push({ type: "blank_line" });
      i += 1;
      continue;
    }

    if (isHeading1(line)) {
      blocks.push({
        type: "heading",
        level: 1,
        text: line.slice(2).trim(),
      });
      i += 1;
      continue;
    }

    if (isHeading2(line)) {
      blocks.push({
        type: "heading",
        level: 2,
        text: line.slice(3).trim(),
      });
      i += 1;
      continue;
    }

    const numberedMatch = line.match(NUMBERED_RE);
    if (numberedMatch) {
      const number = parseInt(numberedMatch[1], 10);
      const text = line.slice(numberedMatch[0].length).trim();
      blocks.push({ type: "numbered_item", number, text });
      i += 1;
      continue;
    }

    if (isBullet(line)) {
      const text = line.slice(2).trim();
      blocks.push({ type: "bullet_item", text });
      i += 1;
      continue;
    }

    // Paragraph: merge consecutive paragraph lines (until blank or special)
    const paraLines: string[] = [];
    while (i < rawLines.length) {
      const ln = rawLines[i];
      if (
        isBlank(ln) ||
        isHeading1(ln) ||
        isHeading2(ln) ||
        isNumbered(ln) ||
        isBullet(ln)
      ) {
        break;
      }
      paraLines.push(ln.trim());
      i += 1;
    }
    const text = paraLines.join(" ").replace(/\s+/g, " ").trim();
    if (text) {
      blocks.push({ type: "paragraph", text });
    }
  }

  return blocks;
}
