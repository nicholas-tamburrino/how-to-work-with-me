import type { AnswersMap } from "@/lib/types";

function wordCount(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function cleanFragment(raw: string, maxWords: number): string {
  const withoutNewlines = raw.replace(/\s+/g, " ").trim();
  if (!withoutNewlines) return "";
  const words = withoutNewlines.split(" ").filter(Boolean);
  const sliced = words.slice(0, maxWords);
  let fragment = sliced.join(" ").trim();
  fragment = fragment.replace(/[.!?]+$/g, "");
  return fragment;
}

function getAnswer(answers: AnswersMap, keys: string[]): string | null {
  for (const key of keys) {
    const value = answers[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

function buildSnapshot(answers: AnswersMap): string {
  const who = getAnswer(answers, ["context_who"]);
  const wish = getAnswer(answers, ["context_wish"]);
  const whoFrag = who ? cleanFragment(who, 14) : "I work closely with teammates and collaborators";
  const wishFrag =
    wish != null
      ? cleanFragment(wish, 18)
      : "clarity, realistic expectations, and a calm, focused way of working help me do my best work";

  const sentence = `${whoFrag}, and ${wishFrag}.`;
  return sentence;
}

type Bullet = {
  text: string;
  source: string | null;
};

function buildBulletFromAnswer(source: string | null, fallback: string): Bullet {
  if (!source) {
    return { text: fallback, source: null };
  }
  const main = cleanFragment(source, 32);
  if (!main) {
    return { text: fallback, source: null };
  }
  const sentence = `${main}.`;
  return { text: sentence, source };
}

function buildSections(answers: AnswersMap) {
  const communicate: Bullet[] = [
    buildBulletFromAnswer(
      getAnswer(answers, ["comm_what_works"]),
      "Share what you need from me in clear, concrete terms so I can respond thoughtfully."
    ),
    buildBulletFromAnswer(
      getAnswer(answers, ["comm_respond"]),
      "Written updates work well; I often batch replies so I can protect deep-focus time."
    ),
    buildBulletFromAnswer(
      getAnswer(answers, ["comm_frustrates"]),
      "Vague, last-minute, or emotionally loaded messages make it harder for me to stay focused and responsive."
    ),
  ];

  const decisions: Bullet[] = [
    buildBulletFromAnswer(
      getAnswer(answers, ["decide_how"]),
      "I like to weigh options and tradeoffs instead of reacting on the spot."
    ),
    buildBulletFromAnswer(
      getAnswer(answers, ["decide_slows"]),
      "Too many choices without a clear recommendation slow me down and create decision fatigue."
    ),
    buildBulletFromAnswer(
      getAnswer(answers, ["decide_commit"]),
      "I commit more confidently when I understand the reasoning and feel my input was heard."
    ),
  ];

  const stresses: Bullet[] = [
    buildBulletFromAnswer(
      getAnswer(answers, ["stress_situations"]),
      "Unclear expectations, shifting priorities, or too many parallel demands quickly raise my stress level."
    ),
    buildBulletFromAnswer(
      getAnswer(answers, ["stress_act"]),
      "When I am stressed I may get quiet or shorter in messages while I try to regain focus."
    ),
    buildBulletFromAnswer(
      getAnswer(answers, ["motivation_drains"]),
      "Work that feels directionless or constantly interrupted drains my energy and increases stress."
    ),
  ];

  const helps: Bullet[] = [
    buildBulletFromAnswer(
      getAnswer(answers, ["stress_helps"]),
      "A quick, straightforward check-in and taking one thing off my plate helps me reset."
    ),
    buildBulletFromAnswer(
      getAnswer(answers, ["motivation_energy"]),
      "Giving me focused time on meaningful, well-scoped work helps me recover when I am overwhelmed."
    ),
    buildBulletFromAnswer(
      getAnswer(answers, ["motivation_recognition"]),
      "Specific recognition of what is working well helps me feel supported when things are intense."
    ),
  ];

  const quickDo: Bullet[] = [
    buildBulletFromAnswer(
      getAnswer(answers, ["comm_what_works"]),
      "When in doubt, spell out the context and options so I can respond clearly."
    ),
    buildBulletFromAnswer(
      getAnswer(answers, ["stress_helps"]),
      "Offer small, concrete ways to reduce my load instead of general reassurances."
    ),
  ];

  const quickDont: Bullet[] = [
    buildBulletFromAnswer(
      getAnswer(answers, ["comm_frustrates"]),
      "Assume I can read between the lines in vague, time-pressured, or emotionally loaded messages."
    ),
    buildBulletFromAnswer(
      getAnswer(answers, ["boundaries_hard_no", "boundaries_crossed"]),
      "Ignore previously discussed boundaries or push past clear no-go areas for me."
    ),
  ];

  return { communicate, decisions, stresses, helps, quickDo, quickDont };
}

function buildMarkdownFromPieces(
  snapshot: string,
  sections: ReturnType<typeof buildSections>
): { markdown: string; bullets: Bullet[] } {
  const { communicate, decisions, stresses, helps, quickDo, quickDont } = sections;
  const lines: string[] = [];
  const allBullets: Bullet[] = [];

  lines.push("## Snapshot", "");
  lines.push(snapshot.trim(), "");

  lines.push("## Best ways to communicate", "");
  for (const b of communicate.slice(0, 3)) {
    lines.push(`- ${b.text}`);
    allBullets.push(b);
  }
  lines.push("");

  lines.push("## How I make decisions", "");
  for (const b of decisions.slice(0, 3)) {
    lines.push(`- ${b.text}`);
    allBullets.push(b);
  }
  lines.push("");

  lines.push("## What stresses me", "");
  for (const b of stresses.slice(0, 3)) {
    lines.push(`- ${b.text}`);
    allBullets.push(b);
  }
  lines.push("");

  lines.push("## What helps when I’m overwhelmed", "");
  for (const b of helps.slice(0, 3)) {
    lines.push(`- ${b.text}`);
    allBullets.push(b);
  }
  lines.push("");

  lines.push("## Quick do / don’t list", "");
  for (const b of quickDo.slice(0, 2)) {
    lines.push(`- Do: ${b.text}`);
    allBullets.push(b);
  }
  for (const b of quickDont.slice(0, 2)) {
    lines.push(`- Don’t: ${b.text}`);
    allBullets.push(b);
  }

  const markdown = lines.join("\n").trim();
  return { markdown, bullets: allBullets };
}

function buildExpansionSentence(source: string | null): string {
  if (!source) {
    return "If you're unsure, ask me directly and I’ll clarify quickly.";
  }
  const fragment = cleanFragment(source, 20);
  if (!fragment) {
    return "If you're unsure, ask me directly and I’ll clarify quickly.";
  }
  return `This matters to me because it keeps things clear and manageable: ${fragment}.`;
}

function sentenceCount(text: string): number {
  return text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter(Boolean).length;
}

export function buildDemoManualFromAnswers(answers: AnswersMap): string {
  const snapshot = buildSnapshot(answers);
  const sections = buildSections(answers);
  let { markdown, bullets } = buildMarkdownFromPieces(snapshot, sections);

  let currentWords = wordCount(markdown);
  const minWords = 320;
  const maxWords = 520;

  if (currentWords >= minWords && currentWords <= maxWords) {
    return markdown;
  }

  let safety = 0;
  while (currentWords < minWords && safety < 100) {
    safety += 1;
    let expanded = false;

    for (let i = 0; i < bullets.length && currentWords < minWords; i++) {
      const b = bullets[i];
      if (sentenceCount(b.text) >= 2) {
        continue;
      }
      const extraSentence = buildExpansionSentence(b.source);
      const extraWords = wordCount(extraSentence);
      if (extraWords === 0) continue;
      if (currentWords + extraWords > maxWords) {
        continue;
      }
      b.text = `${b.text} ${extraSentence}`;
      expanded = true;

      const rebuilt = buildMarkdownFromPieces(snapshot, {
        communicate: sections.communicate,
        decisions: sections.decisions,
        stresses: sections.stresses,
        helps: sections.helps,
        quickDo: sections.quickDo,
        quickDont: sections.quickDont,
      });
      markdown = rebuilt.markdown;
      bullets = rebuilt.bullets;
      currentWords = wordCount(markdown);
    }

    if (!expanded) {
      break;
    }
  }

  return markdown;
}

