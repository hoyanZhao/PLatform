import {
  readFile,
  writeFile,
  mkdir,
  rename,
  open,
  unlink,
  stat,
} from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { XMLParser } from "fast-xml-parser";
import { load } from "cheerio";
import robotsParser from "robots-parser";
import { ROOT, newsSources } from "./config.js";

// 抓取器只有新闻缓存写入路径，没有税制、资助或评测参数写入接口。
const DIRECTORY = path.join(ROOT, "storage");
const CACHE = path.join(DIRECTORY, "news-cache.json");
const LOCK = path.join(DIRECTORY, "news-sync.lock");
const DAY = 86400000;
const USER_AGENT = "HKInvestDemo/1.0";
const lastRequest = new Map();
const officialHosts = new Set(newsSources.map((s) => new URL(s.url).hostname));
const initial = () => ({
  lastAttemptAt: null,
  lastSuccessAt: null,
  nextAllowedAt: null,
  revision: "",
  items: [],
  sources: [],
});
let syncing = false;
export async function readNews() {
  try {
    const value = JSON.parse(await readFile(CACHE, "utf8"));
    // 分类规则升级可重新过滤缓存，但不再请求源站，更不影响评测参数。
    value.items = value.items
      .filter((x) => relevant(`${x.title} ${x.summary}`))
      .map((x) => ({ ...x, category: classify(`${x.title} ${x.summary}`) }));
    value.revision = createHash("sha256")
      .update(
        value.items
          .map((x) => x.id)
          .sort()
          .join("|"),
      )
      .digest("hex")
      .slice(0, 16);
    return value;
  } catch (error) {
    if (error.code === "ENOENT") return initial();
    throw error;
  }
}
const plain = (value) => {
  const $ = load(String(value ?? ""));
  $("script,style").remove();
  return $.text().replace(/\s+/g, " ").trim();
};
const date = (value) => {
  const n = Date.parse(value ?? "");
  return Number.isFinite(n) ? new Date(n).toISOString() : null;
};
export function classify(text) {
  if (/tax|税|財稅|财税|profit/i.test(text)) return "财税";
  if (/talent|visa|人才|签证|簽證|immigration/i.test(text)) return "引才";
  if (
    /science park|industrial park|innovation park|cyberport|科技园|科學園|科学园|創新園|创新园|incubat/i.test(
      text,
    )
  )
    return "招商园区";
  if (
    /\b(?:funding|grants?|subsidy|subsidies)\b|fund approves|資助|资助|補貼|补贴|innovation/i.test(
      text,
    )
  )
    return "科创补贴";
  return "招商资讯";
}
const relevant = (text) =>
  !/\b(?:fraudulent|scam|mpox|vaccination|restaurant|memorial|horticultural)\b/i.test(
    text,
  ) &&
  /\b(?:investment|investhk|investors?|business|tax|taxation|talent|visa|funding|grants?|subsidy|innovation|fintech|enterprises?|trade|manufacturing)\b|science park|cyberport|招商|投資|投资|人才|签证|稅|税|資助|资助|園區|园区|創科|创科/i.test(
    text,
  );

/** 流式限制响应体、超时、仅允许配置中的官方域名；逐跳验证重定向。 */
async function fetchLimited(url, count = 0, delay = 2500, permit = null) {
  const target = new URL(url);
  if (!officialHosts.has(target.hostname) || target.protocol !== "https:")
    throw new Error("非白名单官方域名");
  if (permit && !permit(url))
    throw new Error("robots 或同源规则禁止重定向目标");
  const wait = Math.max(
    0,
    delay - (Date.now() - (lastRequest.get(target.origin) ?? 0)),
  );
  if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
  lastRequest.set(target.origin, Date.now());
  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/rss+xml, application/xml, text/html, text/plain",
    },
    redirect: "manual",
    signal: AbortSignal.timeout(15000),
  });
  if ([301, 302, 303, 307, 308].includes(response.status)) {
    if (count >= 3) throw new Error("重定向过多");
    return fetchLimited(
      new URL(response.headers.get("location"), url).href,
      count + 1,
      delay,
      permit,
    );
  }
  let size = 0;
  const chunks = [];
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > 3 * 1024 * 1024) throw new Error("官方响应超过轻量抓取上限");
    chunks.push(chunk);
  }
  return {
    status: response.status,
    text: Buffer.concat(chunks).toString("utf8"),
  };
}

async function allowed(source) {
  const robotsUrl = new URL("/robots.txt", source.url).href;
  const response = await fetchLimited(robotsUrl);
  if (response.status === 404 || response.status === 410)
    return {
      delay: 2500,
      permit: (url) => new URL(url).origin === new URL(source.url).origin,
    };
  if (response.status !== 200 || /<html/i.test(response.text))
    throw new Error("robots 无法可靠读取，本轮跳过");
  const robots = robotsParser(robotsUrl, response.text);
  if (robots.isAllowed(source.url, USER_AGENT) === false)
    throw new Error("robots 禁止抓取");
  const delay = Math.max(
    2500,
    Number(robots.getCrawlDelay(USER_AGENT) ?? 0) * 1000,
  );
  if (delay > 60000) throw new Error("robots 请求间隔过长，本轮保守跳过");
  return {
    delay,
    permit: (url) =>
      new URL(url).origin === new URL(source.url).origin &&
      robots.isAllowed(url, USER_AGENT) !== false,
  };
}

function safeLink(value, source) {
  try {
    const url = new URL(value, source.url);
    return url.protocol === "https:" &&
      url.hostname === new URL(source.url).hostname
      ? url.href.split("#")[0]
      : null;
  } catch {
    return null;
  }
}

export function parseFeed(text, source) {
  if (!/<rss|<feed[\s>]/i.test(text)) throw new Error("RSS 响应格式无效");
  if (/<!DOCTYPE|<!ENTITY/i.test(text))
    throw new Error("不接受包含实体声明的 XML");
  const doc = new XMLParser({
    ignoreAttributes: false,
    processEntities: false,
  }).parse(text);
  const items = doc.rss?.channel?.item ?? doc.feed?.entry ?? [];
  return (Array.isArray(items) ? items : [items]).map((item) => ({
    title: plain(item.title?.["#text"] ?? item.title),
    summary: plain(item.description ?? item.summary ?? "").slice(0, 360),
    publishedAt: date(item.pubDate ?? item.published ?? item.updated),
    url: safeLink(
      typeof item.link === "string" ? item.link : item.link?.["@_href"],
      source,
    ),
  }));
}

export function parseHtml(text, source) {
  const $ = load(text);
  const items = [];
  $("a[href]").each((_, element) => {
    const anchor = $(element),
      url = safeLink(anchor.attr("href"), source);
    if (
      !url ||
      !new URL(url).pathname.startsWith(source.pathPrefix) ||
      new URL(url).pathname === source.pathPrefix ||
      new URL(url).search
    )
      return;
    const title = plain(anchor.text());
    if (title.length < 15) return;
    const card = anchor.closest(
      "article, .card, .heroSlider__content--slide, li",
    );
    const rawDate =
      card.find("time").attr("datetime") ?? card.find("time").text();
    // 页面未给日期或摘要时留空，不用抓取时间冒充发布日期，也不额外请求全文。
    const summary = plain(card.find("p").first().text()).slice(0, 360);
    items.push({ title, url, summary, publishedAt: date(rawDate) });
  });
  return items;
}

async function save(value) {
  await mkdir(DIRECTORY, { recursive: true });
  const tmp = `${CACHE}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(value, null, 2));
  await rename(tmp, CACHE);
}

export async function syncNews() {
  if (syncing) return { skipped: true, reason: "已有抓取任务" };
  syncing = true;
  let handle;
  try {
    await mkdir(DIRECTORY, { recursive: true });
    try {
      handle = await open(LOCK, "wx");
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      const lock = await stat(LOCK);
      if (Date.now() - lock.mtimeMs > DAY) {
        await unlink(LOCK);
        handle = await open(LOCK, "wx");
      } else return { skipped: true, reason: "抓取锁已存在" };
    }
    const previous = await readNews();
    if (Date.parse(previous.nextAllowedAt) > Date.now())
      return {
        skipped: true,
        reason: "每日一次频率限制",
        nextAllowedAt: previous.nextAllowedAt,
      };
    const now = new Date().toISOString();
    const value = {
      ...previous,
      lastAttemptAt: now,
      nextAllowedAt: new Date(Date.now() + DAY).toISOString(),
      sources: [],
    };
    // 开始前持久化频率门槛，失败和重启也不会反复请求官方站点。
    await save(value);
    const merged = new Map(previous.items.map((x) => [x.url, x]));
    let success = false;
    for (const source of newsSources.filter((x) => x.enabled)) {
      try {
        const { delay, permit } = await allowed(source);
        const response = await fetchLimited(source.url, 0, delay, permit);
        if (response.status !== 200)
          throw new Error(`官方源 HTTP ${response.status}`);
        const parsed =
          source.type === "rss"
            ? parseFeed(response.text, source)
            : parseHtml(response.text, source);
        let matched = 0;
        for (const entry of parsed) {
          if (
            !entry.url ||
            !entry.title ||
            !relevant(`${entry.title} ${entry.summary}`)
          )
            continue;
          matched++;
          const old = merged.get(entry.url);
          merged.set(entry.url, {
            ...entry,
            id: createHash("sha256")
              .update(entry.url)
              .digest("hex")
              .slice(0, 16),
            publisher: source.name,
            category: classify(`${entry.title} ${entry.summary}`),
            firstSeenAt: old?.firstSeenAt ?? now,
          });
        }
        if (parsed.length === 0)
          throw new Error("列表未解析出条目，保留旧缓存，需人工检查来源结构");
        success = true;
        value.sources.push({
          id: source.id,
          name: source.name,
          status: "成功",
          matched,
          checkedAt: now,
        });
      } catch (error) {
        value.sources.push({
          id: source.id,
          name: source.name,
          status: "失败／跳过",
          error: error.message,
          checkedAt: now,
        });
      }
    }
    value.items = [...merged.values()]
      .sort((a, b) =>
        (b.publishedAt ?? b.firstSeenAt).localeCompare(
          a.publishedAt ?? a.firstSeenAt,
        ),
      )
      .slice(0, 300);
    value.revision = createHash("sha256")
      .update(
        value.items
          .map((x) => x.id)
          .sort()
          .join("|"),
      )
      .digest("hex")
      .slice(0, 16);
    if (success) value.lastSuccessAt = now;
    await save(value);
    return {
      ...value,
      newCount: value.items.filter(
        (x) => !previous.items.some((p) => p.id === x.id),
      ).length,
    };
  } finally {
    if (handle) {
      await handle.close();
      await unlink(LOCK).catch(() => {});
    }
    syncing = false;
  }
}

export function startNewsScheduler() {
  if (process.env.NEWS_ENABLED === "0") return;
  const tick = () =>
    syncNews()
      .then((r) => {
        if (!r.skipped)
          console.log(`[news] 抓取完成，新增 ${r.newCount}；模型配置未改变`);
      })
      .catch((e) => console.error("[news]", e.message));
  void tick();
  const timer = setInterval(tick, DAY);
  timer.unref();
}
