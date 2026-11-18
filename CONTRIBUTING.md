# Contributing

[简体中文](#中文说明)

Thanks for taking a look. This project is small on purpose: one dataset, one
layout engine, two themes, two languages.

## Setup

```bash
git clone https://github.com/catnuko/llm-timeline.git
cd llm-timeline
npm install
npm run dev
npm run build   # must pass before opening a PR
```

## What is welcome

- **Data corrections** — a wrong date, a missing sibling model, a company name
  spelled differently.
- **New releases** — appended in chronological order to `src/data/models.ts`.
- **Layout / accessibility / i18n bugs** — overlaps, unreadable cards at extreme
  zoom, missing translations, keyboard focus traps.
- **Docs** — typos, clearer setup steps, a better English or Chinese phrasing.

Please **open an issue first** for anything larger than a data row: new views,
new interactions, a rewrite of the layout engine. Scope creep is the main reason
small visual projects stop being maintained.

## Data rules

Every added or changed record must be verifiable:

1. Use the vendor's own announcement or model card as the source — not an
   aggregator blog, not a re-posted table.
2. `date` is the public launch date, `YYYY-MM-DD`. If only the month is known,
   do not guess a day: leave the record out until the exact date is public.
3. `name` keeps the model's released name (`Claude Sonnet 4.6`, `Qwen3.5-Max`).
4. `org` uses the vendor name already present in the file, so localisation keeps
   working.
5. `side` is `cn` for mainland-Chinese vendors, `global` for everyone else.
6. `tag` is one of `旗舰 / 开源 / 推理 / 多模态 / 轻量 / Agent`.
7. Put the source URL in the pull request description, one line per record.

## Commits

Conventional Commits, one logical change per commit:

```
feat(data): add Claude Opus 5.5
fix(layout): keep compact cards inside the footer
docs(readme): clarify deployment steps
```

Every commit needs a sign-off:

```bash
git commit -s -m "feat(data): add Claude Opus 5.5"
```

`-s` appends `Signed-off-by: Your Name <you@example.com>` and means you accept
[CLA.md](CLA.md). CI does not check it; reviewers will.

## Pull requests

- Branch off `master`; direct pushes to `master` are blocked.
- Keep the diff focused — no reformatting of untouched files.
- `npm run build` must pass, and the PR template checklist must be filled in.
- Screenshots help for anything visual: light and dark, zh and en if the change
  touches copy.

## Review

A maintainer reviews within a few days. Expect comments about data sources
before anything about code style.

## Code of Conduct

By participating you agree to [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

---

## 中文说明

欢迎贡献。这个项目刻意保持很小：一份数据集、一个布局引擎、两套主题、两种语言。

### 环境

```bash
git clone https://github.com/catnuko/llm-timeline.git
cd llm-timeline && npm install && npm run dev
```

提 PR 前 `npm run build` 必须通过。

### 欢迎的改动

- **数据订正**：日期错了、同代模型漏了、厂商名不一致。
- **新增记录**：按时间顺序追加到 `src/data/models.ts`。
- **布局 / 无障碍 / 多语言问题**：卡片重叠、极端缩放下不可读、文案漏译、焦点陷阱。
- **文档**：错别字、更清楚的步骤、更顺的中英文表述。

比「加一行数据」更大的改动（新视图、新交互、重写布局引擎）**请先开 issue** 讨论范围。

### 数据规则

1. 来源必须是厂商官方公告或 model card，不用聚合博客、二手表格。
2. `date` 是公开发布日，`YYYY-MM-DD`；只知道月份时不要猜具体日，等确切日期公开再收录。
3. `name` 用模型发布时的正式名（`Claude Sonnet 4.6`、`Qwen3.5-Max`）。
4. `org` 用文件里已有的厂商名，避免破坏本地化映射。
5. `side`：中国大陆厂商为 `cn`，其余为 `global`。
6. `tag` 取 `旗舰 / 开源 / 推理 / 多模态 / 轻量 / Agent` 之一。
7. 在 PR 描述里逐条附上来源链接。

### 提交

采用 Conventional Commits，一次提交只做一件事，并且必须签名：

```bash
git commit -s -m "feat(data): 收录 Claude Opus 5.5"
```

`-s` 会追加 `Signed-off-by` 行，表示你同意 [CLA.md](CLA.md)。

### PR

- 从 `master` 切分支；`master` 已开启分支保护，不接受直接推送。
- 保持 diff 聚焦，不要顺手格式化无关文件。
- 构建必须通过，PR 模板的清单要勾选。
- 涉及视觉改动请附截图（明暗两套、必要时中英两版）。

### 评审

维护者一般在几天内回复。先讨论数据来源，再讨论代码风格。
