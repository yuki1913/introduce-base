#!/usr/bin/env node

/**
 * 団体の公式サイトから、カードに使える代表画像と出典を収集する。
 *
 * 使い方:
 *   node scripts/research-official-images.mjs
 *   node scripts/research-official-images.mjs --limit 20 --concurrency 6
 *   node scripts/research-official-images.mjs --apply
 *
 * 収集結果は image-sources.json に保存する。--apply を付けると、結果を
 * data.json / data.js に反映する。著作権や転載可否は自動判定できないため、
 * 採用画像には必ず「公開前に利用条件確認」の状態を付ける。
 */

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.dirname(HERE);
const DATA_PATH = path.join(ROOT, "data.json");
const DATA_JS_PATH = path.join(ROOT, "data.js");
const LEDGER_PATH = path.join(ROOT, "image-sources.json");
const CHECKED_AT = new Date().toISOString().slice(0, 10);
const USER_AGENT = "Ibasho-Kikkake-MAP image-source-research/1.0 (+editorial research; contact: site administrator)";

function argValue(name, fallback) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const LIMIT = Math.max(0, Number(argValue("--limit", "0")) || 0);
const CONCURRENCY = Math.max(1, Math.min(20, Number(argValue("--concurrency", "10")) || 10));
const APPLY = process.argv.includes("--apply");
const SYNC = process.argv.includes("--sync");
const DEBUG_URL = argValue("--debug-url", "");

function decodeHtml(value = "") {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .trim();
}

function attrsOf(tag) {
  const attrs = {};
  const re = /([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
  let m;
  while ((m = re.exec(tag))) attrs[m[1].toLowerCase()] = decodeHtml(m[2] ?? m[3] ?? m[4] ?? "");
  return attrs;
}

function absoluteUrl(value, pageUrl) {
  if (!value || /^(?:data|blob|javascript):/i.test(value)) return "";
  try {
    const url = new URL(value, pageUrl);
    if (!/^https?:$/.test(url.protocol)) return "";
    url.hash = "";
    return url.href;
  } catch {
    return "";
  }
}

const REJECT_IMAGE = /(?:logo|emblem|symbol|favicon|(?:^|[-_/])icon(?:[-_/\.\d]|$)|sprite|spacer|placeholder|loading|no[-_]?image|blank|pixel|qrcode|qr[-_]?code|qr(?:[-_.\d]|$)|button|arrow|tel(?:ephone)?[-_]?\d*|ic[-_](?:hokkaido|home|top)|municipal[-_]?emblem|topimage[-_]?tx|instagram|facebook|youtube|social|glyph|og[-_]?image|(?:^|[-_/])(title|headline|dayori|letter|news|flyer|poster|pamphlet|banner|ogp|ogimage|sns|share|qr)(?:[-_/\.\d]|$)|チラシ|ﾁﾗ|たより|だより|リーフレット|パンフ|バナー)/i;
const PHOTO_HINT = /(hero|main[-_]?visual|key[-_]?visual|\bmv\b|\bkv\b|cover|slide|gallery|photo|facility|activity|about|活動|施設|館内|風景|外観|体験)/i;

function addCandidate(list, rawUrl, pageUrl, type, score, hint = "") {
  const url = absoluteUrl(rawUrl, pageUrl);
  let readable = url;
  try { readable = decodeURIComponent(url); } catch {}
  if (!url || /\.(?:svg|gif)(?:[?#]|$)/i.test(url) || REJECT_IMAGE.test(`${readable} ${hint}`)) return;
  const existing = list.find((item) => item.url === url);
  if (existing) {
    if (score > existing.score) Object.assign(existing, { type, score, hint });
    return;
  }
  list.push({ url, type, score, hint });
}

function collectCandidates(html, pageUrl) {
  const candidates = [];

  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    const a = attrsOf(tag);
    const key = (a.property || a.name || a.itemprop || "").toLowerCase();
    if (!a.content) continue;
    if (/^og:image(?::(?:url|secure_url))?$/.test(key)) addCandidate(candidates, a.content, pageUrl, "official-og", 86, key);
    else if (/^twitter:image(?::src)?$/.test(key)) addCandidate(candidates, a.content, pageUrl, "official-twitter", 82, key);
    else if (key === "image") addCandidate(candidates, a.content, pageUrl, "official-meta", 82, key);
  }

  for (const tag of html.match(/<link\b[^>]*>/gi) || []) {
    const a = attrsOf(tag);
    const rel = (a.rel || "").toLowerCase();
    if (rel.includes("image_src")) addCandidate(candidates, a.href, pageUrl, "official-image-src", 88, rel);
    if (rel.includes("preload") && (a.as || "").toLowerCase() === "image") addCandidate(candidates, a.href || a.imagesrcset?.split(/[ ,]/)[0], pageUrl, "official-preload", 78, rel);
  }

  for (const tag of (html.match(/<img\b[^>]*>/gi) || []).slice(0, 80)) {
    const a = attrsOf(tag);
    const src = a.src || a["data-src"] || a["data-lazy-src"] || a["data-original"] || (a.srcset || a["data-srcset"] || "").split(/[ ,]/)[0];
    if (!src) continue;
    const hint = [a.class, a.id, a.alt, a.title].filter(Boolean).join(" ");
    const width = Number.parseInt(a.width || "", 10) || 0;
    const height = Number.parseInt(a.height || "", 10) || 0;
    let score = 42;
    if (PHOTO_HINT.test(hint)) score += 36;
    if (width >= 640) score += 14;
    else if (width >= 360) score += 8;
    if (height >= 240) score += 8;
    if (/header|nav|footer|sns|social|advert|banner/i.test(hint)) score -= 22;
    addCandidate(candidates, src, pageUrl, "official-page-image", score, hint);
  }

  return candidates.sort((a, b) => b.score - a.score);
}

async function fetchHtml(inputUrl) {
  const response = await fetch(inputUrl, {
    redirect: "follow",
    signal: AbortSignal.timeout(12000),
    headers: {
      "user-agent": USER_AGENT,
      accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5",
      "accept-language": "ja,en;q=0.6",
    },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const contentType = response.headers.get("content-type") || "";
  if (!/html|xhtml/i.test(contentType)) throw new Error(`not HTML: ${contentType || "unknown"}`);
  const body = await response.text();
  return { html: body.slice(0, 2_500_000), finalUrl: response.url || inputUrl };
}

async function readPrefix(response, maxBytes = 131072) {
  if (!response.body?.getReader) return new Uint8Array(await response.arrayBuffer()).slice(0, maxBytes);
  const reader = response.body.getReader();
  const chunks = [];
  let length = 0;
  try {
    while (length < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      length += value.length;
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  const bytes = new Uint8Array(Math.min(length, maxBytes));
  let offset = 0;
  for (const chunk of chunks) {
    const part = chunk.subarray(0, bytes.length - offset);
    bytes.set(part, offset);
    offset += part.length;
    if (offset >= bytes.length) break;
  }
  return bytes;
}

function imageDimensions(bytes) {
  if (bytes.length >= 24 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }
  if (bytes.length >= 10 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let i = 2;
    while (i + 9 < bytes.length) {
      if (bytes[i] !== 0xff) { i += 1; continue; }
      const marker = bytes[i + 1];
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        return { width: (bytes[i + 7] << 8) + bytes[i + 8], height: (bytes[i + 5] << 8) + bytes[i + 6] };
      }
      if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) { i += 2; continue; }
      const size = (bytes[i + 2] << 8) + bytes[i + 3];
      if (!size) break;
      i += size + 2;
    }
  }
  if (bytes.length >= 30 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") {
    const kind = String.fromCharCode(...bytes.slice(12, 16));
    if (kind === "VP8X") {
      return {
        width: 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16),
        height: 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16),
      };
    }
  }
  return null;
}

async function inspectCandidate(candidate) {
  try {
    const response = await fetch(candidate.url, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
      headers: { "user-agent": USER_AGENT, accept: "image/avif,image/webp,image/*,*/*;q=0.5", range: "bytes=0-131071" },
    });
    const contentType = response.headers.get("content-type") || "";
    if (!response.ok || (!/^image\//i.test(contentType) && !/\.(?:avif|webp|jpe?g|png)(?:[?#]|$)/i.test(response.url))) return null;
    const bytes = await readPrefix(response);
    const dimensions = imageDimensions(bytes);
    if (dimensions) {
      const ratio = dimensions.width / dimensions.height;
      if (dimensions.width < 480 || dimensions.height < 240 || ratio > 3.4 || ratio < 0.55) return null;
    } else {
      const size = Number(response.headers.get("content-length") || 0);
      if (size && size < 20_000) return null;
      if (!size && bytes.length < 20_000) return null;
    }
    return { ...candidate, ...dimensions, finalImageUrl: response.url || candidate.url };
  } catch {
    return null;
  }
}

async function inspectPage(pageUrl) {
  const { html, finalUrl } = await fetchHtml(pageUrl);
  const candidates = collectCandidates(html, finalUrl);
  const checked = (await Promise.all(candidates.slice(0, 18).map(inspectCandidate))).filter(Boolean);
  checked.sort((a, b) => (b.score + Math.log2((b.width || 640) * (b.height || 360))) - (a.score + Math.log2((a.width || 640) * (a.height || 360))));
  if (checked[0]) return { ...checked[0], url: checked[0].finalImageUrl, pageUrl: finalUrl, candidates: checked };
  return { pageUrl: finalUrl, error: candidates.length ? "画像候補の応答を確認できませんでした" : "代表画像が見つかりませんでした" };
}

const GENERIC_NAME_PARTS = /(?:NPO法人|一般社団法人|公益社団法人|公益財団法人|社会福祉法人|株式会社|合同会社|特定非営利活動法人|青少年|若者|活動|支援|総合|交流|体験|地域|学習|センター|プログラム|プロジェクト|施設|事業|Youth\+|オンライン)/gi;

function nameTokens(name = "") {
  const simplified = name.replace(GENERIC_NAME_PARTS, " ");
  const chunks = simplified.split(/[\s・／/（）()【】「」｜|―—–-]+/).map((s) => s.trim()).filter((s) => s.length >= 2);
  return [...new Set(chunks.flatMap((chunk) => {
    const tokens = [chunk];
    if (/^[ァ-ヶー]{4,}$/.test(chunk)) {
      for (let size = 3; size <= Math.min(8, chunk.length); size += 1) {
        for (let i = 0; i + size <= chunk.length; i += 1) tokens.push(chunk.slice(i, i + size));
      }
    }
    return tokens;
  }))];
}

function pickForRecord(result, record, requireNameMatch = false) {
  if (!result?.url) return null;
  const tokens = nameTokens(record.name);
  const options = result.candidates?.length ? result.candidates : [result];
  const scored = options.map((candidate) => {
    let readableUrl = candidate.url || "";
    try { readableUrl = decodeURIComponent(readableUrl); } catch {}
    const haystack = `${readableUrl} ${candidate.hint || ""}`.toLowerCase();
    const match = tokens.reduce((sum, token) => sum + (haystack.includes(token.toLowerCase()) ? Math.min(60, 18 + token.length * 5) : 0), 0);
    return { candidate, match, score: candidate.score + match };
  }).sort((a, b) => b.score - a.score);
  if (requireNameMatch && !scored[0]?.match) return null;
  const best = scored[0]?.candidate;
  return best ? { ...best, url: best.finalImageUrl || best.url, pageUrl: result.pageUrl } : null;
}

async function applySourceRecords(records, sourceRecords) {
  const byId = new Map(sourceRecords.map((r) => [r.id, r]));
  const merged = records.map((record) => {
    const source = byId.get(record.id);
    let clean = record;
    if (record.imageSource) {
      const { image, imageSource, imageSourceUrl, imageKind, imageReview, imageCheckedAt, ...rest } = record;
      clean = rest;
    }
    if (!source?.image) return clean;
    if (clean.image && !record.imageSource) return clean;
    return {
      ...clean,
      image: source.image,
      imageSource: source.imageSource,
      imageSourceUrl: source.imageSourceUrl,
      imageKind: source.imageKind,
      imageReview: source.imageReview,
      imageCheckedAt: source.checkedAt,
    };
  });
  await fs.writeFile(DATA_PATH, `${JSON.stringify(merged, null, 1)}\n`, "utf8");
  await fs.writeFile(DATA_JS_PATH, `window.YSDATA = ${JSON.stringify(merged)};\n`, "utf8");
}

async function mapConcurrent(items, concurrency, worker) {
  const result = new Array(items.length);
  let cursor = 0;
  async function run() {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      result[i] = await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run));
  return result;
}

async function main() {
  if (DEBUG_URL) {
    const result = await inspectPage(DEBUG_URL);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  const records = JSON.parse(await fs.readFile(DATA_PATH, "utf8"));
  if (SYNC) {
    const ledger = JSON.parse(await fs.readFile(LEDGER_PATH, "utf8"));
    const sourceRecords = (ledger.records || []).map((record) => {
      let readable = record.image || "";
      try { readable = decodeURIComponent(readable); } catch {}
      if (!record.image || (!REJECT_IMAGE.test(readable) && !/\.(?:svg|gif)(?:[?#]|$)/i.test(readable))) return record;
      const { image, imageSource, imageSourceUrl, imageKind, imageReview, ...clean } = record;
      return { ...clean, status: "fallback-generated-category", note: "装飾画像・ロゴ等を最終監査で除外" };
    });
    const found = sourceRecords.filter((record) => record.image).length;
    ledger.records = sourceRecords;
    ledger.stats = { total: sourceRecords.length, officialImageFound: found, generatedCategoryFallback: sourceRecords.length - found };
    await fs.writeFile(LEDGER_PATH, `${JSON.stringify(ledger, null, 2)}\n`, "utf8");
    await applySourceRecords(records, sourceRecords);
    process.stdout.write(`出典台帳 ${sourceRecords.length}件を data.json / data.js に反映しました（公式画像 ${found}件）\n`);
    return;
  }
  const selected = LIMIT ? records.slice(0, LIMIT) : records;
  const pageResults = new Map();
  const pageUse = new Map();
  selected.flatMap((r) => [...new Set([r.url, r.infoUrl].filter(Boolean))]).forEach((url) => pageUse.set(url, (pageUse.get(url) || 0) + 1));
  async function inspectUrls(urls, label) {
    if (!urls.length) return;
    process.stdout.write(`${label} ${urls.length}件を確認します（団体 ${selected.length}件 / 同時 ${CONCURRENCY}件）\n`);
    let done = 0;
    await mapConcurrent(urls, CONCURRENCY, async (pageUrl) => {
      try {
        pageResults.set(pageUrl, await inspectPage(pageUrl));
      } catch (error) {
        pageResults.set(pageUrl, { pageUrl, error: error?.message || String(error) });
      }
      done += 1;
      if (done % 25 === 0 || done === urls.length) process.stdout.write(`  ${done}/${urls.length}\n`);
    });
  }

  const primaryPages = [...new Set(selected.map((r) => r.url).filter(Boolean))];
  await inspectUrls(primaryPages, "公式ページ");
  const secondaryPages = [...new Set(selected
    .filter((r) => !pageResults.get(r.url)?.url && r.infoUrl && r.infoUrl !== r.url)
    .map((r) => r.infoUrl))];
  await inspectUrls(secondaryPages, "補足情報ページ");

  const sourceRecords = selected.map((record) => {
    const official = pageResults.get(record.url);
    const info = record.infoUrl && record.infoUrl !== record.url ? pageResults.get(record.infoUrl) : null;
    const found = pickForRecord(official, record, (pageUse.get(record.url) || 0) > 1)
      || pickForRecord(info, record, (pageUse.get(record.infoUrl) || 0) > 1);
    if (!found) {
      return {
        id: record.id,
        name: record.name,
        status: "fallback-generated-category",
        checkedAt: CHECKED_AT,
        checkedPages: [record.url, record.infoUrl].filter(Boolean),
        note: official?.error || info?.error || "代表画像が見つかりませんでした",
      };
    }
    return {
      id: record.id,
      name: record.name,
      image: found.url,
      imageSource: "団体公式サイト",
      imageSourceUrl: found.pageUrl,
      imageKind: found.type,
      imageReview: "公開前に利用条件確認",
      status: "official-site-image-found",
      checkedAt: CHECKED_AT,
      checkedPages: [record.url, record.infoUrl].filter(Boolean),
    };
  });

  const found = sourceRecords.filter((r) => r.image).length;
  const ledger = {
    generatedAt: new Date().toISOString(),
    policy: "公式サイトの代表画像のみを候補化。転載可否は自動判定せず、公開前確認が必要。候補がない団体は分野別の生成イメージ写真を使用する。",
    stats: { total: sourceRecords.length, officialImageFound: found, generatedCategoryFallback: sourceRecords.length - found },
    records: sourceRecords,
  };
  await fs.writeFile(LEDGER_PATH, `${JSON.stringify(ledger, null, 2)}\n`, "utf8");

  if (APPLY && !LIMIT) {
    await applySourceRecords(records, sourceRecords);
  }

  process.stdout.write(`完了: 公式画像 ${found}件 / 分野別イメージへフォールバック ${sourceRecords.length - found}件\n`);
  process.stdout.write(`出典台帳: ${path.relative(ROOT, LEDGER_PATH)}${APPLY && !LIMIT ? "（data.json / data.js に反映済み）" : ""}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
