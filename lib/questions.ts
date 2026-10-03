/**
 * Questionnaire definition. Each question has a unique id used as key in answers JSON.
 */
export interface Question {
  id: string;
  topic: string;
  text: string;
}

export const QUESTIONS: Question[] = [
  // Communication
  { id: "comm_what_works", topic: "Communication", text: "When someone needs something from you, what works best?" },
  { id: "comm_frustrates", topic: "Communication", text: "What communication style frustrates you or shuts you down?" },
  { id: "comm_respond", topic: "Communication", text: "How quickly do you usually respond, and why?" },
  // Decisions
  { id: "decide_how", topic: "Decisions", text: "How do you usually make decisions?" },
  { id: "decide_slows", topic: "Decisions", text: "What slows your decisions down?" },
  { id: "decide_commit", topic: "Decisions", text: "What helps you commit fully?" },
  // Stress
  { id: "stress_situations", topic: "Stress", text: "What situations reliably stress you out?" },
  { id: "stress_act", topic: "Stress", text: "How do you act when stressed?" },
  { id: "stress_helps", topic: "Stress", text: "What actually helps when you're overwhelmed?" },
  // Motivation
  { id: "motivation_energy", topic: "Motivation", text: "What kind of work gives you energy?" },
  { id: "motivation_drains", topic: "Motivation", text: "What drains you quickly?" },
  { id: "motivation_recognition", topic: "Motivation", text: "What kind of recognition feels meaningful to you?" },
  // Boundaries
  { id: "boundaries_crossed", topic: "Boundaries", text: "What boundaries do people often cross without realizing?" },
  { id: "boundaries_hard_no", topic: "Boundaries", text: "What is a hard no for you?" },
  { id: "boundaries_assumptions", topic: "Boundaries", text: "What assumptions about you are usually wrong?" },
  // Context
  { id: "context_who", topic: "Context", text: "Who is this manual for?" },
  { id: "context_wish", topic: "Context", text: "What do you wish this person understood about you?" },
];

export const QUESTION_IDS = QUESTIONS.map((q) => q.id);
