"use client";

import { useEffect, useRef, useCallback } from "react";

interface WebThreadsProps {
  color1?: string;
  color2?: string;
  color3?: string;
  speed?: number;
  threadCount?: number;
  frequency?: number;
  spread?: number;
  taper?: number;
  position?: number;
  fanMode?: "center" | "top" | "bottom" | "left" | "right";
  glow?: number;
  falloff?: number;
  thickness?: number;
  brightness?: number;
  opacity?: number;
  mirror?: boolean;
  shimmer?: boolean;
  grain?: boolean;
  grainIntensity?: number;
  mouseInteraction?: boolean;
  mouseStrength?: number;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  return [r, g, b];
}

const VERT_SRC = `
  attribute vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const FRAG_SRC = `
  precision highp float;

  uniform vec2  u_resolution;
  uniform float u_time;
  uniform vec3  u_color1;
  uniform vec3  u_color2;
  uniform vec3  u_color3;
  uniform float u_speed;
  uniform int   u_threadCount;
  uniform float u_frequency;
  uniform float u_spread;
  uniform float u_taper;
  uniform float u_position;
  uniform float u_glow;
  uniform float u_falloff;
  uniform float u_thickness;
  uniform float u_brightness;
  uniform float u_opacity;
  uniform bool  u_mirror;
  uniform bool  u_shimmer;
  uniform bool  u_grain;
  uniform float u_grainIntensity;
  uniform vec2  u_mouse;
  uniform bool  u_mouseInteraction;
  uniform float u_mouseStrength;

  float rand(vec2 co) {
    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = rand(i);
    float b = rand(i + vec2(1.0, 0.0));
    float c = rand(i + vec2(0.0, 1.0));
    float d = rand(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  vec3 lerpColor(float t) {
    if (t < 0.5) {
      return mix(u_color1, u_color2, t * 2.0);
    } else {
      return mix(u_color2, u_color3, (t - 0.5) * 2.0);
    }
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    // Flip Y so 0 is bottom
    uv.y = 1.0 - uv.y;

    vec3 finalColor = vec3(0.0);
    float alpha = 0.0;

    float t = u_time * u_speed;

    // mouse displacement
    vec2 mouseDisp = vec2(0.0);
    if (u_mouseInteraction) {
      vec2 diff = uv - u_mouse;
      float dist = length(diff);
      mouseDisp = normalize(diff + 0.0001) * u_mouseStrength * max(0.0, 1.0 - dist * 4.0);
    }

    for (int i = 0; i < 32; i++) {
      if (i >= u_threadCount) break;

      float fi = float(i) / max(float(u_threadCount) - 1.0, 1.0);

      // base thread origin X — fan from center
      float ox = u_position + (fi - 0.5) * u_spread * 2.0;

      // shimmer phase offset
      float phaseShift = u_shimmer
        ? sin(t * 0.5 + fi * 6.28318) * 0.05
        : 0.0;

      // thread curve: sinusoidal along Y
      float sinY = uv.y + mouseDisp.y;
      float sinX = sin(sinY * u_frequency * 3.14159 + t + fi * 1.2 + phaseShift)
                 * u_spread
                 * (1.0 - pow(sinY, u_taper));

      float threadX = ox + sinX + mouseDisp.x;

      // mirror
      float sampleX = uv.x;
      if (u_mirror) {
        sampleX = abs(uv.x - 0.5) + 0.5;
        threadX = abs(threadX - 0.5) + 0.5;
      }

      float dist = abs(sampleX - threadX);

      // taper alpha along thread length (top/bottom fade)
      float lenFade = pow(sin(uv.y * 3.14159), u_falloff);

      // glow: wider soft halo + sharp core
      float halo = exp(-dist * dist / (u_glow * u_glow + 0.0001));
      float core = exp(-dist * dist / (u_thickness * 0.002 * u_thickness * 0.002 + 0.00001));
      float threadAlpha = clamp((halo * 0.4 + core * 0.8) * lenFade * u_brightness, 0.0, 1.0);

      // per-thread color
      vec3 threadColor = lerpColor(fi);

      // shimmer brightness pulse
      if (u_shimmer) {
        float pulse = 0.85 + 0.15 * sin(t * 3.0 + fi * 5.0);
        threadColor *= pulse;
      }

      // additive blend
      finalColor += threadColor * threadAlpha;
      alpha = max(alpha, threadAlpha);
    }

    // film grain
    if (u_grain) {
      float grainVal = rand(uv + vec2(t * 0.1)) - 0.5;
      finalColor += grainVal * u_grainIntensity;
    }

    finalColor = clamp(finalColor, 0.0, 1.0);
    gl_FragColor = vec4(finalColor, alpha * u_opacity);
  }
`;

export default function WebThreads({
  color1 = "#5227FF",
  color2 = "#FF9FFC",
  color3 = "#FFFFFF",
  speed = 0.2,
  threadCount = 6,
  frequency = 5,
  spread = 0.18,
  taper = 1,
  position = 0.5,
  fanMode = "center",
  glow = 0.02,
  falloff = 0.6,
  thickness = 1.1,
  brightness = 0.6,
  opacity = 1,
  mirror = false,
  shimmer = false,
  grain = false,
  grainIntensity = 0.05,
  mouseInteraction = false,
  mouseStrength = 0.3,
}: WebThreadsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef<[number, number]>([0.5, 0.5]);
  const rafRef = useRef<number>(0);

  // Suppress fanMode lint (reserved for future use)
  void fanMode;

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    mouseRef.current = [
      (e.clientX - rect.left) / rect.width,
      1.0 - (e.clientY - rect.top) / rect.height,
    ];
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", { premultipliedAlpha: false });
    if (!gl) {
      console.warn("WebThreads: WebGL not supported");
      return;
    }

    // Compile shaders
    function compileShader(type: number, src: string): WebGLShader | null {
      const shader = gl!.createShader(type);
      if (!shader) return null;
      gl!.shaderSource(shader, src);
      gl!.compileShader(shader);
      if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS)) {
        console.error("Shader error:", gl!.getShaderInfoLog(shader));
        return null;
      }
      return shader;
    }

    const vert = compileShader(gl.VERTEX_SHADER, VERT_SRC);
    const frag = compileShader(gl.FRAGMENT_SHADER, FRAG_SRC);
    if (!vert || !frag) return;

    const program = gl.createProgram()!;
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Program link error:", gl.getProgramInfoLog(program));
      return;
    }

    gl.useProgram(program);

    // Full-screen quad
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );

    const posLoc = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    // Uniform locations
    const u = (name: string) => gl.getUniformLocation(program, name);
    const locs = {
      resolution: u("u_resolution"),
      time: u("u_time"),
      color1: u("u_color1"),
      color2: u("u_color2"),
      color3: u("u_color3"),
      speed: u("u_speed"),
      threadCount: u("u_threadCount"),
      frequency: u("u_frequency"),
      spread: u("u_spread"),
      taper: u("u_taper"),
      position: u("u_position"),
      glow: u("u_glow"),
      falloff: u("u_falloff"),
      thickness: u("u_thickness"),
      brightness: u("u_brightness"),
      opacity: u("u_opacity"),
      mirror: u("u_mirror"),
      shimmer: u("u_shimmer"),
      grain: u("u_grain"),
      grainIntensity: u("u_grainIntensity"),
      mouse: u("u_mouse"),
      mouseInteraction: u("u_mouseInteraction"),
      mouseStrength: u("u_mouseStrength"),
    };

    const rgb1 = hexToRgb(color1);
    const rgb2 = hexToRgb(color2);
    const rgb3 = hexToRgb(color3);

    // Enable alpha blending
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Resize observer
    const ro = new ResizeObserver(() => {
      canvas.width = canvas.offsetWidth * devicePixelRatio;
      canvas.height = canvas.offsetHeight * devicePixelRatio;
      gl.viewport(0, 0, canvas.width, canvas.height);
    });
    ro.observe(canvas);
    canvas.width = canvas.offsetWidth * devicePixelRatio;
    canvas.height = canvas.offsetHeight * devicePixelRatio;
    gl.viewport(0, 0, canvas.width, canvas.height);

    const startTime = performance.now();

    function draw() {
      const elapsed = (performance.now() - startTime) / 1000;

      gl!.clearColor(0, 0, 0, 0);
      gl!.clear(gl!.COLOR_BUFFER_BIT);

      gl!.uniform2f(locs.resolution, canvas!.width, canvas!.height);
      gl!.uniform1f(locs.time, elapsed);
      gl!.uniform3fv(locs.color1, rgb1);
      gl!.uniform3fv(locs.color2, rgb2);
      gl!.uniform3fv(locs.color3, rgb3);
      gl!.uniform1f(locs.speed, speed);
      gl!.uniform1i(locs.threadCount, Math.min(threadCount, 32));
      gl!.uniform1f(locs.frequency, frequency);
      gl!.uniform1f(locs.spread, spread);
      gl!.uniform1f(locs.taper, taper);
      gl!.uniform1f(locs.position, position);
      gl!.uniform1f(locs.glow, glow);
      gl!.uniform1f(locs.falloff, falloff);
      gl!.uniform1f(locs.thickness, thickness);
      gl!.uniform1f(locs.brightness, brightness);
      gl!.uniform1f(locs.opacity, opacity);
      gl!.uniform1i(locs.mirror, mirror ? 1 : 0);
      gl!.uniform1i(locs.shimmer, shimmer ? 1 : 0);
      gl!.uniform1i(locs.grain, grain ? 1 : 0);
      gl!.uniform1f(locs.grainIntensity, grainIntensity);
      gl!.uniform2fv(locs.mouse, mouseRef.current);
      gl!.uniform1i(locs.mouseInteraction, mouseInteraction ? 1 : 0);
      gl!.uniform1f(locs.mouseStrength, mouseStrength);

      gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);

    if (mouseInteraction) {
      window.addEventListener("mousemove", handleMouseMove);
    }

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      window.removeEventListener("mousemove", handleMouseMove);
      gl.deleteProgram(program);
    };
  }, [
    color1, color2, color3, speed, threadCount, frequency, spread, taper,
    position, glow, falloff, thickness, brightness, opacity, mirror, shimmer,
    grain, grainIntensity, mouseInteraction, mouseStrength, handleMouseMove,
  ]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        display: "block",
      }}
    />
  );
}
