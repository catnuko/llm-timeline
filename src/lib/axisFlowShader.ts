/**
 * 轴线上的「对抗」场：一条域扭曲 fBm 的流动带。
 * 上侧红色向上窜成火舌，下侧蓝色缓慢涌动，交界处互相吞噬。
 * 只依赖原生 WebGL，不引 three.js。
 */

export const VERT = `
attribute vec2 aPos;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`

export const FRAG = `
precision highp float;

uniform vec2  uRes;
uniform float uTime;
uniform float uScroll;
uniform float uDark;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 5; i++) {
    v += amp * noise(p);
    p = p * 2.03 + 7.31;
    amp *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;
  vec2 p = vec2((uv.x - 0.5) * aspect, uv.y - 0.5) * 2.0;
  float t = uTime * 0.055;

  // 域扭曲：低频流场推动高频细节
  vec2 q = vec2(
    fbm(p * 1.25 + vec2(0.0, t)),
    fbm(p * 1.25 + vec2(5.2, -t) + 1.7)
  );
  vec2 r = p + 0.52 * (q - 0.5);

  // 交界线本身也在抖，横向随滚动移动
  float wave = (fbm(vec2(r.x * 1.9 + uScroll * 0.00055, r.y * 0.7 + t * 2.2)) - 0.5) * 0.26;
  float d = p.y - wave;

  // 红区：向上拉长的火舌
  float flame = fbm(vec2(r.x * 6.0, r.y * 3.0 - t * 4.2));
  flame = smoothstep(0.30, 0.86, flame);
  // 蓝区：慢速横向流动，团块更圆
  float liquid = fbm(vec2(r.x * 3.4 + t * 1.1, r.y * 1.7 + t * 0.35));
  liquid = smoothstep(0.22, 0.80, liquid);

  // 交界线被两侧互相顶出锯齿
  float tongue = (fbm(vec2(r.x * 7.0, r.y * 3.4 + t * 2.4)) - 0.5) * 0.13;
  float edge = smoothstep(-0.045, 0.045, d + tongue);
  float hot = exp(-abs(d) * 7.0);

  vec3 red = mix(vec3(0.38, 0.07, 0.06), vec3(0.84, 0.24, 0.18), flame);
  vec3 blue = mix(vec3(0.06, 0.13, 0.27), vec3(0.22, 0.44, 0.76), liquid);

  if (uDark > 0.5) {
    red = mix(vec3(0.24, 0.04, 0.03), vec3(0.95, 0.36, 0.28), flame);
    blue = mix(vec3(0.03, 0.07, 0.15), vec3(0.38, 0.60, 0.92), liquid);
  }

  vec3 col = mix(blue, red, edge);
  col += hot * mix(vec3(0.62, 0.18, 0.14), vec3(0.28, 0.50, 0.74), edge) * 0.5;

  // 交界处的火星
  float spark = hash21(floor(p * vec2(70.0, 70.0)) + floor(uTime * 10.0));
  spark = smoothstep(0.972, 1.0, spark) * exp(-abs(d) * 7.0);
  col += spark * vec3(1.0, 0.86, 0.72);

  // 纵向淡出，上下没有硬边
  float fade = exp(-abs(p.y) * 1.35) * (1.0 - smoothstep(0.55, 1.0, abs(p.y)));
  float a = clamp(fade * (0.52 + hot * 1.05), 0.0, 0.95);

  // 预乘 alpha，直接叠在页面底色上
  gl_FragColor = vec4(col * a, a);
}
`
