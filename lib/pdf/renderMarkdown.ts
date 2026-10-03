/**
 * PDF rendering pipeline: title page, markdown body, footer. Server-only.
 */

import {
  PDFDocument as PDFDocumentConstructor,
  StandardFonts,
  type PDFDocument,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";
import {
  BODY_LINE_HEIGHT,
  BODY_SIZE,
  BODY_Y_BOTTOM,
  BODY_Y_TOP,
  COLOR_BODY,
  COLOR_HEADING,
  COLOR_META,
  CONTENT_WIDTH,
  FOOTER_SIZE,
  LINE_GAP,
  PAGE_HEIGHT,
  PAGE_MARGIN,
  PAGE_WIDTH,
  PARAGRAPH_GAP,
  SECTION_GAP,
  SECTION_SIZE,
  SUBECTION_SIZE,
  TITLE_SIZE,
  wrapText,
  yFromTopToPdfY,
} from "./layout";
import type { Block } from "./parse";
import { parseMarkdownToBlocks } from "./parse";

const BULLET_INDENT = 16;
const BLANK_LINE_HEIGHT = BODY_LINE_HEIGHT * 0.5;
const MIN_LINES_AFTER_HEADING = 2;

interface LayoutState {
  doc: PDFDocument;
  font: PDFFont;
  fontBold: PDFFont;
  page: PDFPage;
  pageIndex: number;
  yFromTop: number;
}

function drawTitlePage(doc: PDFDocument, font: PDFFont, fontBold: PDFFont): void {
  const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

  const titleLine = "HOW TO WORK WITH ME";
  const subtitle = "A personal communication guide";
  const tagline = "Clear communication · Mutual respect · Better collaboration";

  const subtitleSize = 13;
  const gap1 = 10;
  const gap2 = 12;

  const blockHeight = TITLE_SIZE + gap1 + subtitleSize + gap2 + FOOTER_SIZE;
  const centerY = PAGE_HEIGHT / 2;
  let pdfY = centerY + blockHeight / 2;

  const titleWidth = fontBold.widthOfTextAtSize(titleLine, TITLE_SIZE);
  page.drawText(titleLine, {
    x: (PAGE_WIDTH - titleWidth) / 2,
    y: pdfY,
    size: TITLE_SIZE,
    font: fontBold,
    color: COLOR_BODY,
  });
  pdfY -= TITLE_SIZE + gap1;

  const subWidth = font.widthOfTextAtSize(subtitle, subtitleSize);
  page.drawText(subtitle, {
    x: (PAGE_WIDTH - subWidth) / 2,
    y: pdfY,
    size: subtitleSize,
    font,
    color: COLOR_BODY,
  });
  pdfY -= subtitleSize + gap2;

  const tagWidth = font.widthOfTextAtSize(tagline, FOOTER_SIZE);
  page.drawText(tagline, {
    x: (PAGE_WIDTH - tagWidth) / 2,
    y: pdfY,
    size: FOOTER_SIZE,
    font,
    color: COLOR_META,
  });
}

function ensurePage(state: LayoutState): void {
  if (state.yFromTop <= BODY_Y_BOTTOM) return;
  state.page = state.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  state.pageIndex += 1;
  state.yFromTop = BODY_Y_TOP;
}

function drawFooter(state: LayoutState, pageNumber: number): void {
  const page = state.page;
  const footerY = yFromTopToPdfY(PAGE_MARGIN - 4);
  const footerText = "How To Work With Me";
  const pageText = String(pageNumber);

  page.drawText(footerText, {
    x: PAGE_MARGIN,
    y: footerY,
    size: FOOTER_SIZE,
    font: state.font,
    color: COLOR_META,
  });

  const pageTextWidth = state.font.widthOfTextAtSize(pageText, FOOTER_SIZE);
  page.drawText(pageText, {
    x: PAGE_WIDTH - PAGE_MARGIN - pageTextWidth,
    y: footerY,
    size: FOOTER_SIZE,
    font: state.font,
    color: COLOR_META,
  });
}

function writeBlock(state: LayoutState, block: Block): void {
  if (block.type === "blank_line") {
    state.yFromTop += BLANK_LINE_HEIGHT;
    ensurePage(state);
    return;
  }

  if (block.type === "heading") {
    const size = block.level === 1 ? SECTION_SIZE : SUBECTION_SIZE;
    const height = size * 1.3 + (state.yFromTop > BODY_Y_TOP ? SECTION_GAP : 0);
    const minAfter = MIN_LINES_AFTER_HEADING * BODY_LINE_HEIGHT;
    if (state.yFromTop + height + minAfter > BODY_Y_BOTTOM) {
      ensurePage(state);
      state.yFromTop = BODY_Y_TOP;
    } else if (state.yFromTop > BODY_Y_TOP) {
      state.yFromTop += SECTION_GAP;
    }

    state.page.drawText(block.text, {
      x: PAGE_MARGIN,
      y: yFromTopToPdfY(state.yFromTop),
      size,
      font: state.fontBold,
      color: COLOR_HEADING,
    });
    state.yFromTop += size * 1.3;
    ensurePage(state);
    return;
  }

  if (block.type === "paragraph") {
    const lines = wrapText(state.font, BODY_SIZE, block.text, CONTENT_WIDTH);
    const height = lines.length * BODY_LINE_HEIGHT + PARAGRAPH_GAP;
    if (state.yFromTop + height > BODY_Y_BOTTOM) {
      ensurePage(state);
      state.yFromTop = BODY_Y_TOP;
    }
    for (const line of lines) {
      state.page.drawText(line, {
        x: PAGE_MARGIN,
        y: yFromTopToPdfY(state.yFromTop),
        size: BODY_SIZE,
        font: state.font,
        color: COLOR_BODY,
      });
      state.yFromTop += BODY_LINE_HEIGHT;
    }
    state.yFromTop += PARAGRAPH_GAP;
    ensurePage(state);
    return;
  }

  if (block.type === "bullet_item") {
    const lines = wrapText(state.font, BODY_SIZE, block.text, CONTENT_WIDTH - BULLET_INDENT);
    const height = lines.length * BODY_LINE_HEIGHT;
    if (state.yFromTop + height > BODY_Y_BOTTOM) {
      ensurePage(state);
      state.yFromTop = BODY_Y_TOP;
    }
    state.page.drawText("•", {
      x: PAGE_MARGIN,
      y: yFromTopToPdfY(state.yFromTop),
      size: BODY_SIZE,
      font: state.font,
      color: COLOR_BODY,
    });
    for (const line of lines) {
      state.page.drawText(line, {
        x: PAGE_MARGIN + BULLET_INDENT,
        y: yFromTopToPdfY(state.yFromTop),
        size: BODY_SIZE,
        font: state.font,
        color: COLOR_BODY,
      });
      state.yFromTop += BODY_LINE_HEIGHT;
    }
    state.yFromTop += PARAGRAPH_GAP * 0.5;
    ensurePage(state);
    return;
  }

  if (block.type === "numbered_item") {
    const fullText = `${block.number}. ${block.text}`;
    const lines = wrapText(state.fontBold, SECTION_SIZE, fullText, CONTENT_WIDTH);
    const height = lines.length * (SECTION_SIZE + LINE_GAP) + PARAGRAPH_GAP * 0.5;
    if (state.yFromTop + height > BODY_Y_BOTTOM) {
      ensurePage(state);
      state.yFromTop = BODY_Y_TOP;
    }
    if (state.yFromTop > BODY_Y_TOP) {
      state.yFromTop += SECTION_GAP;
    }
    for (const line of lines) {
      state.page.drawText(line, {
        x: PAGE_MARGIN,
        y: yFromTopToPdfY(state.yFromTop),
        size: SECTION_SIZE,
        font: state.fontBold,
        color: COLOR_HEADING,
      });
      state.yFromTop += SECTION_SIZE + LINE_GAP;
    }
    state.yFromTop += PARAGRAPH_GAP * 0.5;
    ensurePage(state);
    return;
  }
}

export interface ManualForPdf {
  content_markdown: string;
  created_at?: string | null;
}

/**
 * Build PDF buffer from manual. Uses StandardFonts only; deterministic.
 * Route should pass the manual object after load and validation.
 */
export async function buildPdf(manual: ManualForPdf): Promise<Buffer> {
  const doc = await PDFDocumentConstructor.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  drawTitlePage(doc, font, fontBold);

  const blocks = parseMarkdownToBlocks(manual.content_markdown);
  const firstBodyPage = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const state: LayoutState = {
    doc,
    font,
    fontBold,
    page: firstBodyPage,
    pageIndex: 1,
    yFromTop: BODY_Y_TOP,
  };

  for (const block of blocks) {
    writeBlock(state, block);
  }

  for (let i = 1; i < doc.getPageCount(); i++) {
    drawFooter(
      { ...state, page: doc.getPage(i) },
      i + 1
    );
  }

  const bytes = await doc.save();
  return Buffer.from(bytes);
}
