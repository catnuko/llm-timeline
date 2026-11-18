# LLM Timeline · 大模型时间线

A horizontal timeline of large-language-model releases, 2023.01 → 2026.11. China sits above the axis on a warm wash, the rest of the world below on a cool one: 147 curated releases, drawn against a monthly scale, scrolled sideways.

**[Open the live timeline →](https://llm-timeline-amber.vercel.app/)** · [简体中文 README](README.zh-CN.md)

![LLM Timeline](public/og.jpg)

## Features

- **Horizontal timeline** — the mouse wheel pans sideways; drag, `←` / `→`, and 92–260 px/month zoom are also supported.
- **Two camps, one axis** — Chinese models above the centred axis on a pale red band, overseas models below on a pale blue band.
- **Month ticks and release dates** — every release day gets a tick and a date label; multiple releases on the same day are stacked and counted (`09.22 · 3`).
- **Greedy lane packing** — cards that would collide fall into deeper lanes; when density gets extreme the cards switch to a single-line compact mode. Verified at 0 overlaps across three viewports and both themes.
- **Chinese / English** — one click in the header switches every label, organisation name, and Chinese model name (文心一言 → ERNIE Bot, 混元 Hy4 → Hunyuan Hy4). The choice is persisted.
- **Light / dark** — moon / sun toggle; first paint follows the OS preference with no flash.
- **Hover inspector** — date, vendor, category tag, and a one-line note in the lower-left corner.
- **Overview strip** — click to jump, plus year buttons and a "Latest" shortcut.

## Stack

React 19 · TypeScript · Vite · Tailwind CSS v4 · shadcn/ui (Base UI primitives) · lucide-react

## Run

```bash
npm install
npm run dev      # local dev server
npm run build    # dist/index.html, JS & CSS inlined
npm run preview  # preview the build
```

## Deploy

The repository is linked to Vercel. Importing it elsewhere: framework **Vite**, build command `npm run build`, output directory `dist`.

## Data

`src/data/models.ts` holds 147 entries — 50 Chinese, 97 overseas — each shaped as:

```ts
{ date: '2026-09-22', name: 'Claude Opus 5.5', org: 'Anthropic', side: 'global', tag: '旗舰', note?: string }
```

Dates are public launch dates of a **curated sample**, not an exhaustive list. The Claude line (2 → 5.5), the Gemini line (1.0 → 4 Hydrogen) and every Llama 3 / 4 variant follow the vendors' own timelines. Meta has shipped no new flagship since Llama 4 in April 2025, so its 2026 lane is genuinely empty.

Editing data is the whole contribution: append a record and the layout reflows by itself.

## Structure

```
src/
├── data/models.ts        # release records
├── lib/timeline.ts       # month math, pixel mapping, greedy lane packing
├── lib/i18n.ts           # zh/en dictionary, org & model name localisation
├── components/ui/        # shadcn/ui components (Base UI)
└── App.tsx               # canvas, scale band, cards, header, footer
```

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) and [CLA.md](CLA.md). Commits must carry a `Signed-off-by` line (`git commit -s`).

## License

[MIT](LICENSE) © 2026 catnuko
