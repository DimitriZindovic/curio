import { prisma } from "../app/lib/prisma";
import { refreshSource } from "../app/lib/rss";
import { recomputeUserScores } from "../app/lib/scoring";
import { explainScore } from "../app/lib/scoring-core";
import { logError, errorMessage } from "../app/lib/logger";

/**
 * Seed de démonstration : peuple un compte EXISTANT avec un jeu de veille
 * réaliste — sources RSS variées (vraie ingestion réseau), centres d'intérêt
 * pondérés, tags dérivés des mots-clés matchés, articles lus, digest.
 *
 * Idempotent : sources/intérêts en upsert, articles dédoublonnés par
 * (userId, url) dans refreshSource, tags en connectOrCreate, digest créé
 * une seule fois. Rejouable sans dupliquer.
 *
 * Usage : npx tsx --env-file=.env scripts/seed-demo.ts <userId>
 * ⚠️ Mutation réseau + base : à ne lancer que sur demande explicite.
 */

const DEMO_SOURCES = [
  { name: "Hacker News", url: "https://hnrss.org/frontpage", category: "Général" },
  { name: "Dev.to", url: "https://dev.to/feed", category: "Dev" },
  { name: "GitHub Blog", url: "https://github.blog/feed/", category: "Dev" },
  { name: "Ars Technica", url: "https://feeds.arstechnica.com/arstechnica/index", category: "Tech" },
  { name: "The Verge", url: "https://www.theverge.com/rss/index.xml", category: "Tech" },
  { name: "Smashing Magazine", url: "https://www.smashingmagazine.com/feed/", category: "Frontend" },
  { name: "Simon Willison", url: "https://simonwillison.net/atom/everything/", category: "IA" },
  { name: "Next.js Blog", url: "https://nextjs.org/feed.xml", category: "Frontend" },
  { name: "Korben", url: "https://korben.info/feed", category: "Général" },
] as const;

// Mots-clés choisis pour le match par sous-chaîne : pas de terme trop court
// type « ia »/« ai » qui matcherait n'importe quel mot les contenant.
const DEMO_INTERESTS = [
  { keyword: "claude", weight: 5 },
  { keyword: "react", weight: 5 },
  { keyword: "llm", weight: 4 },
  { keyword: "typescript", weight: 4 },
  { keyword: "next.js", weight: 3 },
  { keyword: "rust", weight: 3 },
  { keyword: "postgres", weight: 3 },
  { keyword: "security", weight: 3 },
  { keyword: "kubernetes", weight: 2 },
  { keyword: "javascript", weight: 2 },
  { keyword: "python", weight: 2 },
  { keyword: "open source", weight: 2 },
] as const;

const TOP_TAGGED_ARTICLES = 10;
const MAX_TAGS_PER_ARTICLE = 2;
const DIGEST_ARTICLES = 8;
const DIGEST_PERIOD_DAYS = 7;
const READ_EVERY_NTH = 3;

async function seedInterests(userId: string): Promise<void> {
  for (const { keyword, weight } of DEMO_INTERESTS) {
    await prisma.interest.upsert({
      where: { userId_keyword: { userId, keyword } },
      update: { weight },
      create: { userId, keyword, weight },
    });
  }
  console.log(`✓ ${DEMO_INTERESTS.length} centres d'intérêt en place`);
}

async function seedSourcesAndIngest(userId: string): Promise<void> {
  for (const { name, url, category } of DEMO_SOURCES) {
    const source = await prisma.source.upsert({
      where: { userId_url: { userId, url } },
      update: { name, category },
      create: { userId, name, url, category, type: "RSS" },
    });
    const result = await refreshSource(source.id);
    if (result.error) {
      // Aléa réseau possible sur un flux tiers : tracé, mais le seed continue.
      logError("seed-demo", `refresh "${name}" en échec : ${result.error}`);
      continue;
    }
    console.log(`✓ ${name} : ${result.added} ajouté(s) / ${result.total} dans le flux`);
  }
}

/** Tague les meilleurs articles avec leurs mots-clés effectivement matchés. */
async function seedTags(userId: string): Promise<number> {
  const interests = await prisma.interest.findMany({ where: { userId } });
  const top = await prisma.article.findMany({
    where: { userId, relevanceScore: { gt: 0 } },
    orderBy: { relevanceScore: "desc" },
    take: TOP_TAGGED_ARTICLES,
  });
  let tagged = 0;
  for (const article of top) {
    const labels = explainScore(article, interests)
      .matches.filter((m) => m.matched)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, MAX_TAGS_PER_ARTICLE)
      .map((m) => m.keyword);
    if (labels.length === 0) continue;
    await prisma.article.update({
      where: { id: article.id },
      data: {
        tags: {
          connectOrCreate: labels.map((label) => ({
            where: { userId_label: { userId, label } },
            create: { userId, label },
          })),
        },
      },
    });
    tagged += 1;
  }
  return tagged;
}

/** Marque un article sur N comme lu (ordre stable) pour un historique crédible. */
async function seedReadHistory(userId: string): Promise<number> {
  const articles = await prisma.article.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  const readIds = articles.filter((_, i) => i % READ_EVERY_NTH === 0).map((a) => a.id);
  await prisma.article.updateMany({
    where: { id: { in: readIds }, userId },
    data: { read: true },
  });
  return readIds.length;
}

async function seedDigest(userId: string): Promise<void> {
  const existing = await prisma.digest.findFirst({ where: { userId } });
  if (existing) {
    console.log("✓ digest déjà présent, rien à créer");
    return;
  }
  const top = await prisma.article.findMany({
    where: { userId, relevanceScore: { gt: 0 } },
    orderBy: { relevanceScore: "desc" },
    take: DIGEST_ARTICLES,
    select: { id: true },
  });
  if (top.length === 0) {
    console.log("✗ aucun article scoré : digest non créé");
    return;
  }
  const periodEnd = new Date();
  const periodStart = new Date(periodEnd.getTime() - DIGEST_PERIOD_DAYS * 24 * 60 * 60 * 1000);
  await prisma.digest.create({
    data: {
      userId,
      title: `Digest — semaine du ${periodStart.toLocaleDateString("fr-FR")}`,
      periodStart,
      periodEnd,
      articles: { connect: top.map(({ id }) => ({ id })) },
    },
  });
  console.log(`✓ digest créé avec ${top.length} article(s)`);
}

async function main(): Promise<void> {
  const userId = process.argv[2];
  if (!userId) {
    throw new Error("Usage : npx tsx --env-file=.env scripts/seed-demo.ts <userId>");
  }
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error(`Utilisateur introuvable : ${userId}`);
  }
  console.log(`Seed démo pour ${user.name} <${user.email}>`);

  // Les intérêts d'abord : refreshSource score les articles à l'ingestion.
  await seedInterests(userId);
  await seedSourcesAndIngest(userId);

  const rescored = await recomputeUserScores(userId);
  console.log(`✓ scores recalculés sur ${rescored} article(s)`);

  const tagged = await seedTags(userId);
  console.log(`✓ ${tagged} article(s) tagué(s) d'après leurs mots-clés matchés`);

  const read = await seedReadHistory(userId);
  console.log(`✓ ${read} article(s) marqué(s) lu(s)`);

  await seedDigest(userId);

  const counts = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { _count: { select: { sources: true, articles: true, interests: true, tags: true, digests: true } } },
  });
  console.log("Bilan :", JSON.stringify(counts._count));
}

main()
  .catch((err) => {
    logError("seed-demo", errorMessage(err));
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
