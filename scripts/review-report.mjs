#!/usr/bin/env node
/**
 * 把 data/review.json 渲染成文本 / markdown，给 workflow 打日志与开 issue 用。
 *   node scripts/review-report.mjs        # 纯文本行
 *   node scripts/review-report.mjs --md   # markdown
 */

import { readFileSync } from 'node:fs'

let items = []
try {
  items = JSON.parse(readFileSync('data/review.json', 'utf8'))
} catch {}

const md = process.argv.includes('--md')

if (!items.length) {
  console.log(md ? '本轮没有待人工候选。' : '（空）')
  process.exit(0)
}

if (!md) {
  for (const x of items) console.log(`- ${x.date} · ${x.name} · ${x.org}（${x.reason}）`)
  process.exit(0)
}

console.log('以下候选未自动收录，需要人工判断（多为派生格式、疑似重新上架或开闭源口径存疑）：')
console.log('')
for (const x of items) console.log(`- \`${x.date} · ${x.name} · ${x.org}\` — ${x.reason}`)
