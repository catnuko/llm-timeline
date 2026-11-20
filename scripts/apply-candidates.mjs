#!/usr/bin/env node
/**
 * 候选落地器 —— 把 data/candidates.json 里「够可靠」的候选自动写进 src/data/models.ts。
 *
 *   node scripts/apply-candidates.mjs            # 写入
 *   node scripts/apply-candidates.mjs --dry-run  # 只报告，不改文件
 *
 * 自动收录必须同时满足：
 *   1. 日期落在最近 APPLY_DAYS 天（默认 14），避免回填历史重新上架的旧模型
 *   2. 厂商已在时间线里出现过
 *   3. 名字不是已有模型的同族再版（「Pixtral Large 2502」之于「Pixtral Large」）
 *   4. 参数量不小于 4B（更小的走人工）
 *   5. OpenRouter 条目的同族模型若在时间线里是开放权重，则走人工（开闭源口径存疑）
 * 其他候选取而不写，落到 data/review.json 并在 workflow 里开 issue。
 */

import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const MODELS = path.join(ROOT, 'src/data/models.ts')
const CAND = path.join(ROOT, 'data/candidates.json')
const REVIEW = path.join(ROOT, 'data/review.json')
const DRY = process.argv.includes('--dry-run')
const APPLY_DAYS = Number(process.env.APPLY_DAYS ?? 14)

const read = (p) => readFile(p, 'utf8')

/** 采集器里的厂商名 → 时间线里的 org 名 */
const ORG_ALIAS = {
  Mistral: 'Mistral AI',
  'Mistral AI': 'Mistral AI',
  internlm: '上海 AI 实验室',
  InternLM: '上海 AI 实验室',
}

/** OpenRouter 的 name 字段常带「Vendor: 」前缀，去掉 */
const VENDOR_PREFIX =
  /^(OpenAI|Google|Anthropic|Meta|Mistral|Qwen|Alibaba|DeepSeek|Z-AI|MoonshotAI|MiniMax|Tencent|Baidu|StepFun|ByteDance|xAI|NVIDIA|Cohere|Microsoft|Perplexity|ZhipuAI|InternLM)\s*:\s*/i

/** 去掉中文前缀、版本尾号、标点，用于判断「同一个模型的另一版」 */
function familyKey(name) {
  return name
    .toLowerCase()
    .replace(/[\u4e00-\u9fa5]/g, '') // 混元 Hy4-Flash → hy4-flash
    .replace(/\b(2502|2505|2508|2511|2601|2602|2603|2604|2605|2606|2607|2608|2609|2610|2611|2612)\b/g, '')
    .replace(/[-_. ]+/g, '')
    .replace(/^[^a-z0-9]+/, '')
}

/** 参数规模，取名字里最大的一个 NNNb / NNNB */
function params(name) {
  const hits = [...name.matchAll(/(\d+(?:\.\d+)?)\s*[bB](?!\w)/g)].map((m) => Number(m[1]))
  return hits.length ? Math.max(...hits) : null
}

function bareName(name) {
  return name.replace(VENDOR_PREFIX, '').trim()
}

/** 派生/量化/权重格式，不是一次独立发布 */
const DERIVATIVE_NAME =
  /(-|_|\s)(fp8|fp4|fp16|bf16|int4|int8|nvfp4|awq|gptq|gguf|onnx|webgpu|mlx|bnb|base|b16|a16|quanto|pruned|draft|mtp)(-|$)/i

function inferTag(name) {
  if (/\breason|\bthinking\b|\br1\b|\bo1\b|\bmath\b|\bcoder\b|\bcode\b/i.test(name)) return '推理'
  if (/\bvl\b|vision|omni|image|video|audio|multimodal|\bocr|\bvl-|ocr/i.test(name)) return '多模态'
  if (/\bagent\b|\btool/i.test(name)) return 'Agent'
  if (/\bflash\b|\blite\b|\bmini\b|\bsmall\b|\bnano\b|\btiny\b/i.test(name)) return '轻量'
  const p = params(name)
  if (p !== null && p < 10) return '轻量'
  return '旗舰'
}

function parseModels(text) {
  const lines = text.split('\n')
  const entries = []
  lines.forEach((line, i) => {
    const m = line.match(/date: '([^']+)',\s*name: '([^']+)',\s*org: '([^']+)',\s*openness: '(open|closed)'/)
    if (m) entries.push({ index: i, date: m[1], name: m[2], org: m[3], openness: m[4] })
  })
  return { lines, entries }
}

const { lines, entries } = parseModels(await read(MODELS))
const orgs = new Set(entries.map((e) => e.org))
const nameKeys = new Set(entries.map((e) => e.name.toLowerCase()))
const families = new Map()
for (const e of entries) {
  const k = familyKey(e.name)
  if (!families.has(k)) families.set(k, [])
  families.get(k).push(e)
}

const today = new Date()
const floor = new Date(today.getTime() - APPLY_DAYS * 864e5).toISOString().slice(0, 10)

let candidates = []
try {
  candidates = JSON.parse(await read(CAND))
} catch {
  console.error('! 读不到 data/candidates.json，先跑 npm run collect')
  process.exit(1)
}

const accepted = []
const review = []

const seenRun = new Set()

for (const raw of candidates) {
  if (raw.date < floor) continue
  const c = { ...raw, name: bareName(raw.name), org: ORG_ALIAS[raw.org] ?? raw.org }

  // 同一轮里同一天同族的重复（`Qwen: Qwen4 Max` 与 `Qwen4 Max`）
  const runKey = `${c.date}|${familyKey(c.name)}`
  if (seenRun.has(runKey)) continue
  seenRun.add(runKey)

  // `X Pro` 是同代高配档，基础版已在库里或本轮已收时不单独占一条
  const proBase = c.name.replace(/\s+Pro$/i, '')
  if (proBase !== c.name) {
    const fam = families.get(familyKey(proBase))
    const baseAccepted = accepted.some((a) => familyKey(a.name) === familyKey(proBase))
    if (fam?.length || baseAccepted) {
      review.push({ ...c, reason: `${proBase} 已收录或本轮已收，Pro 档折叠` })
      continue
    }
  }

  if (DERIVATIVE_NAME.test(c.name)) {
    review.push({ ...c, reason: '派生格式' })
    continue
  }
  if (c.source === 'huggingface' && /onnx|gguf|fp8|fp4|int4|awq|gptq|mlx|webgpu/i.test(c.name)) {
    review.push({ ...c, reason: '派生格式' })
    continue
  }
  if (!orgs.has(c.org)) {
    review.push({ ...c, reason: '厂商不在时间线内' })
    continue
  }
  if (entries.some((e) => e.name === c.name)) {
    continue // 完全重复
  }
  const p = params(c.name)
  if (p !== null && p < 4) {
    review.push({ ...c, reason: '小于 4B' })
    continue
  }
  // 名字里带 YYMM 版本号（Pixtral Large 2502）时，若该版本号早于收录日期，多半是旧模型重新上架
  const yymm = c.name.match(/(?:^|[-\s])(2[0-9])(0[1-9]|1[0-2])(?:$|[-\s])/)
  if (yymm) {
    const stamp = `20${yymm[1]}-${yymm[2]}-01`
    const day = new Date(c.date)
    if (day - new Date(stamp) > 30 * 864e5) {
      review.push({ ...c, reason: `版本号 ${yymm[0].trim()} 早于收录日期，疑似重新上架` })
      continue
    }
  }

  const fam = families.get(familyKey(c.name))
  if (fam?.length) {
    const older = fam.filter((e) => e.date <= c.date)
    if (older.length) {
      review.push({ ...c, reason: `同族已有更早记录（${older[0].name} ${older[0].date}）` })
      continue
    }
  }
  const openness = c.source === 'huggingface' ? 'open' : 'closed'
  if (openness === 'closed') {
    const openFam = fam?.filter((e) => e.openness === 'open') ?? []
    if (openFam.length) {
      review.push({ ...c, reason: 'OpenRouter 上架的开放权重模型，口径需人工确认' })
      continue
    }
  }
  accepted.push({
    date: c.date,
    name: c.name,
    org: c.org,
    openness,
    tag: inferTag(c.name),
    source: c.source,
  })
}

/** 在正确的年份段里按日期插入一行 */
function insertEntry(rows, entry) {
  const block = entry.openness === 'open' ? '开放权重' : '闭源'
  const blockIdx = rows.findIndex((l) => l.includes(`// ============ ${block} ============`))
  if (blockIdx < 0) throw new Error(`找不到 ${block} 分块`)

  const nextBlockIdx = rows.findIndex(
    (l, i) => i > blockIdx && l.includes('// ============')
  )
  const end = nextBlockIdx < 0 ? rows.length : nextBlockIdx
  const year = entry.date.slice(0, 4)

  let yearIdx = rows.findIndex(
    (l, i) => i > blockIdx && i < end && l.includes(`// --- ${year} ---`)
  )

  if (yearIdx < 0) {
    // 新年份：按年份顺序插到第一个更大的年份段之前
    const later = rows.findIndex(
      (l, i) => i > blockIdx && i < end && /\/\/ --- (\d{4}) ---/.test(l) && Number(l.match(/(\d{4})/)[1]) > Number(year)
    )
    if (later < 0) {
      throw new Error(`${year} 年段落缺失且无法定位插入点`)
    }
    const header = [
      `  // --- ${year} ---`,
      line(entry),
      '',
    ]
    rows.splice(later, 0, ...header)
    return
  }

  // 已有年份：插到该段内最后一条日期 <= 新日期的记录之后
  let insertAt = yearIdx + 1
  for (let i = yearIdx + 1; i < end; i++) {
    const m = rows[i].match(/date: '([^']+)'/)
    if (m && m[1] <= entry.date) insertAt = i + 1
  }
  rows.splice(insertAt, 0, line(entry))
}

const line = (e) =>
  `  { date: '${e.date}', name: '${e.name}', org: '${e.org}', openness: '${e.openness}', tag: '${e.tag}' },`

const rows = [...lines]
accepted.sort((a, b) => (a.date < b.date ? -1 : 1))
for (const e of accepted) insertEntry(rows, e)

const mergedNames = new Set(accepted.map((e) => `${e.date}|${e.name}`))
const rest = candidates.filter((c) => !mergedNames.has(`${c.date}|${c.name}`))

console.log(`候选 ${candidates.length} 条，自动收录 ${accepted.length} 条，待人工 ${review.length} 条`)
for (const e of accepted) console.log(`  + ${e.date}  ${e.name}  · ${e.org}  [${e.openness}/${e.tag}/${e.source}]`)
if (review.length) {
  console.log('待人工：')
  for (const r of review) console.log(`  ? ${r.date}  ${r.name}  · ${r.org}  (${r.reason})`)
}

if (DRY) {
  console.log('\n--dry-run：未写入任何文件')
  process.exit(0)
}

if (accepted.length) {
  await writeFile(MODELS, rows.join('\n'), 'utf8')
  await writeFile(CAND, JSON.stringify(rest, null, 2) + '\n', 'utf8')
}
await writeFile(REVIEW, JSON.stringify(review, null, 2) + '\n', 'utf8')
