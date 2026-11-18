import type { Release } from '@/data/models'

export const START_YEAR = 2023
export const START_MONTH = 1
export const END_YEAR = 2026
export const END_MONTH = 12

export const MONTH_COUNT =
  (END_YEAR - START_YEAR) * 12 + (END_MONTH - START_MONTH) + 1

/** 时间轴左右留白，保证首尾卡片不被裁切 */
export const PAD = 120
export const CARD_W = 134
export const CARD_GAP = 10

export interface PlacedRelease extends Release {
  x: number
  lane: number
}

export interface MonthCell {
  index: number
  year: number
  month: number
  x: number
}

export function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

export function monthIndex(year: number, month: number): number {
  return (year - START_YEAR) * 12 + (month - START_MONTH)
}

export function parseISO(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = iso.split('-').map(Number)
  return { y, m, d }
}

/** 把日期换算成时间轴上的像素坐标 */
export function xFor(iso: string, pxPerMonth: number): number {
  const { y, m, d } = parseISO(iso)
  const fraction = (d - 1) / daysInMonth(y, m)
  return PAD + (monthIndex(y, m) + fraction) * pxPerMonth
}

export function buildMonths(pxPerMonth: number): MonthCell[] {
  return Array.from({ length: MONTH_COUNT }, (_, index) => {
    const total = START_MONTH - 1 + index
    const year = START_YEAR + Math.floor(total / 12)
    const month = (total % 12) + 1
    return { index, year, month, x: PAD + index * pxPerMonth }
  })
}

export function formatDay(iso: string): string {
  const { m, d } = parseISO(iso)
  return `${pad2(m)}.${pad2(d)}`
}

/** 贪心分层：同一侧、横向会重叠的卡片依次放到下一层 */
export function layoutSide(
  items: Release[],
  pxPerMonth: number,
  cardW = CARD_W
): { items: PlacedRelease[]; lanes: number } {
  const sorted = items
    .map((item) => ({ ...item, x: xFor(item.date, pxPerMonth), lane: 0 }))
    .sort((a, b) => a.x - b.x || a.name.localeCompare(b.name))

  const laneRight: number[] = []

  for (const item of sorted) {
    let lane = 0
    while (
      lane < laneRight.length &&
      item.x - cardW / 2 < laneRight[lane] + CARD_GAP
    ) {
      lane += 1
    }
    laneRight[lane] = item.x + cardW / 2
    item.lane = lane
  }

  return { items: sorted, lanes: Math.max(0, laneRight.length - 1) }
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}
