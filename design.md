# Design — いばしょ・きっかけ MAP

中高生が地域の活動や居場所を探すための、落ち着いた「活動台帳」のデザインシステムです。写真や装飾で期待を煽らず、地域・対象・掲載状態を同じ読み方で比較できることを優先します。

## Genre

editorial。表現は実用寄りで、自治体の案内冊子や学校の活動資料に近い信頼感を持たせます。

## Audience / job / tone

- Audience: 中学生・高校生。先生・保護者・活動運営者も補助的に利用する。
- Job: 地域や興味から、自分が参加できる活動・居場所を見つける。
- Tone: 編集的、実用的、率直。宣伝調の誇張や生成画像に頼らない。

## Macrostructure family

- Marketing pages: **Ecosystem Index**。トップページはカテゴリー、地域、ピックアップを異なる索引面として見せる。
- App pages: **Workbench**。検索・地図は見出しより操作面を主役にする。
- Detail and content pages: **Long Document**。拠点詳細、使い方、先生・保護者向け、問い合わせは読み進められる単一の文章軸を持つ。
- FAQ: **Conversational FAQ**。質問そのものが見出しになる。

## Theme

Almanac。青みのある紙色、墨色、地図に書き込む鉛筆のような青を使います。アクセントはリンク、選択、フォーカスに限定し、1画面の約3%以下に抑えます。

- `--color-paper`: `oklch(96.5% 0.009 225)`
- `--color-paper-2`: `oklch(93.5% 0.014 225)`
- `--color-paper-3`: `oklch(89.5% 0.018 225)`
- `--color-ink`: `oklch(20% 0.022 235)`
- `--color-ink-2`: `oklch(31% 0.020 235)`
- `--color-rule`: `oklch(79% 0.016 225)`
- `--color-accent`: `oklch(44% 0.110 235)`
- `--color-focus`: `oklch(52% 0.170 255)`

## Typography

- Display: Noto Serif JP, weight 600–700, normal style。大きな導入文と文書ページの見出しだけに使う。
- Body: Noto Sans JP, weight 400。UIは500–700。
- Display tracking: `-0.025em`
- Type scale anchor: `--text-display = clamp(2.5rem, 5vw + 0.5rem, 4.75rem)`
- 数値は `font-variant-numeric: tabular-nums` を使う。

## Spacing

4ポイント単位の名前付きスケールを `tokens.css` に定義します。セクション間は一定にせず、索引面は詰め、読み物は広く取ります。

## Navigation and footer

- Navigation: **N9 Edge-aligned minimal**。ワードマークと「さがす」だけを常設し、案内リンクはページ本文とフッターへ置く。
- Footer: **Ft2 Inline-rule single line**。案内リンクと情報確認の注意書きを罫線1本の下にまとめる。

## Motion

- ページ読み込みアニメーションは使わない。
- hoverは背景色または下線だけ。カードは浮かせない。
- モーダルは不透明度と短い移動だけ。
- reduced motionでは空間移動を切り、150ms以下の不透明度変化だけにする。

## Microinteractions stance

- 成功が画面上で分かる操作は通知しない。
- リンクコピーなど結果が見えない操作だけ、短い通知を出す。
- フォーカスリングは即時表示し、アニメーションしない。
- 入力欄は全状態で同じ1px境界線を保つ。

## CTA voice

- Primary: 角丸を抑えた墨色または青のボタン。動詞で始め、1行に収める。
- Secondary: 下線付きのタイポグラフィックリンク、または細い罫線のボタン。
- 診断は補助手段として扱い、グラデーションの大きな販促帯にはしない。

## Per-page allowances

- トップ、検索、文書ページは画像演出を使わない。
- 拠点が提供する実写真・ロゴが将来データに追加された場合のみ、詳細ページ内で補助的に表示できる。
- 地図は機能として使用し、装飾用の背景にはしない。

## What pages MUST share

- ワードマーク、紙色、墨色、青のアクセント。
- Noto Serif JP + Noto Sans JP。
- 同じフォーカスリング、ボタン高、入力欄高。
- 罫線で区切るカードと、丸みを抑えた部品。
- 掲載状態を色だけでなく文言でも示す。

## What pages MAY differ on

- トップの索引面、検索の操作面、読み物ページの行長。
- FAQの開閉表現。
- 地図と詳細モーダルの密度。

## Exports

### tokens.css

実装の正本はプロジェクト直下の `tokens.css` です。

### Tailwind v4 `@theme`

```css
@theme {
  --color-paper: oklch(96.5% 0.009 225);
  --color-paper-2: oklch(93.5% 0.014 225);
  --color-paper-3: oklch(89.5% 0.018 225);
  --color-ink: oklch(20% 0.022 235);
  --color-ink-2: oklch(31% 0.020 235);
  --color-rule: oklch(79% 0.016 225);
  --color-accent: oklch(44% 0.110 235);
  --color-focus: oklch(52% 0.170 255);
  --font-display: "Noto Serif JP", serif;
  --font-body: "Noto Sans JP", sans-serif;
  --spacing-sm: 1rem;
  --spacing-md: 1.5rem;
  --spacing-lg: 2rem;
  --text-md: 1.125rem;
  --text-lg: 1.375rem;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
}
```

### DTCG `tokens.json`

```json
{
  "$schema": "https://design-tokens.github.io/community-group/format/",
  "color": {
    "paper": { "$value": "oklch(96.5% 0.009 225)", "$type": "color" },
    "paper-2": { "$value": "oklch(93.5% 0.014 225)", "$type": "color" },
    "ink": { "$value": "oklch(20% 0.022 235)", "$type": "color" },
    "ink-2": { "$value": "oklch(31% 0.020 235)", "$type": "color" },
    "rule": { "$value": "oklch(79% 0.016 225)", "$type": "color" },
    "accent": { "$value": "oklch(44% 0.110 235)", "$type": "color" },
    "focus": { "$value": "oklch(52% 0.170 255)", "$type": "color" }
  },
  "font": {
    "display": { "$value": "Noto Serif JP, serif", "$type": "fontFamily" },
    "body": { "$value": "Noto Sans JP, sans-serif", "$type": "fontFamily" }
  },
  "space": {
    "sm": { "$value": "1rem", "$type": "dimension" },
    "md": { "$value": "1.5rem", "$type": "dimension" },
    "lg": { "$value": "2rem", "$type": "dimension" }
  },
  "duration": {
    "micro": { "$value": "120ms", "$type": "duration" },
    "short": { "$value": "220ms", "$type": "duration" },
    "long": { "$value": "420ms", "$type": "duration" }
  }
}
```

### shadcn/ui CSS variables

```css
:root {
  --background: 96.5% 0.009 225;
  --foreground: 20% 0.022 235;
  --card: 98.5% 0.006 225;
  --card-foreground: 20% 0.022 235;
  --popover: 98.5% 0.006 225;
  --popover-foreground: 20% 0.022 235;
  --primary: 44% 0.110 235;
  --primary-foreground: 98% 0.006 225;
  --secondary: 89.5% 0.018 225;
  --secondary-foreground: 31% 0.020 235;
  --muted: 79% 0.016 225;
  --muted-foreground: 47% 0.016 230;
  --border: 79% 0.016 225;
  --input: 79% 0.016 225;
  --ring: 52% 0.170 255;
  --radius: 0.25rem;
}
```
