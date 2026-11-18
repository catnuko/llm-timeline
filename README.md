# LLM Timeline · 大模型时间线

一条横向的中美大模型发布对抗时间线：上半区为中国模型（淡红），下半区为海外模型（淡蓝），轴线垂直居中，滚轮左右滚动。收录 2023.01 — 2026.11 共 147 条发布记录（中国 50 / 海外 97）。

A horizontal timeline of LLM releases, China on the warm side, the rest of the world on the cool side. 147 entries from Jan 2023 to Nov 2026.

## 技术栈 / Stack

- React 19 + TypeScript + Vite
- Tailwind CSS v4
- shadcn/ui（`base-nova` 预设，底层原语为 Base UI / built on Base UI）
- lucide-react 图标

## 功能 / Features

- **双语**：右上角 `中 / EN` 切换界面语言，模型名与厂商名随之本地化，选择记入 localStorage
- **明暗主题**：右上角月亮 / 太阳按钮切换黑白主题，首屏按系统偏好自动选择，无闪白
- **横向时间线**：滚轮即横向滚动，支持拖拽平移、← → 翻页、92–260 px/月缩放
- **刻度与日期**：按月份分格，发布日打点并在轴上标注日期，同日多模型合并计数
- **分层布局**：同日多款模型自动贪心分层，密度过高时切换为单行紧凑卡片，保证零重叠
- **悬停详情**：左下角 inspector 显示日期、厂商、标签与备注
- **缩略导航**：底部概览条点击定位，年份按钮与「最新」快速跳转

## 运行 / Run

```bash
npm install
npm run dev      # 本地开发
npm run build    # 产物 dist/index.html（单文件，JS/CSS 已内联）
npm run preview  # 预览构建产物
```

## 部署 / Deploy

Vercel 直接导入本仓库即可：Framework 选 Vite，Build Command `npm run build`，Output Directory `dist`。

## 代码结构

```
src/
├── data/models.ts        # 发布数据（date / name / org / side / tag / note）
├── lib/timeline.ts       # 月份换算、像素坐标、贪心分层布局
├── lib/i18n.ts           # 中英字典、厂商与模型名本地化
├── components/ui/        # shadcn/ui 组件（Base UI 版）
└── App.tsx               # 画布、刻度带、卡片、顶栏与底栏
```

## 数据说明 / Data notes

日期取公开发布或上线日期，为人工整理的**代表性样本**，并非全量清单；Claude 全系（2 → 5.5）、Gemini 全系（1.0 → 4 Hydrogen）、Llama 3 / 4 各版本按官方时间线收录。Meta 自 2025-04 Llama 4 之后主线无新模型，故 2026 年留白。新增记录只需在 `src/data/models.ts` 追加一条，布局自动重排。

Dates are public launch dates of a **curated sample**, not an exhaustive list. Add a record to `src/data/models.ts` and the layout reflows automatically.
