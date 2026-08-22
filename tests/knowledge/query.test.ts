import { describe, expect, it } from "vitest";

import { buildKnowledgeSearchPlan } from "@/lib/knowledge/query";
import type { GameAnswer } from "@/lib/game/types";

function answer(questionId: string, question: string, value: GameAnswer["answer"], index: number): GameAnswer {
  return {
    questionId,
    question,
    answer: value,
    timestamp: index + 1,
  };
}

describe("buildKnowledgeSearchPlan", () => {
  it("builds a focused current-person search from cricket evidence", () => {
    const history: GameAnswer[] = [
      answer("first-real-person", "Is your character a real person?", "yes", 0),
      answer("man", "Is your person a man?", "yes", 1),
      answer("sports", "Is your person mainly famous for sports?", "yes", 2),
      answer("cricket", "Is your person famous for cricket?", "yes", 3),
      answer("australia", "Is your person strongly associated with Australia?", "yes", 4),
      answer("cricket-bowler", "Is your cricketer mainly known as a bowler?", "yes", 5),
      answer("cricket-captain", "Has your cricketer captained their national team?", "yes", 6),
    ];

    const plan = buildKnowledgeSearchPlan(history);

    expect(plan).not.toBeNull();
    expect(plan?.primaryQuery).toMatch(/Australian/i);
    expect(plan?.primaryQuery).toMatch(/cricketer/i);
    expect(plan?.primaryQuery).toMatch(/captain|bowler/i);
    expect(plan?.expectsRealPerson).toBe(true);
    expect(plan?.positiveTags).toEqual(expect.arrayContaining(["australia", "cricket", "captain", "bowler"]));
  });

  it("does not perform noisy live discovery from gender alone", () => {
    const history: GameAnswer[] = [
      answer("first-real-person", "Is your character a real person?", "yes", 0),
      answer("man", "Is your person a man?", "yes", 1),
    ];

    expect(buildKnowledgeSearchPlan(history)).toBeNull();
  });

  it("marks fictional searches and includes character intent", () => {
    const history: GameAnswer[] = [
      answer("first-real-person", "Is your character a real person?", "no", 0),
      answer("fictional", "Is your character fictional?", "yes", 1),
      answer("anime", "Is your character from anime or manga?", "yes", 2),
      answer("fighter", "Is fighting a defining part of your character?", "yes", 3),
      answer("japan", "Is your character from a Japanese franchise?", "yes", 4),
      answer("magic", "Does your character use magic or supernatural powers?", "yes", 5),
    ];

    const plan = buildKnowledgeSearchPlan(history);

    expect(plan).not.toBeNull();
    expect(plan?.expectsFictionalCharacter).toBe(true);
    expect(plan?.primaryQuery).toMatch(/anime character|fictional character/i);
  });
});
