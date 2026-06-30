import { describe, it, expect, vi, beforeEach } from "vitest";

const prismaMock = vi.hoisted(() => ({
  source: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
}));
const requireUserMock = vi.hoisted(() => vi.fn());

vi.mock("@/app/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/app/lib/session", () => ({ requireUser: requireUserMock }));
vi.mock("@/app/lib/rss", () => ({ refreshSource: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { createSource } from "@/app/lib/actions/sources";

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  requireUserMock.mockResolvedValue({ id: "user-1", email: "a@b.c" });
  prismaMock.source.findUnique.mockResolvedValue(null);
  prismaMock.source.create.mockResolvedValue({ id: "src-1" });
});

describe("createSource", () => {
  it("refuse si le nom ou l'URL manque", async () => {
    const res = await createSource({}, form({ name: "", url: "" }));
    expect(res.error).toBeTruthy();
    expect(prismaMock.source.create).not.toHaveBeenCalled();
  });

  it("refuse une URL invalide", async () => {
    const res = await createSource({}, form({ name: "Blog", url: "pas-une-url" }));
    expect(res.error).toBeTruthy();
    expect(prismaMock.source.create).not.toHaveBeenCalled();
  });

  it("refuse un doublon (même URL pour l'utilisateur)", async () => {
    prismaMock.source.findUnique.mockResolvedValue({ id: "existing" });
    const res = await createSource(
      {},
      form({ name: "Blog", url: "https://ex.com/feed" }),
    );
    expect(res.error).toBeTruthy();
    expect(prismaMock.source.create).not.toHaveBeenCalled();
  });

  it("crée la source en la rattachant à l'utilisateur courant", async () => {
    const res = await createSource(
      {},
      form({ name: "Blog", url: "https://ex.com/feed", category: "tech" }),
    );
    expect(res.ok).toBe(true);
    expect(prismaMock.source.create).toHaveBeenCalledWith({
      data: {
        name: "Blog",
        url: "https://ex.com/feed",
        category: "tech",
        type: "RSS",
        userId: "user-1",
      },
    });
  });

  it("vérifie l'unicité dans le périmètre de l'utilisateur", async () => {
    await createSource({}, form({ name: "Blog", url: "https://ex.com/feed" }));
    expect(prismaMock.source.findUnique).toHaveBeenCalledWith({
      where: { userId_url: { userId: "user-1", url: "https://ex.com/feed" } },
    });
  });
});
