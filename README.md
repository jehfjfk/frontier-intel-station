# 前沿情报站 · Frontier Intel Station

一个每天自动更新的 AI 情报站：把过去 24 小时的 AI 大模型热点、本周值得行动的机会、大模型领域的每日简报，以及 GitHub 上每周最火的实用开源项目，整理成一个可以随时打开回看的网页。

A daily-updated AI intelligence station. It collects AI model hot topics from the past 24 hours, actionable opportunities of the week, a daily briefing from leading AI builders, and the week's most popular practical open-source projects on GitHub — all in one page you can open and revisit anytime.

## 模块 · Modules

| 模块 | 说明 | Description |
| --- | --- | --- |
| 主页 | 当期榜单与本周 Star 榜前 5 名预览 | Home — current editions and a Top 5 preview of the weekly Star board |
| 24H 热点 | 过去 24 小时内的 AI 大模型热点 10 条，严格按原文发布时间筛选，不用旧文凑数 | 24H Hot Topics — 10 AI hot topics from the past 24 hours, strictly filtered by original publication time |
| 本周机会 | 基于本周趋势提炼的 5 条可行动机会 | Weekly Opportunities — 5 actionable opportunities distilled from this week's trends |
| 大模型简报 | AI Builders 每日摘要：新模型、评测、智能体与开源动态精选 4–5 条 | LLM Daily Briefing — a daily digest of new models, evaluations, agents and open-source news from AI builders |
| 开源 Star 榜 | GitHub 每周实用开源项目 10 条（每周日 11:00 更新上一周数据）：中文说明 + 项目地址 + 总 Star / 本周新增 Star + 每个项目自己的最近更新时间 | Open-Source Star Board — the week's top 10 practical GitHub projects, updated every Sunday at 11:00 (Beijing time), each with a Chinese summary, repo link, total / weekly stars, and its own last-update time |

## 每个模块的信息来源（详细） · Information Sources by Module (Detailed)

总原则：本站所有模块只使用公开可访问的信息源，不使用付费数据库、不抓取需要登录授权的内容；每条内容都保留原文链接，读者可以点回源头自行核对。

General principle: every module uses only publicly accessible sources — no paywalled databases and no login-gated scraping. Every item keeps its original link so readers can verify it at the source.

### 主页 · Home

- **来源构成**：主页本身不采集外部信息，它的数据全部来自本站其余四个模块写入数据库的当期版本——24H 热点与本周机会的最新一期、大模型简报的最新一份、开源 Star 榜的最新一期（主页展示其前 5 名预览）。
  Its data comes entirely from the latest editions the other four modules write into the database: the newest 24H / Weekly Opportunities edition, the newest daily briefing, and the newest Star board (Top 5 preview on Home).
- **更新方式**：各模块更新后，主页随之更新，没有独立的采集流程。
  It refreshes whenever a module updates; there is no separate collection pipeline.

### 24H 热点 · 24H Hot Topics

- **采集方式**：每天生成时实时联网检索公开网页，围绕用户长期关注的 AI 大模型方向选题：新模型发布、模型评测、训练与推理、开源模型、智能体（Agent）、多模态和行业动态。
  Collected by real-time web search at generation time, focused on AI large models: new model releases, evaluations, training and inference, open-source models, agents, multimodal work and industry moves.
- **来源类型**（包括但不限于）：① 模型厂商与实验室的官方渠道——官方博客、模型发布页、官方文档与更新日志（如 OpenAI、Anthropic、Google DeepMind、Meta、Mistral、阿里通义千问、深度求索等发布方的一手页面）；② 开源社区的一手发布——GitHub 仓库与 Release、Hugging Face 模型页等；③ 科技媒体与行业媒体的原文报道。转载、聚合和二手转述不作为收录依据，能找到一手原文的一律以一手原文为准。
  Source types (including but not limited to): (1) official channels of model vendors and labs — official blogs, model release pages, docs and changelogs (first-party pages from releasers such as OpenAI, Anthropic, Google DeepMind, Meta, Mistral, Alibaba Qwen, DeepSeek, etc.); (2) first-party open-source releases — GitHub repositories and releases, Hugging Face model pages; (3) original reporting from tech and industry media. Reprints and second-hand summaries are not used as evidence when a first-party original exists.
- **核查步骤**：每条候选都要打开原文逐项核对——原文标注的发布时间（精确到原文给出的日期时间）、链接是否可达、内容是否与标题摘要相符；没有明确发布时间、或发布时间超出窗口的条目直接排除。
  Verification: every candidate is opened and checked item by item — the publication time stated on the original page, whether the link is reachable, and whether the content matches. Items without a clear publication time, or outside the window, are excluded.
- **时间窗口与排序**：只收生成时刻往前 24 小时内发布的内容，共 10 条；凑不够 10 条就只发实际达标条数，绝不用旧文凑数。排序综合来源影响力、传播与讨论量、时效性，不编造热度数据。
  Window and ranking: only items published within the 24 hours before generation, 10 in total; if fewer qualify, only those are shown — the list is never padded with older articles. Ranking weighs source influence, spread/discussion and recency; no heat metrics are fabricated.
- **更新频率**：每天 09:00（北京时间）生成新一期。
  Updated daily at 09:00 (Beijing time).

### 本周机会 · Weekly Opportunities

- **来源构成**：与 24H 热点共用同一套检索来源（一手官方发布、开源社区发布、科技媒体原文），区别只在时间窗口和加工方式。
  It shares the same source pool as the 24H board (first-party official releases, open-source releases, original tech reporting); only the window and the processing differ.
- **时间窗口**：最近 7 天内发布的内容。
  Window: items published within the past 7 days.
- **提炼方式**：不做简单罗列，而是从本周趋势里提炼 5 条“现在可以行动”的机会点，每条写清机会是什么、适合谁、为什么是现在；评估维度包括时效窗口（窗口期还剩多久）、落地难度和潜在价值。无法核实发布时间或链接的条目不收。
  Processing: instead of a plain list, it distills 5 actionable opportunities from the week's trends. Each states what the opportunity is, who it suits, and why now, weighed by time window, implementation difficulty and potential value. Items whose time or link cannot be verified are excluded.
- **更新频率**：每天 09:00 与 24H 热点同一期生成（内容取最近 7 天）。
  Generated daily at 09:00 (Beijing time) together with the 24H board, from the past 7 days.

### 大模型简报 · LLM Daily Briefing

- **一手数据源**：开源项目 follow-builders（作者 Zara Zhang，https://github.com/zarazhangrui/follow-builders ）维护的中央 feed。该 feed 由该项目自己的 GitHub Actions 每日自动生成，本模块只从它的公开仓库读取三类 JSON 数据：`feed-x`（X 平台发言）、播客 feed、博客 feed，不需要任何 API Key，也不另外上网搜索补充。
  Primary source: the central feed maintained by the open-source follow-builders project (by Zara Zhang, https://github.com/zarazhangrui/follow-builders). The feed is generated daily by that project's own GitHub Actions; this module only reads three kinds of JSON from its public repository — the X feed, the podcast feed and the blog feed. No API key is required, and no additional web searching is mixed in.
- **追踪对象**：follow-builders 长期追踪的一批 AI builders（约 26 位一线从业者与研究者）在 X 上的公开发言、约 6 档 AI 播客（如 Latent Space），以及 Anthropic / Claude 等官方博客。简报里每个人物的身份介绍取自其公开 bio。
  Who is tracked: a curated set of AI builders (around 26 practitioners and researchers) posting publicly on X, around 6 AI podcasts (such as Latent Space), and official blogs such as Anthropic / Claude. The one-line identity intro for each person comes from their public bio.
- **加工与核查规则**：只收录与 AI 大模型直接相关的内容（新模型发布、能力与评测、训练与推理、开源模型、智能体、多模态、大模型应用），纯个人动态、公司经营感慨、泛商业观点一律不收；每天精选最多 4–5 条。简报定稿后，文中每个链接都要与 feed JSON 里给出的 `url` 字段逐字比对，不一致就用原值替换——链接只从数据源复制，绝不凭记忆或推测改写（尤其是 X 帖子的状态 ID）。摘要是重述而非逐字引语；属于当事人未核实的说法（数字、战绩、转述）会单独加“备注”标明未独立核实。
  Processing and verification: only content directly about large AI models is included; personal updates and generic business commentary are excluded, and at most 4–5 items are selected per day. Before publishing, every link is compared character-by-character against the `url` field in the feed JSON and replaced with the original value on any mismatch — links are only ever copied from the source data, never rewritten from memory (especially X post IDs). Summaries are paraphrases, not verbatim quotes, and unverified claims by the poster (numbers, track records, second-hand reports) are flagged with an explicit note.
- **更新频率**：每天 09:30（北京时间）推送，并同步写入本模块按日期存档。
  Updated daily at 09:30 (Beijing time) and archived in this module by date.

### 开源 Star 榜 · Open-Source Star Board (GitHub Weekly)

- **一手数据源一：GitHub Trending 每周榜**。抓取 GitHub 官方 Trending 页面（https://github.com/trending?since=weekly ），解析每个上榜仓库的仓库名、英文简介、编程语言和“本周新增 Star 数（stars this week）”——本周排名的排序依据就是这个数字。
  Source 1 — GitHub Trending (weekly). The official Trending page (https://github.com/trending?since=weekly) is fetched and parsed for each repository's name, description, language and "stars this week"; the board is ranked by that weekly-gain number.
- **一手数据源二：GitHub API 复核**。对每个候选仓库再调用 GitHub 官方 REST API（`https://api.github.com/repos/{owner}/{repo}`）逐个复核三个字段：`stargazers_count`（总 Star 数，以 API 返回为准，不用 Trending 页面的取整显示）、`pushed_at`（最近一次代码推送时间，作为该项目的“最近更新”）和仓库描述。`pushed_at` 从 UTC 换算为北京时间（Asia/Shanghai）后标注在每个项目后面。
  Source 2 — GitHub API re-check. Each candidate repository is re-checked against GitHub's official REST API (`https://api.github.com/repos/{owner}/{repo}`) for three fields: `stargazers_count` (total stars; the API value wins over Trending's rounded display), `pushed_at` (the last code push, shown as the project's "last updated", converted from UTC to Beijing time) and the description.
- **为什么不用 `updated_at`**：API 的 `updated_at` 会因为收藏、改设置等元数据变动而刷新，查到的时间几乎总是“刚刚”，区分不出项目是否还在维护，所以本榜用 `pushed_at` 判断活跃度。
  Why not `updated_at`: that field refreshes on metadata changes such as starring or settings edits, so it almost always reads "just now" and cannot show whether a project is actively maintained; `pushed_at` is used instead.
- **筛选规则**：按本周新增 Star 从高到低取“实用”项目 10 条——能直接拿来用的工具、框架、技能包和应用优先；破甲 / 越狱类、纯刷榜和无实际用途的项目被过滤后，按排名顺延补足；不足 10 条时如实说明实际条数。每个项目的链接都由仓库名逐字拼成 `https://github.com/{owner}/{repo}` 并逐条比对，不凭印象写地址。
  Filtering: the top 10 "practical" projects by weekly stars — directly usable tools, frameworks, skill packs and apps first. Jailbreak-style, star-farmed or purpose-less projects are filtered out and the next-ranked ones move up; if fewer than 10 qualify, the actual count is stated. Every link is built character-by-character from the repository name as `https://github.com/{owner}/{repo}` and double-checked.
- **更新频率**：每周日 11:00（北京时间）发布上一周的数据，并同步存入本模块。
  Updated every Sunday at 11:00 (Beijing time) with the previous week's data, and archived in this module.


## 数据口径 · Data Notes

- 24H 热榜只收录原文发布时间在最近 24 小时内的内容，凑不够就如实报数。
  The 24H board only includes items verifiably published within the past 24 hours; it is never padded with older articles.
- GitHub Star 榜按 GitHub Trending Weekly 的本周新增 Star 排序，总 Star 用 GitHub API 逐个复核；每个项目的“最近更新”取 GitHub API 的 `pushed_at`（最近一次代码推送），换算为北京时间。
  The Star board is ranked by weekly stars from GitHub Trending, with total stars re-checked via the GitHub API. Each project's "last updated" is its GitHub API `pushed_at`, converted to Beijing time.
- 破甲 / 越狱类项目已按“实用”口径过滤。
  Jailbreak-style projects are filtered out under the "practical" criterion.

## 技术结构 · Tech Stack

- `client/` — 前端（TypeScript / React）：五个模块的页面与导航
  Frontend (TypeScript / React): pages and navigation for the five modules
- `server/` — 后端动作与数据结构：榜单、简报、Star 榜的写入与读取动作
  Backend actions and schema: publish/read actions for boards, briefings and the Star board
- `drizzle/` — 数据库迁移（榜单、简报、Star 榜三套表）
  Database migrations for the boards, briefings and Star board tables

## 说明 · Note

本仓库发布的是项目源码，不包含运行中的实际数据（数据库文件未包含在仓库中）。别人可以基于这份源码运行一个空站，但看不到本站的历史榜单数据。

This repository contains the source code only. Runtime data (the database file) is not included, so the code runs as an empty station without this site's historical board data.
