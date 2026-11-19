import type { ModelTag } from '@/data/models'

export type Lang = 'zh' | 'en'

const ORG_EN: Record<string, string> = {
  复旦大学: 'Fudan University',
  百度: 'Baidu',
  阿里巴巴: 'Alibaba',
  '智谱 AI': 'Zhipu AI',
  百川智能: 'Baichuan',
  '上海 AI 实验室': 'Shanghai AI Lab',
  零一万物: '01.AI',
  商汤科技: 'SenseTime',
  科大讯飞: 'iFlytek',
  DeepSeek: 'DeepSeek',
  月之暗面: 'Moonshot AI',
  MiniMax: 'MiniMax',
  字节跳动: 'ByteDance',
  华为: 'Huawei',
  美团: 'Meituan',
  腾讯: 'Tencent',
  OpenAI: 'OpenAI',
  Anthropic: 'Anthropic',
  Google: 'Google',
  Meta: 'Meta',
  'Mistral AI': 'Mistral AI',
  xAI: 'xAI',
  微软: 'Microsoft',
  亚马逊: 'Amazon',
}

export function orgName(org: string, lang: Lang): string {
  return lang === 'en' ? (ORG_EN[org] ?? org) : org
}

/** 中文模型名在英文界面里给通行英文名，其余保持原名 */
const NAME_EN: Record<string, string> = {
  文心一言: 'ERNIE Bot',
  '文心 4.0': 'ERNIE 4.0',
  通义千问: 'Tongyi Qianwen',
  讯飞星火: 'iFlytek Spark',
  '日日新 5.0': 'SenseNova 5.0',
  '混元 Hy4': 'Hunyuan Hy4',
  '复旦 MOSS': 'Fudan MOSS',
}

export function modelName(name: string, lang: Lang): string {
  return lang === 'en' ? (NAME_EN[name] ?? name) : name
}

const TAG_EN: Record<ModelTag, string> = {
  旗舰: 'Flagship',
  推理: 'Reasoning',
  多模态: 'Multimodal',
  轻量: 'Lightweight',
  Agent: 'Agent',
}

export interface Dict {
  title: string
  subtitle: string
  openLabel: string
  closedLabel: string
  pan: string
  viewport: string
  latest: string
  zoomIn: string
  zoomOut: string
  jump: string
  theme: string
  lang: string
  openName: string
  closedName: string
  tags: Record<ModelTag, string>
}

export const DICT: Record<Lang, Dict> = {
  zh: {
    title: '开源 vs 闭源 · 大模型时间线',
    subtitle: '2023.01 — 2026.11 · 上方开放权重 · 下方闭源',
    openLabel: '开源（开放权重）',
    closedLabel: '闭源',
    pan: '滚轮左右滚动',
    viewport: '视窗中心',
    latest: '最新',
    zoomIn: '放大',
    zoomOut: '缩小',
    jump: '跳到',
    theme: '切换主题',
    lang: '切换语言',
    openName: '开源',
    closedName: '闭源',
    tags: TAG_EN,
  },
  en: {
    title: 'Open Weights vs Closed Source',
    subtitle: '2023.01 — 2026.11 · open weights above · closed below',
    openLabel: 'Open weights',
    closedLabel: 'Closed',
    pan: 'Scroll to pan',
    viewport: 'In view',
    latest: 'Latest',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    jump: 'Jump to',
    theme: 'Toggle theme',
    lang: 'Switch language',
    openName: 'Open',
    closedName: 'Closed',
    tags: TAG_EN,
  },
}

export const TAG_EN_MAP = TAG_EN
