import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseFeed, parseHtml, classify } from "../server/news.js";
import { answerQuestion } from "../server/knowledge.js";

const source = { url: "https://www.info.gov.hk/gia/rss/general_en.xml" };
test("RSS 只取元信息，移除 HTML、拒绝非官方链接与外部实体", () => {
  const items = parseFeed(
    "<rss><channel><item><title>Investment policy</title><link>https://www.info.gov.hk/gia/item.htm</link><pubDate>Thu, 12 Nov 2026 10:00:00 +0800</pubDate><description><![CDATA[<b>Tax news</b><script>ignore</script>]]></description></item><item><title>bad</title><link>https://evil.example/</link></item></channel></rss>",
    source,
  );
  assert.equal(items[0].title, "Investment policy");
  assert.equal(items[0].publishedAt, "2026-11-12T02:00:00.000Z");
  assert.equal(items[1].url, null);
  assert.throws(() =>
    parseFeed(
      '<!DOCTYPE rss [<!ENTITY x SYSTEM "file:///etc/passwd">]><rss/>',
      source,
    ),
  );
});
test("轻量网页列表的发布日期缺失时留空，不用抓取时间冒充", () => {
  const items = parseHtml(
    '<article><h2><a href="/en/news/example/">Investment in technology announced</a></h2><p>A short summary</p></article>',
    { url: "https://www.investhk.gov.hk/en/news/", pathPrefix: "/en/news/" },
  );
  assert.equal(items[0].publishedAt, null);
  assert.equal(items[0].summary, "A short summary");
  assert.equal(classify("Talent visa update"), "引才");
});
test("模型与新闻解耦：模型不导入新闻服务或缓存，抓取器不写模型文件", async () => {
  for (const name of [
    "config.js",
    "assessment.js",
    "model-worker.js",
    "models/profit.js",
    "models/risk.js",
  ]) {
    const code = await readFile(
      new URL(`../server/${name}`, import.meta.url),
      "utf8",
    );
    assert.doesNotMatch(code, /from ['"].*news|readFile.*news-cache/);
  }
  const news = await readFile(
    new URL("../server/news.js", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(
    news,
    /writeFile\([^\n]*(?:rules|policies|industries|parks)\.json/,
  );
});
test("本地问答引用已有依据，未知问题不编造", () => {
  const answer = answerQuestion("高才通是否适合我公司的员工");
  assert.ok(answer.sources.some((s) => s.url.includes("TTPS")));
  assert.match(answer.answer, /不能确认/);
  assert.equal(answerQuestion("火星殖民政策是什么").sources.length, 0);
  assert.ok(answerQuestion("a".repeat(501)).error);
});
