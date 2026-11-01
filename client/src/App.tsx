import { useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type ApiResponse } from "./api";

type Boards = ApiResponse<typeof api, "getBoards">;
type Item = Boards["hot"][number];
type StarBoard = ApiResponse<typeof api, "getStarBoard">;
type StarItem = StarBoard["items"][number];
type View = "home" | "hot" | "opportunity" | "digest" | "stars";

const NAV: { key: View; label: string; hint: string }[] = [
  { key: "home", label: "主页", hint: "今日总览" },
  { key: "hot", label: "24H热点", hint: "严格24小时 · 按热度" },
  { key: "opportunity", label: "本周机会", hint: "本周内 · 按机会分" },
  { key: "digest", label: "大模型简报", hint: "AI Builders · 每天 09:30" },
  { key: "stars", label: "开源 Star 榜", hint: "GitHub 每周 · 周日 11:00" },
];

function formatDateLabel(dateStr: string): string {
  const [y = 1970, m = 1, d = 1] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const weekday = new Intl.DateTimeFormat("zh-CN", { weekday: "long" }).format(dt);
  return `${y}年${m}月${d}日 · ${weekday}`;
}

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

function formatPublished(iso: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

function formatWindowPoint(isoMs: number): string {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(isoMs));
}

/** Age of a source relative to the edition's generation time (fallback: now). */
function ageLabel(publishedAt: string | null, referenceIso: string | null): string | null {
  if (!publishedAt) return null;
  const pub = new Date(publishedAt).getTime();
  if (Number.isNaN(pub)) return null;
  const ref = referenceIso ? new Date(referenceIso).getTime() : Date.now();
  const diffH = Math.max(0, (ref - pub) / 3_600_000);
  if (diffH < 1) return "1小时内发布";
  if (diffH < 24) return `${Math.round(diffH)}小时前发布`;
  const days = Math.round(diffH / 24);
  return `${days}天前发布`;
}

function hoursOld(publishedAt: string | null, referenceIso: string | null): number | null {
  if (!publishedAt) return null;
  const pub = new Date(publishedAt).getTime();
  if (Number.isNaN(pub)) return null;
  const ref = referenceIso ? new Date(referenceIso).getTime() : Date.now();
  return (ref - pub) / 3_600_000;
}

function PublishedMeta({ item, generatedAt, kind }: { item: Item; generatedAt: string | null; kind: "hot" | "opportunity" }) {
  const age = ageLabel(item.publishedAt, generatedAt);
  const hrs = hoursOld(item.publishedAt, generatedAt);
  if (!item.publishedAt || !age) {
    return (
      <span className="rounded-full border border-dashed border-[var(--border)] px-2 py-0.5 font-medium" title="这一期生成时尚未记录原文发布时间">
        发布时间未核实 · 旧期存档
      </span>
    );
  }
  const fresh = kind === "hot" ? hrs != null && hrs <= 24 : hrs != null && hrs <= 24 * 7;
  return (
    <span
      className="rounded-full px-2 py-0.5 font-semibold"
      style={{
        background: fresh ? (kind === "hot" ? "var(--accent)" : "var(--accent-opp)") : "var(--surface2)",
        color: fresh ? "#fff" : "var(--dim)",
      }}
      title={`原文发布时间 ${new Date(item.publishedAt).toLocaleString("zh-CN")}`}
    >
      {fresh ? "✓ " : ""}{formatPublished(item.publishedAt)} · {age}
    </span>
  );
}

function ScoreBar({ score, kind }: { score: number; kind: "hot" | "opportunity" }) {
  const color = kind === "hot" ? "var(--accent)" : "var(--accent-opp)";
  return (
    <span className="flex items-center gap-2" aria-label={`${kind === "hot" ? "热度" : "机会分"} ${score}`}>
      <span className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-[var(--border)] sm:block">
        <span className="block h-full rounded-full" style={{ width: `${score}%`, background: color }} />
      </span>
      <span className="text-sm font-bold tabular-nums" style={{ color }}>{score}</span>
    </span>
  );
}

function RankRow({ item, kind, generatedAt, large }: { item: Item; kind: "hot" | "opportunity"; generatedAt: string | null; large?: boolean }) {
  const accent = kind === "hot" ? "var(--accent)" : "var(--accent-opp)";
  return (
    <li className="group flex gap-4 border-b border-[var(--border)] py-4 last:border-b-0 sm:gap-5 sm:py-5">
      <span
        className={`font-serif-sc shrink-0 font-black leading-none ${large ? "w-12 text-5xl sm:w-16 sm:text-6xl" : "w-9 text-3xl sm:w-11 sm:text-4xl"}`}
        style={{ color: item.rank <= 3 ? accent : "var(--dim)", opacity: item.rank <= 3 ? 1 : 0.55 }}
        aria-hidden
      >
        {item.rank}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className={`font-serif-sc font-bold leading-snug text-[var(--text)] underline-offset-4 hover:underline ${large ? "text-xl sm:text-2xl" : "text-base sm:text-lg"}`}
          >
            {item.titleZh}
          </a>
          <ScoreBar score={item.score} kind={kind} />
        </div>
        <p className="mt-1.5 text-sm leading-relaxed text-[var(--dim)]">{item.summary}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--dim)]">
          <PublishedMeta item={item} generatedAt={generatedAt} kind={kind} />
          {item.category && (
            <span className="rounded-full border border-[var(--border)] px-2 py-0.5 font-medium">{item.category}</span>
          )}
          {item.source && <span>{item.source}</span>}
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            aria-label={`阅读原文：${item.titleZh}`}
            className="font-semibold underline underline-offset-2"
            style={{ color: accent }}
          >
            原文链接 ↗
          </a>
        </div>
      </div>
    </li>
  );
}

function BoardSection({
  title,
  subtitle,
  items,
  kind,
  generatedAt,
  shortNote,
  emptyHint,
  onMore,
}: {
  title: string;
  subtitle: string;
  items: Item[];
  kind: "hot" | "opportunity";
  generatedAt: string | null;
  shortNote?: string | null;
  emptyHint?: string;
  onMore?: () => void;
}) {
  const accent = kind === "hot" ? "var(--accent)" : "var(--accent-opp)";
  return (
    <section aria-label={title} className="mt-10 first:mt-0">
      <div className="flex items-end justify-between gap-3 border-b-2 pb-3" style={{ borderColor: accent }}>
        <div>
          <h2 className="font-serif-sc text-2xl font-black text-[var(--text)] sm:text-3xl">{title}</h2>
          <p className="mt-1 text-sm text-[var(--dim)]">{subtitle}</p>
        </div>
        {onMore && (
          <button
            type="button"
            onClick={onMore}
            aria-label={`查看完整${title}`}
            className="shrink-0 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm font-semibold text-[var(--text)]"
          >
            完整榜单 →
          </button>
        )}
      </div>
      {shortNote && (
        <p role="note" className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-sm leading-relaxed">
          {shortNote}
        </p>
      )}
      {items.length === 0 ? (
        <p className="py-8 text-sm leading-relaxed text-[var(--dim)]">{emptyHint ?? "本期暂无条目。"}</p>
      ) : (
        <ul>{items.map((it) => <RankRow key={it.id} item={it} kind={kind} generatedAt={generatedAt} />)}</ul>
      )}
    </section>
  );
}

/** Minimal Markdown renderer for digest bodies: headings, bold, links, ordered/unordered lists, paragraphs. */
function renderInline(text: string, keyBase: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const pattern = /\*\*([^*]+)\*\*|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s，。；、]+)/g;
  let last = 0;
  let i = 0;
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[1] !== undefined) {
      parts.push(
        <strong key={`${keyBase}-b${i}`} className="font-bold text-[var(--text)]">{m[1]}</strong>,
      );
    } else if (m[2] !== undefined && m[3] !== undefined) {
      parts.push(
        <a key={`${keyBase}-a${i}`} href={m[3]} target="_blank" rel="noreferrer" className="font-semibold underline underline-offset-2" style={{ color: "var(--accent-opp)" }}>
          {m[2]}
        </a>,
      );
    } else if (m[4] !== undefined) {
      parts.push(
        <a key={`${keyBase}-u${i}`} href={m[4]} target="_blank" rel="noreferrer" className="break-all font-semibold underline underline-offset-2" style={{ color: "var(--accent-opp)" }}>
          {m[4]}
        </a>,
      );
    }
    last = m.index + m[0].length;
    i++;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function Markdown({ content }: { content: string }) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let listBuf: { ordered: boolean; items: string[] } | null = null;
  const flushList = () => {
    if (!listBuf) return;
    const buf = listBuf;
    listBuf = null;
    const key = `list-${blocks.length}`;
    const cls = "my-3 space-y-1.5 pl-5 text-[15px] leading-relaxed text-[var(--text)]";
    if (buf.ordered) {
      blocks.push(
        <ol key={key} className={`${cls} list-decimal`}>
          {buf.items.map((it, i) => (
            <li key={i}>{renderInline(it, `${key}-${i}`)}</li>
          ))}
        </ol>,
      );
    } else {
      blocks.push(
        <ul key={key} className={`${cls} list-disc`}>
          {buf.items.map((it, i) => (
            <li key={i}>{renderInline(it, `${key}-${i}`)}</li>
          ))}
        </ul>,
      );
    }
  };
  lines.forEach((raw) => {
    const trimmed = raw.trim();
    if (!trimmed) {
      flushList();
      return;
    }
    const ol = trimmed.match(/^\d+[.、]\s+(.*)$/);
    const ul = trimmed.match(/^[-*•]\s+(.*)$/);
    if (ol?.[1] !== undefined) {
      if (!listBuf || !listBuf.ordered) {
        flushList();
        listBuf = { ordered: true, items: [] };
      }
      listBuf.items.push(ol[1]);
      return;
    }
    if (ul?.[1] !== undefined) {
      if (!listBuf || listBuf.ordered) {
        flushList();
        listBuf = { ordered: false, items: [] };
      }
      listBuf.items.push(ul[1]);
      return;
    }
    flushList();
    const key = `blk-${blocks.length}`;
    const heading = trimmed.match(/^(#{1,3})\s+(.*)$/);
    if (heading?.[2] !== undefined) {
      blocks.push(
        <h3 key={key} className="font-serif-sc mb-2 mt-6 text-xl font-black text-[var(--text)] first:mt-0">
          {renderInline(heading[2], key)}
        </h3>,
      );
    } else {
      blocks.push(
        <p key={key} className="my-2.5 text-[15px] leading-relaxed text-[var(--text)] first:mt-0">
          {renderInline(trimmed, key)}
        </p>,
      );
    }
  });
  flushList();
  return <div>{blocks}</div>;
}

function formatStarCount(n: number): string {
  return n.toLocaleString("zh-CN");
}

/** Per-repo last update: GitHub pushed_at rendered in Beijing time. */
function formatPushedAt(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

function StarRow({ item }: { item: StarItem }) {
  const pushed = formatPushedAt(item.pushedAt);
  return (
    <li className="flex gap-4 border-b border-[var(--border)] py-4 last:border-b-0 sm:gap-5 sm:py-5">
      <span
        className="font-serif-sc shrink-0 w-9 text-3xl font-black leading-none sm:w-11 sm:text-4xl"
        style={{ color: item.rank <= 3 ? "#b57708" : "var(--dim)", opacity: item.rank <= 3 ? 1 : 0.55 }}
        aria-hidden
      >
        {item.rank}
      </span>
      <div className="min-w-0 flex-1">
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer"
          className="break-all text-base font-bold leading-snug text-[var(--text)] underline-offset-4 hover:underline sm:text-lg"
        >
          {item.repoName}
        </a>
        <p className="mt-1.5 text-sm leading-relaxed text-[var(--dim)]">{item.descriptionZh}</p>
        <p className="mt-2 text-sm">
          <span className="font-bold tabular-nums" style={{ color: "#b57708" }}>
            ★ 总 Star {formatStarCount(item.totalStars)}
          </span>
          <span className="ml-3 tabular-nums text-[var(--dim)]">本周新增 +{formatStarCount(item.weeklyStars)}</span>
        </p>
        <p className="mt-1.5 text-xs text-[var(--dim)]">
          最近更新：{pushed ? `${pushed}（北京时间）` : "未记录"}
        </p>
        <p className="mt-1 break-all text-xs">
          <a href={item.url} target="_blank" rel="noreferrer" aria-label={`打开 GitHub 项目 ${item.repoName}`} className="font-semibold underline underline-offset-2" style={{ color: "#b57708" }}>
            {item.url}
          </a>
        </p>
      </div>
    </li>
  );
}

function StarView() {
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);
  const board = useQuery({
    queryKey: ["starBoard", selectedDate ?? "latest"],
    queryFn: () => api.getStarBoard({ date: selectedDate }),
  });
  const data = board.data;

  return (
    <>
      <header className="border-b border-[var(--border)] pb-5">
        <p className="text-sm font-semibold" style={{ color: "#b57708" }}>
          {data?.date ? formatDateLabel(data.date) : "GitHub 每周榜"}
        </p>
        <h1 className="font-serif-sc mt-1 text-3xl font-black leading-tight sm:text-4xl">
          {data?.title ?? "GitHub 每周实用开源 Star 榜"}
        </h1>
        <p className="mt-2 text-sm text-[var(--dim)]">
          {data?.periodLabel ? `${data.periodLabel} · ` : ""}按本周新增 Star 排序 · 每周日 11:00 更新上一周数据
        </p>
      </header>

      {data && data.editions.length > 1 && (
        <div className="mt-5">
          <label htmlFor="star-edition-date" className="text-xs font-semibold text-[var(--dim)]">往期周榜</label>
          <select
            id="star-edition-date"
            aria-label="选择往期周榜日期"
            value={selectedDate ?? data.date ?? ""}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 text-sm sm:w-64"
          >
            {data.editions.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      )}

      {board.isPending ? (
        <p className="py-16 text-center text-sm text-[var(--dim)]">正在加载 Star 榜…</p>
      ) : board.isError ? (
        <div className="py-16 text-center">
          <p className="text-sm text-[var(--dim)]">Star 榜加载失败。</p>
          <button type="button" onClick={() => board.refetch()} aria-label="重试加载 Star 榜" className="mt-3 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold">重试</button>
        </div>
      ) : !data?.hasEdition || data.items.length === 0 ? (
        <p className="py-14 text-center text-sm text-[var(--dim)]">暂无周榜数据，新一期将于周日 11:00 发布。</p>
      ) : (
        <>
          <ul>{data.items.map((it) => <StarRow key={it.id} item={it} />)}</ul>
          {data.sourceNote && (
            <footer className="mt-10 border-t border-[var(--border)] pt-4">
              <p className="text-xs leading-relaxed text-[var(--dim)]">{data.sourceNote}</p>
            </footer>
          )}
        </>
      )}
    </>
  );
}

function DigestView() {
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);
  const list = useQuery({ queryKey: ["digests"], queryFn: () => api.listDigests({}) });
  const items = list.data?.items ?? [];
  const currentDate = selectedDate ?? items[0]?.date;
  const detail = useQuery({
    queryKey: ["digest", currentDate ?? ""],
    queryFn: () => api.getDigest({ date: currentDate }),
    enabled: !!currentDate,
  });
  const digest = detail.data;
  const others = items.filter((it) => it.date !== currentDate);

  return (
    <>
      <header className="border-b border-[var(--border)] pb-5">
        <p className="text-sm font-semibold" style={{ color: "var(--accent-opp)" }}>
          {digest?.date ? formatDateLabel(digest.date) : "大模型简报"}
        </p>
        <h1 className="font-serif-sc mt-1 text-3xl font-black leading-tight sm:text-4xl">
          {digest?.title ?? "大模型简报"}
        </h1>
      </header>

      {list.isPending || (currentDate && detail.isPending) ? (
        <p className="py-16 text-center text-sm text-[var(--dim)]">正在加载简报…</p>
      ) : list.isError || detail.isError ? (
        <div className="py-16 text-center">
          <p className="text-sm text-[var(--dim)]">简报加载失败。</p>
          <button
            type="button"
            onClick={() => {
              list.refetch();
              detail.refetch();
            }}
            aria-label="重试加载简报"
            className="mt-3 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold"
          >
            重试
          </button>
        </div>
      ) : !digest?.found || !digest.content ? (
        <p className="py-14 text-center text-sm text-[var(--dim)]">暂无简报。</p>
      ) : (
        <article className="mt-6">
          <Markdown content={digest.content} />
        </article>
      )}

      {others.length > 0 && (
        <section aria-label="往期简报" className="mt-12 border-t border-[var(--border)] pt-5">
          <h2 className="font-serif-sc text-xl font-black text-[var(--text)]">往期简报</h2>
          <ul className="mt-3 divide-y divide-[var(--border)]">
            {others.map((it) => (
              <li key={it.date}>
                <button
                  type="button"
                  onClick={() => setSelectedDate(it.date)}
                  aria-label={`查看${it.date}简报：${it.title}`}
                  className="flex w-full items-baseline gap-3 py-3 text-left"
                >
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-[var(--dim)]">{it.date}</span>
                  <span className="min-w-0 flex-1 font-semibold leading-snug text-[var(--text)] underline-offset-4 hover:underline">
                    {it.title}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

export function App() {
  const [view, setView] = useState<View>("home");
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);
  const [notice, setNotice] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const boards = useQuery({
    queryKey: ["boards", selectedDate ?? "latest"],
    queryFn: () => api.getBoards({ date: selectedDate }),
  });

  const starBoard = useQuery({
    queryKey: ["starBoard", "latest"],
    queryFn: () => api.getStarBoard({}),
  });

  const refresh = useMutation({
    mutationFn: () => api.refreshRankings({}),
    onSuccess: (res) => {
      setNotice(res.message);
      setSelectedDate(undefined);
      queryClient.invalidateQueries({ queryKey: ["boards"] });
    },
    onError: () => setNotice("刷新失败，网络或搜索服务暂时不可用，已保留上一期榜单。"),
  });

  const data = boards.data;
  const hero = data?.hot[0];
  const generatedAt = data?.generatedAt ?? null;

  // Strict window derived from generation time, so the reader can verify freshness.
  const windowLabel = generatedAt
    ? `热榜窗口：${formatWindowPoint(new Date(generatedAt).getTime() - 24 * 3_600_000)} – ${formatWindowPoint(new Date(generatedAt).getTime())} · 仅收录此窗口内发布且可核实时间的原文`
    : null;

  const hotShortNote =
    data && data.hot.length > 0 && data.hot.length < 10
      ? `严格筛选结果：过去 24 小时内可核实的 AI 动态只有 ${data.hot.length} 条达标，本期就只有 ${data.hot.length} 条——没有拿几天前的旧文凑满 10 条。每条下方都标了原文发布时间，可点链接核对。`
      : null;
  const oppShortNote =
    data && data.opportunity.length > 0 && data.opportunity.length < 5
      ? `严格筛选结果：本周内可核实的机会只有 ${data.opportunity.length} 条达标，未用旧文凑数。`
      : null;

  const navButton = (n: (typeof NAV)[number]) => {
    const active = view === n.key;
    return (
      <button
        key={n.key}
        type="button"
        onClick={() => setView(n.key)}
        aria-label={n.label}
        aria-current={active ? "page" : undefined}
        className={`rounded-lg px-3 py-2.5 text-left transition-colors lg:w-full ${
          active ? "bg-[var(--text)] text-[var(--bg)]" : "text-[var(--text)] hover:bg-[var(--surface2)]"
        }`}
      >
        <span className="block text-base font-bold leading-tight">{n.label}</span>
        <span className={`mt-0.5 hidden text-xs lg:block ${active ? "opacity-70" : "text-[var(--dim)]"}`}>{n.hint}</span>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <div className="mx-auto flex max-w-6xl flex-col lg:flex-row">
        {/* Left menu */}
        <aside className="pt-safe sticky top-0 z-20 shrink-0 border-b border-[var(--border)] bg-[var(--bg)] lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64 lg:flex-col lg:border-b-0 lg:border-r lg:px-5 lg:py-8">
          <div className="flex items-center justify-between px-4 pb-2 pt-3 lg:block lg:px-0 lg:pb-0 lg:pt-0">
            <div>
              <p className="font-serif-sc text-2xl font-black tracking-tight">前沿情报站</p>
              <p className="mt-1 hidden text-xs leading-relaxed text-[var(--dim)] lg:block">
                聚焦 AI 大模型 · 新模型 / 评测 / 开源 / 智能体 / 多模态
                <br />两榜每天 09:00 更新 · 热榜严格只收过去 24 小时内原文
                <br />GitHub 开源 Star 榜每周日 11:00 更新
              </p>
            </div>
            <button
              type="button"
              onClick={() => refresh.mutate()}
              disabled={refresh.isPending}
              aria-label="立即刷新榜单"
              className="rounded-full bg-[var(--accent)] px-3.5 py-2 text-sm font-bold text-white disabled:opacity-50 lg:mt-6"
            >
              {refresh.isPending ? "生成中…" : "↻ 立即刷新"}
            </button>
          </div>
          <nav aria-label="主菜单" className="flex gap-1 overflow-x-auto px-3 pb-3 lg:mt-8 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0">
            {NAV.map(navButton)}
          </nav>
          <div className="mt-auto hidden lg:block">
            {data && data.editions.length > 0 && (
              <div>
                <label htmlFor="edition-date" className="text-xs font-semibold text-[var(--dim)]">历史榜单</label>
                <select
                  id="edition-date"
                  aria-label="选择历史日期"
                  value={selectedDate ?? data.date ?? ""}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 text-sm"
                >
                  {data.editions.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            )}
            <p className="mt-4 text-xs leading-relaxed text-[var(--dim)]">
              热榜按热度排序 · 机会榜按机会分排序
              <br />每条标注原文发布时间，均附链接可溯源。
            </p>
          </div>
        </aside>

        {/* Main column */}
        <main className="min-w-0 flex-1 px-4 pb-16 pt-5 sm:px-6 lg:px-10 lg:pt-8">
          {data && data.editions.length > 1 && view !== "digest" && view !== "stars" && (
            <div className="mb-5 lg:hidden">
              <label htmlFor="edition-date-mobile" className="text-xs font-semibold text-[var(--dim)]">历史榜单</label>
              <select
                id="edition-date-mobile"
                aria-label="选择历史日期（移动端）"
                value={selectedDate ?? data.date ?? ""}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 text-sm"
              >
                {data.editions.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          )}

          {notice && view !== "digest" && view !== "stars" && (
            <p role="status" className="mb-5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm">
              {notice}
            </p>
          )}
          {refresh.isPending && view !== "digest" && view !== "stars" && (
            <p role="status" className="mb-5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--dim)]">
              正在搜索并严格核对原文发布时间，只保留过去 24 小时内（热榜）与本周内（机会榜）的条目，通常需要半分钟左右…
            </p>
          )}

          {view === "digest" ? (
            <DigestView />
          ) : view === "stars" ? (
            <StarView />
          ) : boards.isPending ? (
            <p className="py-16 text-center text-sm text-[var(--dim)]">正在加载榜单…</p>
          ) : boards.isError ? (
            <div className="py-16 text-center">
              <p className="text-sm text-[var(--dim)]">榜单加载失败。</p>
              <button type="button" onClick={() => boards.refetch()} aria-label="重试加载" className="mt-3 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold">重试</button>
            </div>
          ) : !data?.hasEdition ? (
            <div className="py-14 text-center">
              <p className="font-serif-sc text-3xl font-black">今日榜单尚未生成</p>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[var(--dim)]">
                榜单每天上午 09:00 自动生成。你也可以现在手动生成：系统会实时搜索 AI 大模型动态，并严格按原文发布时间筛选——热榜只收过去 24 小时内、机会榜只收本周内的条目，不足条数不拿旧文凑。
              </p>
              <button
                type="button"
                onClick={() => refresh.mutate()}
                disabled={refresh.isPending}
                aria-label="生成今日榜单"
                className="mt-6 rounded-full bg-[var(--accent)] px-6 py-3 text-base font-bold text-white disabled:opacity-50"
              >
                {refresh.isPending ? "正在生成…" : "生成今日榜单"}
              </button>
            </div>
          ) : (
            <>
              <header className="border-b border-[var(--border)] pb-5">
                <p className="text-sm font-semibold" style={{ color: "var(--accent)" }}>
                  {data.date ? formatDateLabel(data.date) : ""}
                </p>
                <h1 className="font-serif-sc mt-1 text-3xl font-black leading-tight sm:text-4xl">
                  {view === "home" && "今日总览"}
                  {view === "hot" && "24 小时热榜"}
                  {view === "opportunity" && "本周机会榜"}
                </h1>
                <p className="mt-2 text-sm text-[var(--dim)]">
                  {data.generatedAt && <>本期生成于 {formatTime(data.generatedAt)} · </>}
                  热榜 {data.hot.length} 条按热度排序 · 机会榜 {data.opportunity.length} 条按机会分排序 · 每天 09:00 更新
                </p>
                {windowLabel && view !== "opportunity" && (
                  <p className="mt-1.5 text-xs leading-relaxed text-[var(--dim)]">{windowLabel}</p>
                )}
              </header>

              {view === "home" && (
                <>
                  {hero && (
                    <article className="mt-6 rounded-xl bg-[var(--surface)] p-5 ring-1 ring-[var(--border)] sm:p-7">
                      <p className="text-xs font-bold tracking-widest" style={{ color: "var(--accent)" }}>今日头条 · 热度 {hero.score}</p>
                      <a href={hero.url} target="_blank" rel="noreferrer" className="font-serif-sc mt-2 block text-2xl font-black leading-snug underline-offset-4 hover:underline sm:text-[34px] sm:leading-tight">
                        {hero.titleZh}
                      </a>
                      <p className="mt-3 text-base leading-relaxed text-[var(--dim)]">{hero.summary}</p>
                      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-[var(--dim)]">
                        <PublishedMeta item={hero} generatedAt={generatedAt} kind="hot" />
                        {hero.category && <span className="rounded-full border border-[var(--border)] px-2 py-0.5 font-medium">{hero.category}</span>}
                        {hero.source && <span>{hero.source}</span>}
                        <a href={hero.url} target="_blank" rel="noreferrer" aria-label={`阅读头条原文：${hero.titleZh}`} className="font-semibold underline underline-offset-2" style={{ color: "var(--accent)" }}>原文链接 ↗</a>
                        <button type="button" onClick={() => setView("hot")} aria-label="查看完整24H热榜" className="ml-auto font-semibold text-[var(--text)] underline underline-offset-2">看完整热榜 →</button>
                      </div>
                    </article>
                  )}
                  {data.hot.length === 0 && (
                    <p className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm leading-relaxed">
                      本期热榜为空：严格筛选后，过去 24 小时内没有可核实发布时间的达标条目，未用旧新闻填充。可以点「立即刷新」再试一次。
                    </p>
                  )}
                  <BoardSection
                    title={`24H 热榜${data.hot.length ? ` · ${data.hot.length} 条` : ""}`}
                    subtitle="严格过去 24 小时内发布 · 按热度排序 · 每条标注原文发布时间"
                    items={data.hot.slice(1, 6)}
                    kind="hot"
                    generatedAt={generatedAt}
                    shortNote={data.hot.length > 1 ? hotShortNote : null}
                    emptyHint="本期热榜暂无条目：严格筛选后过去 24 小时内无达标原文，未用旧文凑数。"
                    onMore={() => setView("hot")}
                  />
                  <BoardSection
                    title="本周机会"
                    subtitle="过去 7 天内发布 · 按机会分排序"
                    items={data.opportunity}
                    kind="opportunity"
                    generatedAt={generatedAt}
                    shortNote={oppShortNote}
                    emptyHint="本期机会榜暂无条目：本周内无可核实发布时间的达标机会。"
                    onMore={() => setView("opportunity")}
                  />
                  {starBoard.data?.hasEdition && starBoard.data.items.length > 0 && (
                    <section aria-label="GitHub 每周实用开源 Star 榜预览" className="mt-10">
                      <div className="flex items-end justify-between gap-3 border-b-2 pb-3" style={{ borderColor: "#b57708" }}>
                        <div>
                          <h2 className="font-serif-sc text-2xl font-black text-[var(--text)] sm:text-3xl">开源 Star 榜 · 本周前 5</h2>
                          <p className="mt-1 text-sm text-[var(--dim)]">
                            GitHub 每周实用开源榜{starBoard.data.periodLabel ? ` · ${starBoard.data.periodLabel}` : ""} · 按本周新增 Star 排序 · 每周日 11:00 更新
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setView("stars")}
                          aria-label="查看完整开源 Star 榜"
                          className="shrink-0 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm font-semibold text-[var(--text)]"
                        >
                          完整榜单 →
                        </button>
                      </div>
                      <ul>{starBoard.data.items.slice(0, 5).map((it) => <StarRow key={it.id} item={it} />)}</ul>
                    </section>
                  )}
                </>
              )}

              {view === "hot" && (
                <BoardSection
                  title={`24H 热榜${data.hot.length ? ` · ${data.hot.length} 条` : ""}`}
                  subtitle="中文标题 + 一句话摘要 + 原文链接 · 严格过去 24 小时内发布 · 按热度从高到低"
                  items={data.hot}
                  kind="hot"
                  generatedAt={generatedAt}
                  shortNote={hotShortNote}
                  emptyHint="本期热榜为空：严格按原文发布时间筛选后，过去 24 小时内没有达标条目。系统没有拿几天前的旧文凑数——请稍后点「立即刷新」再试。"
                />
              )}
              {view === "opportunity" && (
                <BoardSection
                  title={`本周机会${data.opportunity.length ? ` · ${data.opportunity.length} 条` : ""}`}
                  subtitle="中文标题 + 一句话机会点 + 原文链接 · 过去 7 天内发布 · 按机会分从高到低"
                  items={data.opportunity}
                  kind="opportunity"
                  generatedAt={generatedAt}
                  shortNote={oppShortNote}
                  emptyHint="本期机会榜为空：本周内没有可核实发布时间的达标机会，未用旧文凑数。"
                />
              )}

              {data.sourceNote && (
                <footer className="mt-12 border-t border-[var(--border)] pt-4">
                  <p className="text-xs leading-relaxed text-[var(--dim)]">{data.sourceNote}</p>
                </footer>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
