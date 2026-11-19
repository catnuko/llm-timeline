import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ChevronRight,
  Languages,
  Minus,
  Moon,
  MoveHorizontal,
  Plus,
  Sun,
} from 'lucide-react'

import { AxisFlow } from '@/components/AxisFlow'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RELEASES, type Openness } from '@/data/models'
import { DICT, modelName, orgName, type Lang } from '@/lib/i18n'
import {
  CARD_W,
  END_YEAR,
  MONTH_COUNT,
  PAD,
  START_YEAR,
  buildMonths,
  clamp,
  formatDay,
  layoutSide,
  monthIndex,
  pad2,
  type PlacedRelease,
} from '@/lib/timeline'
import { cn } from '@/lib/utils'

const HEADER_H = 68
const TOP_LIMIT = HEADER_H + 36
const BOT_LIMIT = 58 + 24
const MIN_PPM = 92
const MAX_PPM = 260

interface DateChip {
  key: string
  x: number
  label: string
  count: number
  row: number
}

const SIDE_STYLE: Record<
  Openness,
  { text: string; card: string; stem: string; dot: string }
> = {
  open: {
    text: 'text-open-deep',
    card: 'border-open/25 bg-panel/80 hover:border-open/55',
    stem: 'bg-open/25',
    dot: 'bg-open',
  },
  closed: {
    text: 'text-closed-deep',
    card: 'border-closed/25 bg-panel/80 hover:border-closed/55',
    stem: 'bg-closed/25',
    dot: 'bg-closed',
  },
}

function ModelCard({
  item,
  top,
  height,
  lang,
  onHover,
  onLeave,
}: {
  item: PlacedRelease
  top: number
  height: number
  lang: Lang
  onHover: (item: PlacedRelease) => void
  onLeave: () => void
}) {
  const style = SIDE_STYLE[item.openness]
  const label = modelName(item.name, lang)
  const compact = height < 34
  const ultra = height < 26

  return (
    <button
      type="button"
      onMouseEnter={() => onHover(item)}
      onMouseLeave={onLeave}
      onFocus={() => onHover(item)}
      onBlur={onLeave}
      style={{
        left: item.x - CARD_W / 2,
        top,
        width: CARD_W,
        height,
      }}
      className={cn(
        'group absolute z-30 flex flex-col justify-center overflow-hidden rounded-[4px] border text-left backdrop-blur-[2px] transition-[transform,background-color,border-color,box-shadow] duration-200 ease-out tl-shadow',
        'hover:z-50 hover:-translate-y-[3px] hover:bg-panel hover:tl-shadow-hover focus-visible:z-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30',
        style.card
      )}
    >
      <span
        aria-hidden
        className={cn(
          'absolute left-0 w-[2px] rounded-full',
          ultra ? 'top-[4px] bottom-[4px]' : 'top-[6px] bottom-[6px]',
          item.openness === 'open' ? 'bg-open/80' : 'bg-closed/80'
        )}
      />
      {ultra ? (
        <span className="flex items-center gap-1 pr-1 pl-[7px]">
          <span className="min-w-0 flex-1 truncate text-[9.5px] leading-none font-medium tracking-[-0.01em] text-ink">
            {label}
          </span>
          <span
            className={cn(
              'shrink-0 font-mono text-[8px] leading-none tabular-nums',
              style.text
            )}
          >
            {formatDay(item.date)}
          </span>
        </span>
      ) : (
        <>
          <span
            className={cn(
              'pr-1.5 pl-[9px] font-medium leading-[1.12] tracking-[-0.01em] text-ink',
              compact ? 'line-clamp-1' : 'line-clamp-2',
              compact
                ? label.length > 16
                  ? 'text-[9.5px]'
                  : 'text-[10px]'
                : label.length > 18
                  ? 'text-[10px]'
                  : label.length > 14
                    ? 'text-[10.5px]'
                    : 'text-[12px]'
            )}
          >
            {label}
          </span>
          <span
            className={cn(
              'flex items-baseline justify-between gap-1 pr-1.5 pl-[9px]',
              compact ? 'mt-px' : 'mt-[2px]'
            )}
          >
            <span
              className={cn(
                'truncate leading-none text-ink/55',
                compact ? 'text-[8px]' : 'text-[9px]'
              )}
            >
              {orgName(item.org, lang)}
            </span>
            <span
              className={cn(
                'shrink-0 font-mono text-[8.5px] leading-none tabular-nums',
                style.text
              )}
            >
              {formatDay(item.date)}
            </span>
          </span>
        </>
      )}
    </button>
  )
}

export default function App() {
  const rootRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ x: number; left: number } | null>(null)
  const didInit = useRef(false)

  const [size, setSize] = useState(() => ({
    w: typeof window === 'undefined' ? 1440 : window.innerWidth,
    h: typeof window === 'undefined' ? 900 : window.innerHeight,
  }))
  const [ppm, setPpm] = useState(150)
  const [scrollLeft, setScrollLeft] = useState(0)
  const [hovered, setHovered] = useState<PlacedRelease | null>(null)
  const [ready, setReady] = useState(false)
  const [lang, setLang] = useState<Lang>(() => {
    try {
      return localStorage.getItem('tl-lang') === 'en' ? 'en' : 'zh'
    } catch {
      return 'zh'
    }
  })
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('tl-theme')
      if (saved === 'light' || saved === 'dark') return saved
      return document.documentElement.classList.contains('dark')
        ? 'dark'
        : 'light'
    } catch {
      return 'light'
    }
  })
  const t = DICT[lang]
  const dark = theme === 'dark'

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    document.documentElement.style.colorScheme = theme
    try {
      localStorage.setItem('tl-theme', theme)
    } catch {
      /* 隐私模式下写入失败可忽略 */
    }
  }, [theme, dark])

  useEffect(() => {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en'
    document.title =
      lang === 'zh' ? '大模型时间线 · 2023—2026' : 'LLM Timeline · 2023—2026'
    try {
      localStorage.setItem('tl-lang', lang)
    } catch {
      /* 同上 */
    }
  }, [lang])

  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight })
    })
    ro.observe(el)
    setSize({ w: el.clientWidth, h: el.clientHeight })
    return () => ro.disconnect()
  }, [])

  const axisY = Math.round(size.h / 2)
  const totalW = PAD * 2 + MONTH_COUNT * ppm

  const geometry = useMemo(() => {
    const laneSpace = Math.max(
      140,
      Math.min(axisY - 60 - TOP_LIMIT, axisY - 60 - BOT_LIMIT)
    )
    const open = layoutSide(
      RELEASES.filter((r) => r.openness === 'open'),
      ppm
    )
    const closed = layoutSide(
      RELEASES.filter((r) => r.openness === 'closed'),
      ppm
    )
    const lanes = Math.max(open.lanes, closed.lanes)
    const pitch = clamp(laneSpace / (lanes + 1), 24, 62)
    const cardH = Math.round(
      pitch >= 46 ? pitch - 10 : pitch >= 36 ? pitch - 6 : pitch - 4
    )
    return { open, closed, pitch, cardH, lanes }
  }, [ppm, axisY])

  const months = useMemo(() => buildMonths(ppm), [ppm])

  const yearStats = useMemo(() => {
    const map = new Map<number, { open: number; closed: number }>()
    for (const item of RELEASES) {
      const year = Number(item.date.slice(0, 4))
      const current = map.get(year) ?? { open: 0, closed: 0 }
      current[item.openness] += 1
      map.set(year, current)
    }
    return map
  }, [])

  const dateChips = useMemo(() => {
    const build = (openness: Openness): DateChip[] => {
      const byDate = new Map<string, { count: number; x: number }>()
      for (const item of RELEASES) {
        if (item.openness !== openness) continue
        const prev = byDate.get(item.date)
        if (prev) {
          prev.count += 1
        } else {
          const parts = item.date.split('-').map(Number)
          const days = new Date(parts[0], parts[1], 0).getDate()
          const index =
            monthIndex(parts[0], parts[1]) + (parts[2] - 1) / days
          byDate.set(item.date, { count: 1, x: PAD + index * ppm })
        }
      }
      const list = [...byDate.entries()].sort((a, b) =>
        a[0].localeCompare(b[0])
      )
      const rowRight = [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY]
      const out: DateChip[] = []
      for (const [date, value] of list) {
        const half = 22
        for (let row = 0; row < 2; row += 1) {
          if (value.x - half > rowRight[row] + 6) {
            rowRight[row] = value.x + half
            out.push({
              key: `${openness}-${date}`,
              x: value.x,
              label: formatDay(date),
              count: value.count,
              row,
            })
            break
          }
        }
      }
      return out
    }
    return { open: build('open'), closed: build('closed') }
  }, [ppm])

  useEffect(() => {
    const el = scrollRef.current
    if (!el || didInit.current || size.w === 0) return
    didInit.current = true
    const idx = monthIndex(2026, 5)
    el.scrollLeft = Math.max(0, PAD + idx * ppm - el.clientWidth / 2)
    setScrollLeft(el.scrollLeft)
    requestAnimationFrame(() => setReady(true))
  }, [ppm, size.w])

  useEffect(() => {
    const root = rootRef.current
    const el = scrollRef.current
    if (!root || !el) return

    let target = el.scrollLeft
    let raf = 0

    const tick = () => {
      const current = el.scrollLeft
      const delta = target - current
      if (Math.abs(delta) < 0.7) {
        el.scrollLeft = target
        raf = 0
        return
      }
      el.scrollLeft = current + delta * 0.2
      raf = requestAnimationFrame(tick)
    }

    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) return
      const delta =
        Math.abs(event.deltaX) > Math.abs(event.deltaY)
          ? event.deltaX
          : event.deltaY
      if (!delta) return
      event.preventDefault()
      const max = el.scrollWidth - el.clientWidth
      target = clamp((raf ? target : el.scrollLeft) + delta * 1.15, 0, max)
      if (!raf) raf = requestAnimationFrame(tick)
    }

    const onScroll = () => {
      if (!raf) target = el.scrollLeft
      setScrollLeft(el.scrollLeft)
    }

    root.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      root.removeEventListener('wheel', onWheel)
      el.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const el = scrollRef.current
      if (!el) return
      if (event.key === 'ArrowRight') {
        el.scrollBy({ left: el.clientWidth * 0.7, behavior: 'smooth' })
      } else if (event.key === 'ArrowLeft') {
        el.scrollBy({ left: -el.clientWidth * 0.7, behavior: 'smooth' })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const applyZoom = (next: number) => {
    const el = scrollRef.current
    const target = clamp(next, MIN_PPM, MAX_PPM)
    if (target === ppm) return
    const centerMonth = el ? (el.scrollLeft + el.clientWidth / 2 - PAD) / ppm : 0
    setPpm(target)
    if (!el) return
    requestAnimationFrame(() => {
      const node = scrollRef.current
      if (!node) return
      node.scrollLeft = Math.max(
        0,
        PAD + centerMonth * target - node.clientWidth / 2
      )
    })
  }

  const jumpToYear = (year: number) => {
    const el = scrollRef.current
    if (!el) return
    const x = PAD + monthIndex(year, 1) * ppm
    el.scrollTo({ left: Math.max(0, x - 64), behavior: 'smooth' })
  }

  const winLeft = clamp((scrollLeft / totalW) * 100, 0, 100)
  const winWidth = clamp((size.w / totalW) * 100, 0, 100)

  const centerIdx = clamp(
    Math.floor((scrollLeft + size.w / 2 - PAD) / ppm),
    0,
    MONTH_COUNT - 1
  )
  const centerYear = START_YEAR + Math.floor(centerIdx / 12)
  const centerMonthIdx = (centerIdx % 12) + 1

  const openCount = RELEASES.filter((r) => r.openness === 'open').length
  const closedCount = RELEASES.filter((r) => r.openness === 'closed').length

  const renderDateChips = (openness: Openness, items: DateChip[]) => {
    if (ppm < 108) return null
    return items.map((chip) => (
      <div
        key={chip.key}
        style={{
          left: chip.x,
          top:
            openness === 'open'
              ? axisY - 33 - chip.row * 18
              : axisY + 19 + chip.row * 18,
        }}
        className={cn(
          'pointer-events-none absolute z-20 -translate-x-1/2 rounded-[2px] px-1 py-[2px] font-mono text-[8.5px] leading-none tabular-nums backdrop-blur-[1px]',
          openness === 'open'
            ? 'bg-band/55 text-open-deep/80'
            : 'bg-band/55 text-closed-deep/80'
        )}
      >
        {chip.label}
        {chip.count > 1 && (
          <span className="ml-[2px] text-ink/40">·{chip.count}</span>
        )}
      </div>
    ))
  }

  const renderCards = (placed: PlacedRelease[], openness: Openness) =>
    placed.map((item) => {
      const top =
        openness === 'open'
          ? axisY - 60 - item.lane * geometry.pitch - geometry.cardH
          : axisY + 60 + item.lane * geometry.pitch
      const stemTop = openness === 'open' ? top + geometry.cardH : axisY + 2
      const stemHeight =
        openness === 'open' ? axisY - 2 - (top + geometry.cardH) : top - axisY - 2
      return (
        <div key={`${item.date}-${item.name}`}>
          <div
            aria-hidden
            className={cn('absolute z-10 w-px', SIDE_STYLE[openness].stem)}
            style={{ left: item.x, top: stemTop, height: stemHeight }}
          />
          <div
            aria-hidden
            className={cn(
              'absolute z-20 size-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-paper/80',
              SIDE_STYLE[openness].dot
            )}
            style={{ left: item.x, top: axisY }}
          />
          <ModelCard
            item={item}
            top={top}
            height={geometry.cardH}
            lang={lang}
            onHover={setHovered}
            onLeave={() => setHovered(null)}
          />
        </div>
      )
    })

  return (
    <div
      ref={rootRef}
      className="relative h-dvh w-full overflow-hidden bg-paper font-sans text-ink antialiased select-none"
    >
      <div aria-hidden className="absolute inset-x-0 top-0 h-1/2 bg-open-wash" />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-1/2 bg-closed-wash"
      />

      {/* 轴线上的红蓝对抗场 */}
      <AxisFlow axisY={axisY} scrollLeft={scrollLeft} dark={dark} />
      <div aria-hidden className="canvas-dots absolute inset-x-0 top-0 h-1/2" />
      <div
        aria-hidden
        className="canvas-dots absolute inset-x-0 bottom-0 h-1/2"
      />

      <div className="pointer-events-none absolute top-[80px] left-3 z-0 flex items-center gap-2 select-none">
        <span className="h-px w-4 bg-open/45" />
        <span
          className={cn(
            'text-[10px] text-open/60',
            lang === 'zh' ? 'tracking-[0.08em]' : 'tracking-[0.22em]'
          )}
        >
          {t.openLabel}
        </span>
      </div>
      <div className="pointer-events-none absolute bottom-[68px] left-3 z-0 flex items-center gap-2 select-none">
        <span className="h-px w-4 bg-closed/45" />
        <span
          className={cn(
            'text-[10px] text-closed/60',
            lang === 'zh' ? 'tracking-[0.08em]' : 'tracking-[0.22em]'
          )}
        >
          {t.closedLabel}
        </span>
      </div>

      <div
        ref={scrollRef}
        onPointerDown={(event) => {
          if (event.pointerType === 'mouse' && event.button !== 0) return
          const el = scrollRef.current
          if (!el) return
          dragRef.current = { x: event.clientX, left: el.scrollLeft }
          el.setPointerCapture(event.pointerId)
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current
          const el = scrollRef.current
          if (!drag || !el) return
          el.scrollLeft = drag.left - (event.clientX - drag.x)
        }}
        onPointerUp={(event) => {
          dragRef.current = null
          scrollRef.current?.releasePointerCapture(event.pointerId)
        }}
        className={cn(
          'no-scrollbar absolute inset-0 cursor-grab overflow-x-auto overflow-y-hidden active:cursor-grabbing',
          'transition-opacity duration-700 ease-out',
          ready ? 'opacity-100' : 'opacity-0'
        )}
      >
        <div className="relative h-full" style={{ width: totalW }}>
          {months.map((cell) => (
            <div
              key={`grid-${cell.index}`}
              aria-hidden
              className={cn(
                'absolute top-0 bottom-0 w-px',
                cell.month === 1 ? 'bg-ink/12' : 'bg-ink/[0.045]'
              )}
              style={{ left: cell.x }}
            />
          ))}

          {Array.from({ length: END_YEAR - START_YEAR + 1 }, (_, i) => {
            const year = START_YEAR + i
            const x = PAD + monthIndex(year, 1) * ppm
            const stat = yearStats.get(year)
            return (
              <div
                key={`year-${year}`}
                aria-hidden
                className="absolute z-0"
                style={{ left: x + 14, top: HEADER_H + 38 }}
              >
                <div className="font-mono text-[20px] leading-none font-semibold tracking-[-0.02em] text-ink/18 tabular-nums">
                  {year}
                </div>
                {stat && (
                  <div className="mt-1.5 flex items-center gap-2.5 font-mono text-[8.5px] leading-none tabular-nums text-ink/35">
                    <span className="flex items-center gap-1">
                      <i className="h-[2px] w-2.5 bg-open/55" />
                      {stat.open}
                    </span>
                    <span className="flex items-center gap-1">
                      <i className="h-[2px] w-2.5 bg-closed/55" />
                      {stat.closed}
                    </span>
                  </div>
                )}
              </div>
            )
          })}

          <div
            aria-hidden
            className="absolute inset-x-0 z-20 border-y border-ink/10 bg-band/60 backdrop-blur-[1px]"
            style={{ top: axisY - 17, height: 34 }}
          />
          <div
            aria-hidden
            className="absolute inset-x-0 z-20 h-px bg-ink/25"
            style={{ top: axisY }}
          />

          {months.map((cell) => {
            const visible =
              ppm >= 128 || cell.month === 1 || cell.month % 3 === 0
            if (!visible) return null
            return (
              <div
                key={`label-${cell.index}`}
                className="absolute z-30 flex h-3 items-center"
                style={{ left: cell.x + 6, top: axisY - 16 }}
              >
                {cell.month === 1 ? (
                  <span className="rounded-[2px] bg-band/85 px-1 font-mono text-[10px] leading-none font-semibold text-ink/85 tabular-nums">
                    {cell.year}
                  </span>
                ) : (
                  <span className="rounded-[2px] bg-band/70 px-[3px] py-px font-mono text-[8.5px] leading-none text-ink/40 tabular-nums">
                    {pad2(cell.month)}
                  </span>
                )}
              </div>
            )
          })}

          {renderDateChips('open', dateChips.open)}
          {renderDateChips('closed', dateChips.closed)}

          {renderCards(geometry.open.items, 'open')}
          {renderCards(geometry.closed.items, 'closed')}
        </div>
      </div>

      <header className="absolute inset-x-0 top-0 z-[60] h-[68px] border-b border-ink/10 bg-paper/78 backdrop-blur-md">
        <div className="flex h-full items-center gap-4 px-5">
          <div aria-hidden className="grid h-7 w-7 shrink-0 grid-rows-2 gap-[2px]">
            <span className="rounded-[2px] bg-open" />
            <span className="rounded-[2px] bg-closed" />
          </div>
          <div className="min-w-0">
            <h1 className="text-[19px] leading-none font-semibold tracking-[-0.02em]">
              {t.title}
            </h1>
            <p className="mt-1.5 truncate text-[10.5px] leading-none text-ink/55">
              {t.subtitle}
            </p>
          </div>

          <div className="ml-auto flex items-center gap-4">
            <div className="hidden items-center gap-3 md:flex">
              <span className="flex items-center gap-1.5 font-mono text-[10.5px] tabular-nums text-ink/65">
                <i className="size-[6px] rounded-full bg-open" />
                {openCount}
              </span>
              <span className="flex items-center gap-1.5 font-mono text-[10.5px] tabular-nums text-ink/65">
                <i className="size-[6px] rounded-full bg-closed" />
                {closedCount}
              </span>
            </div>
            <span className="hidden items-center gap-1 text-[10.5px] text-ink/45 lg:flex">
              <MoveHorizontal className="size-3" />
              {t.pan}
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="xs"
                aria-label={t.lang}
                onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
                className="gap-1 rounded-md border border-ink/12 bg-band/60 px-2 font-mono text-[10px] text-ink/60 hover:bg-ink/6 hover:text-ink"
              >
                <Languages className="size-3 opacity-60" />
                {lang === 'zh' ? 'EN' : '中'}
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t.theme}
                onClick={() => setTheme(dark ? 'light' : 'dark')}
                className="rounded-md border border-ink/12 bg-band/60 hover:bg-ink/6"
              >
                {dark ? <Sun /> : <Moon />}
              </Button>
            </div>
            <div className="flex items-center gap-0.5 rounded-md border border-ink/12 bg-band/60 p-0.5">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t.zoomOut}
                onClick={() => applyZoom(ppm - 18)}
                className="hover:bg-ink/5"
              >
                <Minus />
              </Button>
              <span className="w-7 text-center font-mono text-[9.5px] tabular-nums text-ink/45">
                {ppm}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t.zoomIn}
                onClick={() => applyZoom(ppm + 18)}
                className="hover:bg-ink/5"
              >
                <Plus />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {hovered && (
        <aside className="pointer-events-none absolute bottom-[72px] left-5 z-[60] w-[282px] rounded-md border border-ink/12 bg-paper/95 p-3 tl-shadow-panel backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span
              className={cn(
                'font-mono text-[10px] tabular-nums',
                SIDE_STYLE[hovered.openness].text
              )}
            >
              {hovered.date}
            </span>
            <Badge
              variant="outline"
              className={cn(
                'h-[18px] rounded-[3px] px-1.5 text-[9px]',
                hovered.openness === 'open'
                  ? 'border-open/30 bg-open/8 text-open-deep'
                  : 'border-closed/30 bg-closed/8 text-closed-deep'
              )}
            >
              {t.tags[hovered.tag]}
            </Badge>
          </div>
          <div className="mt-1.5 text-[15px] leading-tight font-medium tracking-[-0.01em]">
            {modelName(hovered.name, lang)}
          </div>
          <div className="mt-1 text-[10.5px] text-ink/55">
            {hovered.org} · {hovered.openness === 'open' ? t.openName : t.closedName}
          </div>
          {hovered.note && (
            <p className="mt-2 border-t border-ink/8 pt-2 text-[10.5px] leading-relaxed text-ink/65">
              {hovered.note}
            </p>
          )}
        </aside>
      )}

      <footer className="absolute inset-x-0 bottom-0 z-[60] h-[58px] border-t border-ink/10 bg-paper/82 backdrop-blur-md">
        <div className="flex h-full items-center gap-5 px-5">
          <div className="w-[86px] shrink-0">
            <div className="text-[8.5px] tracking-[0.14em] text-ink/40">
              {t.viewport}
            </div>
            <div className="font-mono text-[14px] leading-tight font-medium tabular-nums">
              {centerYear}.{pad2(centerMonthIdx)}
            </div>
          </div>

          <div className="relative h-[30px] flex-1">
            <div className="absolute inset-x-0 top-[7px] h-[5px] rounded-full border border-ink/10 bg-band/70">
              {Array.from({ length: END_YEAR - START_YEAR + 1 }, (_, i) => {
                const year = START_YEAR + i
                const left = ((PAD + monthIndex(year, 1) * ppm) / totalW) * 100
                return (
                  <span
                    key={`seg-${year}`}
                    className="absolute top-0 h-full w-px bg-ink/10"
                    style={{ left: `${left}%` }}
                  />
                )
              })}
            </div>
            <button
              type="button"
              aria-label="点击定位缩略导航"
              onClick={(event) => {
                const el = scrollRef.current
                if (!el) return
                const rect = event.currentTarget.getBoundingClientRect()
                const ratio = (event.clientX - rect.left) / rect.width
                el.scrollTo({
                  left: clamp(
                    ratio * totalW - el.clientWidth / 2,
                    0,
                    totalW - el.clientWidth
                  ),
                  behavior: 'smooth',
                })
              }}
              className="absolute top-[4px] h-[11px] cursor-pointer rounded-[3px] border border-ink/35 bg-band/85 shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
              style={{
                left: `${winLeft}%`,
                width: `${Math.max(winWidth, 2)}%`,
              }}
            />
            <div className="absolute inset-x-0 bottom-0 font-mono text-[8px] text-ink/35 tabular-nums">
              {Array.from({ length: END_YEAR - START_YEAR + 1 }, (_, i) => {
                const year = START_YEAR + i
                const left =
                  ((PAD + monthIndex(year, 1) * ppm) / totalW) * 100
                return (
                  <span
                    key={`yr-${year}`}
                    className="absolute"
                    style={{ left: `${left}%` }}
                  >
                    {year}
                  </span>
                )
              })}
            </div>
          </div>

          <div className="hidden shrink-0 items-center gap-1 sm:flex">
            {Array.from({ length: END_YEAR - START_YEAR + 1 }, (_, i) => {
              const year = START_YEAR + i
              return (
                <Button
                  key={`jump-${year}`}
                  variant="ghost"
                  size="xs"
                  onClick={() => jumpToYear(year)}
                  className="font-mono text-[10px] tabular-nums text-ink/55 hover:bg-ink/6 hover:text-ink"
                >
                  {year}
                </Button>
              )
            })}
            <Button
              variant="ghost"
              size="xs"
              onClick={() => {
                const el = scrollRef.current
                el?.scrollTo({ left: totalW, behavior: 'smooth' })
              }}
              className="text-[10px] text-ink/55 hover:bg-ink/6 hover:text-ink"
            >
              {t.latest}
              <ChevronRight className="size-3" />
            </Button>
          </div>
        </div>
      </footer>
    </div>
  )
}
