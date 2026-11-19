#!/usr/bin/env node
/**
 * 候选发布采集器 —— 只产出 data/candidates.json，不修改 src/data/models.ts。
 *
 *   node scripts/collect.mjs           # 拉一次，打印新增候选
 *   node scripts/collect.mjs --all     # 忽略时间窗口，列出全部未收录条目
 *
 * 源：OpenRouter 模型目录（带 created 时间戳，覆盖中美主流厂商）
 *     + Hugging Face Hub 厂商白名单（开源权重首发通常更早）
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const MODELS = path.join(ROOT, 'src/data/models.ts')
const OUT = path.join(ROOT, 'data/candidates.json')
const WINDOW_DAYS = Number(process.env.WINDOW_DAYS ?? 45)
const ALL = process.argv.includes('--all')

/** OpenRouter 的厂商前缀 → 时间线里的 org 名 */
const VENDOR = {
  openai: 'OpenAI',
  google: 'Google',
  anthropic: 'Anthropic',
  meta: 'Meta',
  qwen: '阿里巴巴',
  alibaba: '阿里巴巴',
  deepseek: 'DeepSeek',
  'z-ai': '智谱 AI',
  moonshotai: '月之暗面',
  minimax: 'MiniMax',
  tencent: '腾讯',
  baidu: '百度',
  stepfun: '阶跃星辰',
  bytedance: '字节跳动',
  mistralai: 'Mistral',
  'x-ai': 'xAI',
  nvidia: 'NVIDIA',
  cohere: 'Cohere',
  microsoft: '微软',
  perplexity: 'Perplexity',
  nvidia_nemotron: 'NVIDIA',
}

/** Hugging Face 官方组织（避开社区微调洪水） */
const HF_AUTHORS = [
  'Qwen',
  'deepseek-ai',
  'meta-llama',
  'google',
  'mistralai',
  'moonshotai',
  'zai-org',
  'MiniMax-AI',
  'tencent',
  'baidu',
  'stepfun-ai',
  '01-ai',
  'internlm',
  'OpenBMB',
  'microsoft',
  'nvidia',
  'allenai',
  'CohereLabs',
  'ByteDance',
]

const norm = (s) =>
  s
    .toLowerCase()
    .replace(/\(free\)|\(beta\)|\bfree\b/g, '')
    .replace(/[-_\s]+/g, '')
    .trim()

/** 量化 / 转换 / 蒸馏 / 投机解码等派生版本，不是一次新发布 */
const DERIVATIVE =
  /(-|_|\s)(fp8|fp4|fp16|bf16|int4|int8|nvfp4|awq|gptq|gguf|onnx|webgpu|mlx|bnb|w4a16|a8w8|quanto|draft|mtp|spec|distill|distilled|nfe\d+|lora|adapter|base|instruct|chat|gguf|pruned|mini-?l\d+)(-|$)/i

const today = new Date()
const cutoff = new Date(today.getTime() - WINDOW_DAYS * 864e5)
const iso = (d) => d.toISOString().slice(0, 10)

/** 剥掉 OpenRouter 的变体后缀，还原成模型本名 */
function cleanId(id) {
  return id
    .replace(/^~/, '')
    .split(':')[0]
    .replace(/[-.]latest$/i, '')
}

async function getJson(url) {
  const res = await fetch(url, {
    headers: { 'user-agent': 'llm-timeline-collector/1.0' },
    signal: AbortSignal.timeout(30000),
  })
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return res.json()
}

async function fromOpenRouter() {
  const { data } = await getJson('https://openrouter.ai/api/v1/models')
  const out = []
  for (const m of data) {
    if (!m.created) continue
    const raw = m.id
    const clean = cleanId(raw)
    const prefix = clean.split('/')[0]
    const org = VENDOR[prefix]
    if (!org) continue
    if (/:batch|:free|:thinking|:online|:exacto/.test(raw)) continue
    const name = (m.name || clean.split('/').pop())
      .replace(/^[^:]{1,12}:\s*/, '')
      .replace(/\s*\(free\)$/i, '')
      .trim()
    out.push({ date: iso(new Date(m.created * 1000)), name, org, source: 'openrouter', ref: raw })
  }
  return out
}

async function fromHuggingFace() {
  const out = []
  for (const author of HF_AUTHORS) {
    try {
      const list = await getJson(
        `https://huggingface.co/api/models?author=${encodeURIComponent(author)}&sort=createdAt&direction=-1&limit=40`,
      )
      for (const m of list) {
        if (!m.createdAt) continue
        if ((m.likes ?? 0) < 10) continue
        out.push({
          date: iso(new Date(m.createdAt)),
          name: m.id.split('/')[1],
          org: VENDOR[author.toLowerCase()] ?? author,
          source: 'huggingface',
          ref: m.id,
          likes: m.likes ?? 0,
          // 上架 Hugging Face 官方组织，通常意味着开放权重
          suggestedOpenness: 'open',
        })
      }
    } catch (e) {
      console.error(`! hf ${author}: ${e.message}`)
    }
  }
  return out
}

function existingKeys() {
  const src = readFile(MODELS, 'utf8')
  return src.then((text) => {
    const keys = new Set()
    for (const m of text.matchAll(/date: '([^']+)',\s*name: '([^']+)'/g)) {
      keys.add(`${m[1]}|${norm(m[2])}`)
    }
    return keys
  })
}

const [keys, or, hf] = await Promise.all([existingKeys(), fromOpenRouter(), fromHuggingFace()])

const seen = new Set()
let pool = [...or, ...hf].filter((c) => {
  if (DERIVATIVE.test(c.name)) return false
  return true
})
// 同一厂商同一天里，被别的候选名包含的短名（Hy4-flash 之于 Hy4-flash-FP8）保留最短的那个
const shortNames = new Map()
for (const c of pool) {
  const k = `${c.date}|${c.org}`
  const cur = shortNames.get(k)
  if (!cur || c.name.length < cur.length) shortNames.set(k, c.name)
}
const fresh = []
for (const c of pool) {
  const d = new Date(c.date)
  if (!ALL && d < cutoff) continue
  const keep = shortNames.get(`${c.date}|${c.org}`)
  if (keep && keep.toLowerCase() !== c.name.toLowerCase() && c.name.toLowerCase().startsWith(keep.toLowerCase()))
    continue
  const key = `${c.date}|${norm(c.name)}`
  if (keys.has(key) || seen.has(key)) continue
  // 同名已收录（不同日期）多为再版，跳过
  if ([...keys].some((k) => k.endsWith(`|${norm(c.name)}`))) continue
  seen.add(key)
  fresh.push(c)
}

fresh.sort((a, b) => (a.date < b.date ? 1 : -1))

let prev = []
try {
  prev = JSON.parse(await readFile(OUT, 'utf8'))
} catch {}

const merged = [...fresh, ...prev]
const byKey = new Map()
for (const c of merged) {
  const k = `${c.date}|${norm(c.name)}`
  const old = byKey.get(k)
  if (old) old.firstSeen = old.firstSeen ?? c.firstSeen
  else byKey.set(k, { ...c, firstSeen: c.firstSeen ?? iso(today) })
}
const list = [...byKey.values()].sort((a, b) => (a.date < b.date ? 1 : -1))

await mkdir(path.dirname(OUT), { recursive: true })
await writeFile(OUT, JSON.stringify(list, null, 2) + '\n', 'utf8')

console.log(`已收录 ${keys.size} 条；本次新候选 ${fresh.length} 条（窗口 ${ALL ? '全部' : WINDOW_DAYS + ' 天'}）`)
for (const c of fresh.slice(0, 25)) {
  console.log(`  ${c.date}  ${c.name}  · ${c.org}  [${c.source}]`)
}
if (fresh.length > 25) console.log(`  …另有 ${fresh.length - 25} 条，见 data/candidates.json`)
