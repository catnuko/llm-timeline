import { useEffect, useRef } from 'react'
import { FRAG, VERT } from '@/lib/axisFlowShader'

/** 场带高度（CSS px），以轴线为中心向上下各一半 */
export const FLOW_H = 420

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)!
  gl.shaderSource(sh, src)
  gl.compileShader(sh)
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(sh))
    return null
  }
  return sh
}

export function AxisFlow({
  axisY,
  scrollLeft,
  dark,
}: {
  axisY: number
  scrollLeft: number
  dark: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scrollRef = useRef(scrollLeft)
  const darkRef = useRef(dark)
  scrollRef.current = scrollLeft
  darkRef.current = dark

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: false,
      depth: false,
      premultipliedAlpha: true,
      powerPreference: 'low-power',
    })
    if (!gl) return

    const vs = compile(gl, gl.VERTEX_SHADER, VERT)
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG)
    if (!vs || !fs) return

    const program = gl.createProgram()!
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(program))
      return
    }
    gl.useProgram(program)

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW
    )
    const aPos = gl.getAttribLocation(program, 'aPos')
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

    const uRes = gl.getUniformLocation(program, 'uRes')
    const uTime = gl.getUniformLocation(program, 'uTime')
    const uScroll = gl.getUniformLocation(program, 'uScroll')
    const uDark = gl.getUniformLocation(program, 'uDark')

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let dpr = Math.min(window.devicePixelRatio || 1, 1.15)
    let raf = 0
    let running = true
    let t = 0
    let last = performance.now()

    const resize = () => {
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (!w || !h) return
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      gl.viewport(0, 0, canvas.width, canvas.height)
    }

    const draw = () => {
      gl.uniform2f(uRes, canvas.width, canvas.height)
      gl.uniform1f(uTime, reduced ? 0.4 : t)
      gl.uniform1f(uScroll, scrollRef.current)
      gl.uniform1f(uDark, darkRef.current ? 1 : 0)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1)
      last = now
      if (!reduced) t += dt
      draw()
      if (running) raf = requestAnimationFrame(tick)
    }

    resize()
    draw()

    const ro = new ResizeObserver(() => {
      resize()
      draw()
    })
    ro.observe(canvas)

    const onVisibility = () => {
      if (document.hidden) {
        running = false
        cancelAnimationFrame(raf)
      } else if (!running) {
        running = true
        last = performance.now()
        raf = requestAnimationFrame(tick)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    // 静态帧也再画一帧，等首屏淡入完成
    const warm = setTimeout(draw, 400)

    if (!reduced) raf = requestAnimationFrame(tick)

    return () => {
      running = false
      cancelAnimationFrame(raf)
      clearTimeout(warm)
      ro.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      gl.deleteProgram(program)
      gl.deleteBuffer(buf)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-x-0 z-0"
      style={{
        top: axisY - FLOW_H / 2,
        height: FLOW_H,
        width: '100%',
        opacity: 0.85,
      }}
    />
  )
}
