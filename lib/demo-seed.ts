import { QUESTION_IDS } from "@/lib/questions";
import type { AnswersMap } from "@/lib/types";

/**
 * Sample questionnaire answers for the /app/demo seeder.
 * Used only to generate a demo manual for presentations; all validation and audit apply.
 */
export const DEMO_ANSWERS: AnswersMap = {
  comm_what_works:
    "Giving me clear options and a short summary of what you need. I prefer written requests so I can respond when I have focus.",
  comm_frustrates:
    "Vague messages, last-minute asks, or assuming I can read tone. Harsh or passive-aggressive language shuts me down.",
  comm_respond:
    "Usually within a few hours for non-urgent things. I need quiet time to do deep work, so I batch messages.",
  decide_how:
    "I weigh pros and cons and often need a bit of time. I like to sleep on bigger decisions.",
  decide_slows:
    "Too many options without a clear recommendation. My own worry about making the wrong call.",
  decide_commit:
    "When I feel my input was heard and the plan is clear. Knowing the why behind a decision helps.",
  stress_situations:
    "Unclear expectations, too many things due at once, or feeling out of control.",
  stress_act:
    "I get quiet and need space. I might seem short or distracted until I can reset.",
  stress_helps:
    "A quick check-in, not assumptions. Offering to take one thing off my plate or extend a deadline.",
  motivation_energy:
    "Work where I can see direct impact and finish a clear chunk. Projects with a defined outcome.",
  motivation_drains:
    "Endless meetings, vague goals, or work that feels like it goes nowhere.",
  motivation_recognition:
    "Specific feedback on what I did well. A simple thanks that names the actual contribution.",
  boundaries_crossed:
    "Dropping by without notice, pinging after hours for non-urgent things, or rehashing decisions that are already made.",
  boundaries_hard_no:
    "Being spoken over in meetings. Being asked to do something that conflicts with my values.",
  boundaries_assumptions:
    "That I am fine with last-minute changes. That I don't care about details.",
  context_who: "Teammates and collaborators I work with regularly.",
  context_wish:
    "That I care a lot about doing good work and that clarity from the start helps us both.",
};

export function getDemoAnswers(): AnswersMap {
  const out: AnswersMap = {};
  for (const id of QUESTION_IDS) {
    const v = DEMO_ANSWERS[id];
    if (v) out[id] = v;
  }
  return out;
}
