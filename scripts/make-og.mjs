/*
 * make-og.mjs — SNS共有カード（img/og-home.jpg）を書き出す。
 *
 * LINE・X・Slack に貼ったときのカードは、サイトの第一印象そのものになる。
 * 写真だけだとサイト名も件数も伝わらないので、ブランドの体裁で作り直す。
 *
 * 使い方（掲載件数が変わったら実行し直す）:
 *   npm i -D playwright @fontsource/noto-sans-jp
 *   node scripts/make-og.mjs
 *
 * 本文と同じ Noto Sans JP で描くために @fontsource から実ファイルを読む。
 * Google Fonts をネットワーク越しに待たせると、描画前に間に合わないことがある。
 */
import {chromium} from 'playwright';
import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {dirname, resolve} from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

// 掲載中の件数はデータから数える（カードに焼き込む数字を手で直さないため）
function spotCount() {
  const src = readFileSync(resolve(ROOT, 'data-list.js'), 'utf8');
  const sandbox = {};
  new Function('window', src)(sandbox);
  const shown = new Set(['掲載推奨', '条件付き掲載']);
  return (sandbox.YSDATA || []).filter(r => shown.has(r.status)).length;
}

function fontUrl(weight) {
  const p = resolve(ROOT, `node_modules/@fontsource/noto-sans-jp/files/noto-sans-jp-japanese-${weight}-normal.woff2`);
  if (!existsSync(p)) {
    console.error(`書体が見つかりません: ${p}\n  npm i -D @fontsource/noto-sans-jp を先に実行してください。`);
    process.exit(1);
  }
  return pathToFileURL(p).href;
}

const html = readFileSync(resolve(HERE, 'og-card.html'), 'utf8')
  .replace('__COUNT__', String(spotCount()))
  .replace('__FONT400__', fontUrl(400))
  .replace('__FONT700__', fontUrl(700))
  .replace('__FONT900__', fontUrl(900));

const tmp = resolve(HERE, '.og-card.build.html');
writeFileSync(tmp, html);

// 既定では playwright が入れた Chromium を使う。用意済みのブラウザを指す場合は
// CHROMIUM_PATH で上書きできる（例: CI やサンドボックス環境）。
const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? {executablePath: process.env.CHROMIUM_PATH} : {}
);
const page = await browser.newPage({viewport: {width: 1200, height: 630}, deviceScaleFactor: 1});
await page.goto(pathToFileURL(tmp).href, {waitUntil: 'load'});
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(300);
const out = resolve(ROOT, 'img/og-home.jpg');
await page.screenshot({path: out, type: 'jpeg', quality: 88});
await browser.close();
console.log(`書き出しました: img/og-home.jpg（全国 ${spotCount()} 拠点）`);
