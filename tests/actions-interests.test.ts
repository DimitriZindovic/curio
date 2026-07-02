import { describe, it, expect, vi, beforeEach } from "vitest";

const prismaMock = vi.hoisted(() => ({
  interest: {
    updateMany: vi.fn(),
    upsert: vi.fn(),
  },
}));
const requireUserMock = vi.hoisted(() => vi.fn());
const recomputeMock = vi.hoisted(() => vi.fn());

vi.mock("@/app/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/app/lib/session", () => ({ requireUser: requireUserMock }));
vi.mock("@/app/lib/scoring", () => ({ recomputeUserScores: recomputeMock }));
vi.mock("@/app/lib/ai", () => ({ suggestTags: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { addInterest, updateInterestWeight } from "@/app/lib/actions/interests";

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  requireUserMock.mockResolvedValue({ id: "user-1", email: "a@b.c" });
  prismaMock.interest.updateMany.mockResolvedValue({ count: 1 });
});

describe("addInterest", () => {
  it("refuse un mot-clé vide ou un poids invalide", async () => {
    const empty = await addInterest({}, form({ keyword: "  ", weight: "3" }));
    const badWeight = await addInterest({}, form({ keyword: "rust", weight: "0" }));
    expect(empty.error).toBeTruthy();
    expect(badWeight.error).toBeTruthy();
    expect(prismaMock.interest.upsert).not.toHaveBeenCalled();
  });

  it("normalise le mot-clé et upsert scopé sur l'utilisateur courant", async () => {
    const res = await addInterest({}, form({ keyword: "  ReAct ", weight: "4.7" }));
    expect(res.ok).toBe(true);
    expect(prismaMock.interest.upsert).toHaveBeenCalledWith({
      where: { userId_keyword: { userId: "user-1", keyword: "react" } },
      update: { weight: 4 },
      create: { userId: "user-1", keyword: "react", weight: 4 },
    });
    expect(recomputeMock).toHaveBeenCalledWith("user-1");
  });
});

describe("updateInterestWeight", () => {
  it("ignore un id manquant", async () => {
    await updateInterestWeight(form({ weight: "4" }));
    expect(prismaMock.interest.updateMany).not.toHaveBeenCalled();
  });

  it("refuse un poids < 1 ou non numérique", async () => {
    await updateInterestWeight(form({ id: "int-1", weight: "0" }));
    await updateInterestWeight(form({ id: "int-1", weight: "abc" }));
    expect(prismaMock.interest.updateMany).not.toHaveBeenCalled();
    expect(recomputeMock).not.toHaveBeenCalled();
  });

  it("scope la mise à jour sur l'utilisateur courant et arrondit le poids", async () => {
    await updateInterestWeight(form({ id: "int-1", weight: "4.7" }));
    expect(prismaMock.interest.updateMany).toHaveBeenCalledWith({
      where: { id: "int-1", userId: "user-1" },
      data: { weight: 4 },
    });
    expect(recomputeMock).toHaveBeenCalledWith("user-1");
  });

  it("ne recalcule pas les scores si l'intérêt n'appartient pas à l'utilisateur", async () => {
    prismaMock.interest.updateMany.mockResolvedValue({ count: 0 });
    await updateInterestWeight(form({ id: "int-autrui", weight: "4" }));
    expect(recomputeMock).not.toHaveBeenCalled();
  });
});
