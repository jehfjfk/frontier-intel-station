import { defineAction, z, type ActionsModule, type Ctx } from "@hatch/space-sdk";
import { asc, desc, eq } from "drizzle-orm";
import * as schema from "./schema";

function todayShanghai(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function parsePublishedAt(raw: unknown, nowMs: number): { iso: string | null; ms: number | null } {
  if (raw == null) return { iso: null, ms: null };
  if (typeof raw === "number" && Number.isFinite(raw)) {
    const ms = raw > 1e12 ? raw : raw * 1000;
    return { iso: new Date(ms).toISOString(), ms };
  }
  if (typeof raw !== "string") return { iso: null, ms: null };
  const s = raw.trim();
  if (!s) return { iso: null, ms: null };

  // Relative: "2 hours ago", "3小时前", "刚刚"
  if (/刚刚|just now/i.test(s)) return { iso: new Date(nowMs).toISOString(), ms: nowMs };
  const rel = s.match(/(\d+)\s*(分钟|小时|天|minute|min|hour|hr|day)s?\s*(前|ago)?/i);
  if (rel && (s.includes("前") || /ago/i.test(s))) {
    const n = Number(rel[1]);
    const unit = (rel[2] ?? "").toLowerCase();
    const mult = /分钟|minute|min/.test(unit) ? 60_000 : /天|day/.test(unit) ? 86_400_000 : 3_600_000;
    const ms = nowMs - n * mult;
    return { iso: new Date(ms).toISOString(), ms };
  }

  const direct = Date.parse(s);
  if (!Number.isNaN(direct)) return { iso: new Date(direct).toISOString(), ms: direct };

  // Chinese: 2026年10月30日 / 2026年10月30日 14:20
  const cnFull = s.match(/(\d{4})年(\d{1,2})月(\d{1,2})日(?:\s*(\d{1,2}):(\d{2}))?/);
  if (cnFull) {
    const y = Number(cnFull[1]); const mo = Number(cnFull[2]); const d = Number(cnFull[3]);
    const hh = Number(cnFull[4] ?? 12); const mm = Number(cnFull[5] ?? 0);
    const ms = Date.UTC(y, mo - 1, d, hh - 8, mm);
    return { iso: new Date(ms).toISOString(), ms };
  }
  // Chinese short: 10月30日 (assume current Shanghai year)
  const cnShort = s.match(/(\d{1,2})月(\d{1,2})日/);
  if (cnShort) {
    const year = Number(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric" }).format(new Date(nowMs)));
    const mo = Number(cnShort[1]); const d = Number(cnShort[2]);
    const ms = Date.UTC(year, mo - 1, d, 4, 0);
    // If that lands in the future by >1 day, it was last year.
    const adj = ms > nowMs + 86_400_000 ? Date.UTC(year - 1, mo - 1, d, 4, 0) : ms;
    return { iso: new Date(adj).toISOString(), ms: adj };
  }
  // YYYY-MM-DD
  const ymd = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (ymd) {
    const ms = Date.parse(`${ymd[0]}T12:00:00+08:00`);
    if (!Number.isNaN(ms)) return { iso: new Date(ms).toISOString(), ms };
  }
  return { iso: null, ms: null };
}

function ageLabel(ms: number | null, nowMs: number): string {
  if (ms == null) return "发布时间未知";
  const diffH = Math.max(0, Math.round((nowMs - ms) / 3_600_000));
  if (diffH < 1) return "1小时内";
  if (diffH < 24) return `约${diffH}小时前`;
  return `约${Math.round(diffH / 24)}天前`;
}

const itemOut = z.object({
  id: z.number(),
  rank: z.number(),
  titleZh: z.string(),
  summary: z.string(),
  url: z.string(),
  source: z.string().nullable(),
  score: z.number(),
  category: z.string().nullable(),
  publishedAt: z.string().nullable(),
});

type ItemOut = z.infer<typeof itemOut>;

const boardsResponse = z.object({
  hasEdition: z.boolean(),
  date: z.string().nullable(),
  generatedAt: z.string().nullable(),
  sourceNote: z.string().nullable(),
  hot: z.array(itemOut),
  opportunity: z.array(itemOut),
  editions: z.array(z.string()),
});

async function loadBoards(
  ctx: Ctx,
  requestedDate?: string,
): Promise<z.infer<typeof boardsResponse>> {
  const db = ctx.db<typeof schema>();
  const allEditions = await db
    .select()
    .from(schema.editions)
    .orderBy(desc(schema.editions.date));
  const editionDates = allEditions.map((e) => e.date);
  const target =
    requestedDate && editionDates.includes(requestedDate)
      ? allEditions.find((e) => e.date === requestedDate)
      : allEditions[0];
  if (!target) {
    return {
      hasEdition: false,
      date: null,
      generatedAt: null,
      sourceNote: null,
      hot: [],
      opportunity: [],
      editions: editionDates,
    };
  }
  const rows = await db
    .select()
    .from(schema.rankingItems)
    .where(eq(schema.rankingItems.editionDate, target.date))
    .orderBy(asc(schema.rankingItems.rank));
  const map = (r: (typeof rows)[number]): ItemOut => ({
    id: r.id,
    rank: r.rank,
    titleZh: r.titleZh,
    summary: r.summary,
    url: r.url,
    source: r.source,
    score: r.score,
    category: r.category,
    publishedAt: r.publishedAt ?? null,
  });
  return {
    hasEdition: true,
    date: target.date,
    generatedAt: target.generatedAt.toISOString(),
    sourceNote: target.sourceNote ?? null,
    hot: rows.filter((r) => r.board === "hot").map(map),
    opportunity: rows.filter((r) => r.board === "opportunity").map(map),
    editions: editionDates,
  };
}

const starItemOut = z.object({
  id: z.number(),
  rank: z.number(),
  repoName: z.string(),
  descriptionZh: z.string(),
  url: z.string(),
  totalStars: z.number(),
  weeklyStars: z.number(),
  pushedAt: z.string().nullable(),
});

const starBoardResponse = z.object({
  hasEdition: z.boolean(),
  date: z.string().nullable(),
  title: z.string().nullable(),
  periodLabel: z.string().nullable(),
  sourceNote: z.string().nullable(),
  generatedAt: z.string().nullable(),
  items: z.array(starItemOut),
  editions: z.array(z.string()),
});

const publishStarResponse = z.object({
  ok: z.literal(true),
  date: z.string(),
  count: z.number(),
});

const starProvidedItem = z.object({
  repoName: z.string(),
  descriptionZh: z.string(),
  url: z.string(),
  totalStars: z.number(),
  weeklyStars: z.number(),
  pushedAt: z.string().optional(),
});

const digestMeta = z.object({ date: z.string(), title: z.string() });

const listDigestsResponse = z.object({ items: z.array(digestMeta) });

const getDigestResponse = z.object({
  found: z.boolean(),
  date: z.string().nullable(),
  title: z.string().nullable(),
  content: z.string().nullable(),
});

const addDigestResponse = z.object({ ok: z.literal(true), date: z.string() });

const boardSchema = z.object({
  items: z
    .array(
      z.object({
        url: z.string(),
        title_zh: z.string(),
        summary: z.string(),
        score: z.number(),
        category: z.string(),
      }),
    )
    .max(12),
});
type BoardOut = z.infer<typeof boardSchema>;

const refreshResponse = z.object({
  ok: z.boolean(),
  date: z.string(),
  hotCount: z.number(),
  opportunityCount: z.number(),
  generatedAt: z.string(),
  message: z.string(),
});

const providedItem = z.object({
  titleZh: z.string(),
  summary: z.string(),
  url: z.string(),
  source: z.string().optional(),
  score: z.number(),
  category: z.string().optional(),
  publishedAt: z.string().optional(),
});

export const Actions = {
  getStarBoard: defineAction({
    description: "读取某一期 GitHub 每周实用开源 Star 榜（默认最新一期）：返回 10 个项目的中文说明、仓库地址、总 Star、本周新增 Star 与每个项目自己的最近更新时间（GitHub pushed_at）。",
    request: z.object({ date: z.string().optional() }),
    response: starBoardResponse,
    async handler(ctx, args): Promise<z.infer<typeof starBoardResponse>> {
      const db = ctx.db<typeof schema>();
      const all = await db
        .select()
        .from(schema.starEditions)
        .orderBy(desc(schema.starEditions.date));
      const editionDates = all.map((e) => e.date);
      const target =
        args.date && editionDates.includes(args.date)
          ? all.find((e) => e.date === args.date)
          : all[0];
      if (!target) {
        return {
          hasEdition: false,
          date: null,
          title: null,
          periodLabel: null,
          sourceNote: null,
          generatedAt: null,
          items: [],
          editions: editionDates,
        };
      }
      const rows = await db
        .select()
        .from(schema.starItems)
        .where(eq(schema.starItems.editionDate, target.date))
        .orderBy(asc(schema.starItems.rank));
      return {
        hasEdition: true,
        date: target.date,
        title: target.title,
        periodLabel: target.periodLabel ?? null,
        sourceNote: target.sourceNote ?? null,
        generatedAt: target.generatedAt.toISOString(),
        items: rows.map((r) => ({
          id: r.id,
          rank: r.rank,
          repoName: r.repoName,
          descriptionZh: r.descriptionZh,
          url: r.url,
          totalStars: r.totalStars,
          weeklyStars: r.weeklyStars,
          pushedAt: r.pushedAt ?? null,
        })),
        editions: editionDates,
      };
    },
  }),

  publishStarEdition: defineAction({
    description: "发布一期 GitHub 每周实用开源 Star 榜：按 date 覆盖同日期条目；每条含中文说明、仓库地址、总 Star、本周新增 Star 和该项目自己的最近更新时间 pushedAt（GitHub API pushed_at，ISO 字符串）。供每周日 11:00 的周榜任务写入。",
    request: z.object({
      date: z.string(),
      title: z.string(),
      periodLabel: z.string().optional(),
      sourceNote: z.string().optional(),
      generatedAt: z.string().optional(),
      items: z.array(starProvidedItem).max(20),
    }),
    response: publishStarResponse,
    async handler(ctx, args): Promise<z.infer<typeof publishStarResponse>> {
      const db = ctx.db<typeof schema>();
      const generatedAt = args.generatedAt ? new Date(args.generatedAt) : new Date();
      await db
        .delete(schema.starItems)
        .where(eq(schema.starItems.editionDate, args.date));
      await db
        .insert(schema.starEditions)
        .values({
          date: args.date,
          title: args.title,
          periodLabel: args.periodLabel ?? null,
          sourceNote: args.sourceNote ?? null,
          generatedAt,
        })
        .onConflictDoUpdate({
          target: schema.starEditions.date,
          set: {
            title: args.title,
            periodLabel: args.periodLabel ?? null,
            sourceNote: args.sourceNote ?? null,
            generatedAt,
          },
        });
      if (args.items.length > 0) {
        await db.insert(schema.starItems).values(
          args.items.map((d, i) => ({
            editionDate: args.date,
            rank: i + 1,
            repoName: d.repoName,
            descriptionZh: d.descriptionZh,
            url: d.url,
            totalStars: d.totalStars,
            weeklyStars: d.weeklyStars,
            pushedAt: d.pushedAt ?? null,
          })),
        );
      }
      ctx.invalidateQueries();
      return { ok: true, date: args.date, count: args.items.length };
    },
  }),

  getBoards: defineAction({
    description: "读取某一期前沿情报站榜单（默认最新一期）：返回 24H 热榜与本周机会榜的条目、生成时间与来源说明。",
    request: z.object({ date: z.string().optional() }),
    response: boardsResponse,
    async handler(ctx, args): Promise<z.infer<typeof boardsResponse>> {
      return loadBoards(ctx, args.date);
    },
  }),

  refreshRankings: defineAction({
    description: "实时搜索 AI 大模型动态并严格按原文发布时间筛选，重新生成今天的 24H 热榜与本周机会榜。",
    request: z.object({}),
    response: refreshResponse,
    async handler(ctx): Promise<z.infer<typeof refreshResponse>> {
      const date = todayShanghai();
      const db = ctx.db<typeof schema>();
      const now = new Date();
      const nowMs = now.getTime();
      const HOT_WINDOW_MS = 24 * 3_600_000;
      const WEEK_WINDOW_MS = 7 * 24 * 3_600_000;
      const hotStart = nowMs - HOT_WINDOW_MS;
      const weekStart = nowMs - WEEK_WINDOW_MS;
      // Allow 2h clock skew for sources slightly ahead.
      const futureLimit = nowMs + 2 * 3_600_000;

      const hotQueries = [
        `AI 大模型 最新发布 今日 ${date}`,
        `AI 大模型 新闻 今日 最新 ${date}`,
        "开源大模型 最新发布 今日",
        "AI 智能体 多模态 最新动态 今日",
        "LLM new model release today latest news",
      ];
      const oppQueries = [
        `AI 大模型 创业机会 商业化 本周 ${date}`,
        "AI 开源模型 API 新能力开放 本周",
        "AI 应用落地 机会 最新一周",
      ];
      const allQueries = [...hotQueries, ...oppQueries];

      type PoolItem = {
        title: string;
        url: string;
        source: string | null;
        snippet: string;
        publishedAt: string | null;
        publishedMs: number | null;
      };
      const pool = new Map<string, PoolItem>();
      const results = await Promise.all(
        allQueries.map((q) => ctx.tool.web_search(q).catch(() => null)),
      );
      for (const res of results) {
        if (!res) continue;
        const list = (res as { content?: { results?: unknown[] } }).content?.results ?? [];
        for (const rawItem of list as Record<string, unknown>[]) {
          const url = typeof rawItem.url === "string" ? rawItem.url : "";
          if (!url || pool.has(url)) continue;
          const rawPub =
            rawItem.published_at ?? rawItem.publishedAt ?? rawItem.date ?? rawItem.published ?? rawItem.time ?? null;
          const parsed = parsePublishedAt(rawPub, nowMs);
          pool.set(url, {
            title: typeof rawItem.title === "string" ? rawItem.title : url,
            url,
            source: typeof rawItem.source === "string" ? rawItem.source : null,
            snippet: (typeof rawItem.snippet === "string" ? rawItem.snippet : "").replace(/\s+/g, " ").trim(),
            publishedAt: parsed.iso,
            publishedMs: parsed.ms,
          });
        }
      }
      const poolArr = [...pool.values()];

      if (poolArr.length === 0) {
        return {
          ok: false,
          date,
          hotCount: 0,
          opportunityCount: 0,
          generatedAt: now.toISOString(),
          message: "搜索暂未返回结果，已保留上一期榜单，请稍后再试。",
        };
      }

      const cleanSnippet = (s: string) =>
        s
          .replace(/Last Updated:[^#]*?Last Crawl:[^#]*?(?=#|\s[A-Z一-鿿])/gi, "")
          .replace(/^#+\s*/gm, "")
          .replace(/\s+/g, " ")
          .trim();
      for (const p of poolArr) p.snippet = cleanSnippet(p.snippet);

      // ---- Strict time filtering (the fix for “新闻不是最新的”) ----
      // Hot: ONLY items whose source published_at is verifiable AND inside
      // the last 24h. Unknown-date items are excluded — never padded with old news.
      // Opportunity: ONLY items verifiable inside the last 7 days.
      const inWindow = (p: PoolItem, start: number) =>
        p.publishedMs != null && p.publishedMs >= start && p.publishedMs <= futureLimit;
      const byRecency = (a: PoolItem, b: PoolItem) => (b.publishedMs ?? 0) - (a.publishedMs ?? 0);
      const hotEligible = poolArr.filter((p) => inWindow(p, hotStart)).sort(byRecency);
      const weekEligible = poolArr.filter((p) => inWindow(p, weekStart)).sort(byRecency);

      const fmtPool = (items: PoolItem[]) =>
        items
          .map(
            (p, i) =>
              `[${i + 1}] 来源:${p.source ?? "未知"} | 发布时间:${p.publishedAt ?? "未知"}（${ageLabel(p.publishedMs, nowMs)}） | 标题:${p.title} | 链接:${p.url} | 片段:${p.snippet.slice(0, 240)}`,
          )
          .join("\n");

      let inferenceError = "";
      const distill = async (
        items: PoolItem[],
        instruction: string,
      ): Promise<BoardOut | null> => {
        if (items.length === 0) return null;
        try {
          return await ctx.inference.complete(
            `${instruction}\n\n候选池（已按发布时间严格过滤，池外/旧文一律不要选）：\n${fmtPool(items)}`,
            { schema: boardSchema, timeout_secs: 55 },
          );
        } catch (e) {
          if (!inferenceError) inferenceError = String(e).slice(0, 200);
          return null;
        }
      };

      const hotOut = await distill(
        hotEligible.slice(0, 24),
        `你是专注 AI 大模型领域的中文编辑。候选池里的每一条都已核实为过去24小时内发布。现在从中选出最值得关注的条目（新模型发布、评测、训练与推理、开源模型、智能体、多模态、行业动态），最多 10 条，按热度从高到低排列；池里不足 10 条就只选实际条数，绝不要用旧新闻或池外内容凑数。score 为 0-100 热度分。url 必须原样使用候选池链接，不得编造。title_zh 为简洁中文标题（外文翻译成中文）。summary 为一句话中文摘要，不超过 60 字，只讲发生了什么、为什么重要。category 从「新模型」「评测」「开源」「智能体」「多模态」「推理与训练」「行业」「工具」中选一。只用池内事实。`,
      );
      const hotUrls = new Set((hotOut?.items ?? []).map((i) => i.url));
      const oppPoolItems = weekEligible.filter((p) => !hotUrls.has(p.url)).slice(0, 20);
      const oppOut = await distill(
        oppPoolItems,
        `你是专注 AI 大模型领域的中文编辑。候选池里的每一条都已核实为过去7天内发布。现在从中选出最值得跟进的 5 条机会（开源可商用、API降价或新能力开放、垂直落地缺口、工具链与推理优化、新基准带来的差异化空间），按机会价值从高到低排列；不足 5 条就只选实际条数，不要凑数。score 为 0-100 机会分。url 必须原样使用候选池链接，不得编造。title_zh 为简洁中文标题（外文翻译成中文）。summary 写成一句话机会点，不超过 60 字：点明谁可以做什么、为什么现在值得做，不要只复述新闻。category 从「新模型」「评测」「开源」「智能体」「多模态」「推理与训练」「行业」「工具」中选一。只用池内事实。`,
      );

      const used = new Set<string>();
      type Draft = {
        url: string;
        titleZh: string;
        summary: string;
        score: number;
        category: string;
        source: string | null;
        publishedAt: string | null;
      };
      const pick = (
        list: { url: string; title_zh: string; summary: string; score: number; category: string }[] | undefined,
        limit: number,
        eligible: Set<string>,
      ): Draft[] => {
        const out: Draft[] = [];
        for (const it of list ?? []) {
          if (out.length >= limit) break;
          // Defense in depth: drop anything outside the strict window even if the model picked it.
          if (!eligible.has(it.url)) continue;
          const p = pool.get(it.url);
          if (!p || used.has(it.url)) continue;
          used.add(it.url);
          out.push({
            url: it.url,
            titleZh: it.title_zh.trim() || p.title,
            summary: it.summary.trim(),
            score: Math.max(1, Math.min(100, Math.round(it.score))),
            category: it.category.trim() || "综合",
            source: p.source,
            publishedAt: p.publishedAt,
          });
        }
        return out;
      };

      const hotEligibleSet = new Set(hotEligible.map((p) => p.url));
      const weekEligibleSet = new Set(weekEligible.map((p) => p.url));
      let hot = pick(hotOut?.items, 10, hotEligibleSet);
      let opportunity = pick(oppOut?.items, 5, weekEligibleSet);

      // Fallback fill: ONLY from the same strict-window eligible pool, newest first.
      // Never falls back to undated or out-of-window items.
      const fill = (drafts: Draft[], limit: number, topScore: number, eligibleSorted: PoolItem[]): Draft[] => {
        if (drafts.length >= limit) return drafts;
        const out = [...drafts];
        let s = topScore;
        for (const p of eligibleSorted) {
          if (out.length >= limit) break;
          if (used.has(p.url)) continue;
          used.add(p.url);
          const firstSentence = p.snippet.split(/[。！？.!?]/)[0]?.trim() ?? "";
          out.push({
            url: p.url,
            titleZh: p.title,
            summary: (firstSentence || p.title).slice(0, 90),
            score: Math.max(30, s),
            category: "综合",
            source: p.source,
            publishedAt: p.publishedAt,
          });
          s -= 4;
        }
        return out;
      };
      hot = fill(hot, Math.min(10, hotEligible.length), 82, hotEligible);
      // Opportunity fill: same strict week window, skips URLs already used by hot.
      opportunity = fill(opportunity, 5, 78, weekEligible).slice(0, 5);

      hot.sort((a, b) => b.score - a.score);
      opportunity.sort((a, b) => b.score - a.score);

      // If strict filtering leaves both boards empty, do NOT overwrite the
      // previous edition with an empty one and do NOT pad with old news.
      if (hot.length === 0 && opportunity.length === 0) {
        return {
          ok: false,
          date,
          hotCount: 0,
          opportunityCount: 0,
          generatedAt: now.toISOString(),
          message: `本次严格筛选后暂无可核实发布时间的新条目（已检索 ${poolArr.length} 条，其中24小时内 ${hotEligible.length} 条、本周内 ${weekEligible.length} 条），已保留上一期榜单，未用旧新闻凑数。请稍后再刷新。`,
        };
      }

      await db
        .delete(schema.rankingItems)
        .where(eq(schema.rankingItems.editionDate, date));
      await db
        .insert(schema.editions)
        .values({ date, generatedAt: now })
        .onConflictDoUpdate({
          target: schema.editions.date,
          set: { generatedAt: now },
        });

      const rowsToInsert = [
        ...hot.map((d, i) => ({
          editionDate: date,
          board: "hot" as const,
          rank: i + 1,
          titleZh: d.titleZh,
          summary: d.summary,
          url: d.url,
          source: d.source,
          score: d.score,
          category: d.category,
          publishedAt: d.publishedAt,
        })),
        ...opportunity.map((d, i) => ({
          editionDate: date,
          board: "opportunity" as const,
          rank: i + 1,
          titleZh: d.titleZh,
          summary: d.summary,
          url: d.url,
          source: d.source,
          score: d.score,
          category: d.category,
          publishedAt: d.publishedAt,
        })),
      ];
      if (rowsToInsert.length > 0) {
        await db.insert(schema.rankingItems).values(rowsToInsert);
      }

      // Prune to the latest 30 editions.
      const all = await db
        .select()
        .from(schema.editions)
        .orderBy(desc(schema.editions.date));
      for (const old of all.slice(30)) {
        await db
          .delete(schema.rankingItems)
          .where(eq(schema.rankingItems.editionDate, old.date));
        await db
          .delete(schema.editions)
          .where(eq(schema.editions.date, old.date));
      }

      ctx.invalidateQueries();
      const shortNote =
        hot.length < 10
          ? ` 热榜严格按过去24小时筛选，仅 ${hot.length} 条达标，未用旧文凑满10条。`
          : "";
      return {
        ok: true,
        date,
        hotCount: hot.length,
        opportunityCount: opportunity.length,
        generatedAt: now.toISOString(),
        message: `已生成 ${date} 榜单：热榜 ${hot.length} 条（严格24小时内），机会榜 ${opportunity.length} 条（本周内）。${shortNote}${inferenceError ? `（提炼异常：${inferenceError}）` : ""}`,
      };
    },
  }),

  publishEdition: defineAction({
    description: "把外部已核实的一期榜单（标题、摘要、原文链接、来源）原样发布为指定日期的前沿情报站榜单，覆盖该日期的旧条目。",
    request: z.object({
      date: z.string(),
      generatedAt: z.string(),
      sourceNote: z.string(),
      hot: z.array(providedItem),
      opportunity: z.array(providedItem),
    }),
    response: refreshResponse,
    async handler(ctx, args): Promise<z.infer<typeof refreshResponse>> {
      const db = ctx.db<typeof schema>();
      const generatedAt = new Date(args.generatedAt);
      await db
        .delete(schema.rankingItems)
        .where(eq(schema.rankingItems.editionDate, args.date));
      await db
        .insert(schema.editions)
        .values({ date: args.date, generatedAt, sourceNote: args.sourceNote })
        .onConflictDoUpdate({
          target: schema.editions.date,
          set: { generatedAt, sourceNote: args.sourceNote },
        });
      const rowsToInsert = [
        ...args.hot.map((d, i) => ({
          editionDate: args.date,
          board: "hot" as const,
          rank: i + 1,
          titleZh: d.titleZh,
          summary: d.summary,
          url: d.url,
          source: d.source ?? null,
          score: d.score,
          category: d.category ?? null,
          publishedAt: d.publishedAt ?? null,
        })),
        ...args.opportunity.map((d, i) => ({
          editionDate: args.date,
          board: "opportunity" as const,
          rank: i + 1,
          titleZh: d.titleZh,
          summary: d.summary,
          url: d.url,
          source: d.source ?? null,
          score: d.score,
          category: d.category ?? null,
          publishedAt: d.publishedAt ?? null,
        })),
      ];
      if (rowsToInsert.length > 0) {
        await db.insert(schema.rankingItems).values(rowsToInsert);
      }
      ctx.invalidateQueries();
      return {
        ok: true,
        date: args.date,
        hotCount: args.hot.length,
        opportunityCount: args.opportunity.length,
        generatedAt: generatedAt.toISOString(),
        message: `已发布 ${args.date} 榜单：热榜 ${args.hot.length} 条，机会榜 ${args.opportunity.length} 条。`,
      };
    },
  }),

  addDigest: defineAction({
    description: "写入或覆盖某一天的大模型每日简报（AI Builders 简报）：按 date 新增或覆盖同日条目，含标题与 Markdown 全文。",
    request: z.object({
      date: z.string(),
      title: z.string(),
      content: z.string(),
    }),
    response: addDigestResponse,
    async handler(ctx, args): Promise<z.infer<typeof addDigestResponse>> {
      const db = ctx.db<typeof schema>();
      await db
        .insert(schema.digests)
        .values({ date: args.date, title: args.title, content: args.content })
        .onConflictDoUpdate({
          target: schema.digests.date,
          set: { title: args.title, content: args.content },
        });
      ctx.invalidateQueries();
      return { ok: true, date: args.date };
    },
  }),

  listDigests: defineAction({
    description: "列出全部大模型每日简报的日期与标题，按日期从新到旧排列。",
    request: z.object({}),
    response: listDigestsResponse,
    async handler(ctx): Promise<z.infer<typeof listDigestsResponse>> {
      const db = ctx.db<typeof schema>();
      const rows = await db
        .select({ date: schema.digests.date, title: schema.digests.title })
        .from(schema.digests)
        .orderBy(desc(schema.digests.date));
      return { items: rows.map((r) => ({ date: r.date, title: r.title })) };
    },
  }),

  getDigest: defineAction({
    description: "读取某一天大模型每日简报的标题与 Markdown 全文；不传 date 时返回最新一份。",
    request: z.object({ date: z.string().optional() }),
    response: getDigestResponse,
    async handler(ctx, args): Promise<z.infer<typeof getDigestResponse>> {
      const db = ctx.db<typeof schema>();
      const rows = args.date
        ? await db
            .select()
            .from(schema.digests)
            .where(eq(schema.digests.date, args.date))
        : await db
            .select()
            .from(schema.digests)
            .orderBy(desc(schema.digests.date))
            .limit(1);
      const row = rows[0];
      if (!row) {
        return { found: false, date: null, title: null, content: null };
      }
      return { found: true, date: row.date, title: row.title, content: row.content };
    },
  }),
} satisfies ActionsModule;
