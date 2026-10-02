import { GenericXYCanvasPathCacheV1, forEachGenericXYDisplayPointV1 } from "../../components/workbench/presentation/GenericXYCanvasRendererV1";
import type { GenericXYGeometryV1 } from "../../components/workbench/presentation/GenericXYGraphV1";

type XY = readonly [number, number];
type Fixture = Readonly<{ geometry: GenericXYGeometryV1; edges: Float32Array; color: readonly [number, number, number] }>;
type Renderer = { canvas: HTMLCanvasElement; details?: Record<string, unknown>; draw(shift: number): void; read(): Promise<Uint8Array>; dispose(): void };
type UnavailableRenderer = Readonly<{ available: false; reason: string }>;
const WIDTH = 620, HEIGHT = 375, HALF_WIDTH = .85;
const nextFrame = () => new Promise<number>(resolve => requestAnimationFrame(resolve));
const summary = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  return { count: values.length, mean: values.reduce((sum, value) => sum + value, 0) / values.length,
    p95: sorted[Math.floor((sorted.length - 1) * .95)], maximum: Math.max(...values) };
};

/** Repeated loops and genuine breaks exercise retained XY geometry. All three
 * backends receive the identical coalesced observed vertex pairs. This isolates
 * submission/raster costs; it does not benchmark live transport or React. */
function fixtures(): Fixture[] {
  return Array.from({ length: 20 }, (_, trace) => {
    const chunks: GenericXYGeometryV1["chunks"][number][] = [], edges: number[] = [];
    const point = (index: number): XY => {
      const phase = (index % 503) / 503 * Math.PI * 2;
      return [Math.sin(phase) * (.85 - trace * .018), Math.cos(phase) * (.85 - trace * .018) + .04 * Math.sin(phase * 3)];
    };
    for (let start = 0; start < 3000; start += 256) {
      const segments: [number, number][][] = []; let segment: [number, number][] = [];
      for (let index = Math.max(0, start - 1); index < Math.min(start + 256, 3000); index++) {
        if (index % 503 === 0 || index % 877 === 0) { if (segment.length) segments.push(segment); segment = []; }
        segment.push([...point(index)]);
      }
      if (segment.length) segments.push(segment);
      chunks.push({ id: start, samples: [], predecessor: undefined, segments, minimumX: -1, maximumX: 1, minimumY: -1, maximumY: 1, pointCount: segments.reduce((sum, points) => sum + points.length, 0) });
      for (const points of segments) {
        let previous: XY | undefined;
        // Same fine cell grid as the production Path2D cache at this scale.
        forEachGenericXYDisplayPointV1(points, x => x * 512, y => y * 256, current => {
          if (previous) edges.push(...previous, ...current);
          previous = current;
        });
      }
    }
    return { geometry: { chunks, minimumX: -1, maximumX: 1, minimumY: -1, maximumY: 1, pointCount: 3000 },
      edges: Float32Array.from(edges), color: [.25 + (trace % 3) * .25, .35 + (trace % 4) * .15, .9 - (trace % 5) * .1] };
  });
}

function canvas(pixelRatio: number): HTMLCanvasElement {
  const result = document.createElement("canvas"); result.width = Math.round(WIDTH * pixelRatio); result.height = Math.round(HEIGHT * pixelRatio);
  result.style.cssText = `width:${WIDTH}px;height:${HEIGHT}px;display:block`; document.body.append(result); return result;
}

function canvas2D(data: Fixture[], pixelRatio: number): Renderer {
  const element = canvas(pixelRatio), context = element.getContext("2d")!;
  const cache = new GenericXYCanvasPathCacheV1();
  return { canvas: element, draw(shift) {
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0); context.clearRect(0, 0, WIDTH, HEIGHT); context.lineWidth = HALF_WIDTH * 2;
    for (const trace of data) {
      const { path } = cache.project(trace.geometry, { scaleX: 260, scaleY: -142.5, offsetX: 330 + shift, offsetY: 177.5, displayScale: 1 });
      context.strokeStyle = `rgb(${trace.color.map(value => value * 255).join(" ")})`; context.stroke(path);
    }
  }, async read() { return new Uint8Array(context.getImageData(0, 0, element.width, element.height).data.buffer); }, dispose() { element.remove(); } };
}

const shaderGL = `#version 300 es
precision highp float;
in vec4 edge;
uniform vec2 offset;
uniform float feather;
out float across;
void main() {
  vec2 a=edge.xy*vec2(260.,-142.5)+offset, b=edge.zw*vec2(260.,-142.5)+offset;
  vec2 direction=normalize(b-a), normal=vec2(-direction.y,direction.x);
  int corner=gl_VertexID;
  bool endPoint=corner==1 || corner==2 || corner==4;
  float side=(corner==0 || corner==1 || corner==3) ? -1. : 1.;
  across=side*(.85+feather);
  vec2 position=(endPoint ? b : a)+normal*across;
  gl_Position=vec4(position/vec2(620.,375.)*vec2(2.,-2.)+vec2(-1.,1.),0.,1.);
}`;
const fragmentGL = `#version 300 es
precision highp float;
in float across;
uniform vec3 color;
uniform float feather;
out vec4 outputColor;
void main() { float coverage=1.-smoothstep(.85-feather,.85+feather,abs(across)); outputColor=vec4(color*coverage,coverage); }`;

function webGL2(data: Fixture[], pixelRatio: number): Renderer | UnavailableRenderer {
  const element = canvas(pixelRatio), gl = element.getContext("webgl2", { alpha: true, antialias: true, premultipliedAlpha: true });
  if (!gl) { element.remove(); return { available: false, reason: "webgl2-context-unavailable" }; }
  const compile = (kind: number, source: string) => {
    const shader = gl.createShader(kind)!; gl.shaderSource(shader, source); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? "WebGL shader compile"); return shader;
  };
  const vertex = compile(gl.VERTEX_SHADER, shaderGL), fragment = compile(gl.FRAGMENT_SHADER, fragmentGL), program = gl.createProgram()!;
  gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? "WebGL link");
  gl.useProgram(program); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  const location = gl.getAttribLocation(program, "edge"), offset = gl.getUniformLocation(program, "offset"), color = gl.getUniformLocation(program, "color");
  const buffers = data.map(trace => { const buffer = gl.createBuffer()!; gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, trace.edges, gl.STATIC_DRAW); return buffer; });
  gl.enableVertexAttribArray(location); gl.vertexAttribDivisor(location, 1);
  gl.uniform1f(gl.getUniformLocation(program, "feather"), .5 / pixelRatio);
  const debug = gl.getExtension("WEBGL_debug_renderer_info");
  const details = { renderer: gl.getParameter(debug ? debug.UNMASKED_RENDERER_WEBGL : gl.RENDERER),
    vendor: gl.getParameter(debug ? debug.UNMASKED_VENDOR_WEBGL : gl.VENDOR), version: gl.getParameter(gl.VERSION),
    contextAttributes: gl.getContextAttributes() };
  return { canvas: element, details, draw(shift) {
    gl.viewport(0, 0, element.width, element.height); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.uniform2f(offset, 330 + shift, 177.5);
    data.forEach((trace, index) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, buffers[index]); gl.vertexAttribPointer(location, 4, gl.FLOAT, false, 16, 0);
      gl.uniform3f(color, ...trace.color); gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, trace.edges.length / 4);
    });
  }, async read() {
    const bytes = new Uint8Array(element.width * element.height * 4); gl.readPixels(0, 0, element.width, element.height, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
    const error = gl.getError(); if (error !== gl.NO_ERROR || gl.isContextLost()) throw new Error(`WebGL render/readback failed: ${error}`);
    // Normalize WebGL's bottom-up row convention for comparison.
    const normalized = new Uint8Array(bytes.length), row = element.width * 4;
    for (let y = 0; y < element.height; y++) normalized.set(bytes.subarray(y * row, (y + 1) * row), (element.height - y - 1) * row);
    return normalized;
  }, dispose() { for (const buffer of buffers) gl.deleteBuffer(buffer); gl.deleteShader(vertex); gl.deleteShader(fragment); gl.deleteProgram(program); element.remove(); } };
}

// WebGPU types are deliberately local to this optional benchmark: the product
// does not acquire a WebGPU dependency or require the API to be available.
async function webGPU(data: Fixture[], pixelRatio: number): Promise<Renderer | UnavailableRenderer> {
  const gpu = (navigator as unknown as { gpu?: any }).gpu;
  if (!gpu) return { available: false, reason: "webgpu-api-unavailable" };
  const adapter = await gpu.requestAdapter(); if (!adapter) return { available: false, reason: "webgpu-request-adapter-returned-null" };
  const device = await adapter.requestDevice(), element = canvas(pixelRatio);
  const context = element.getContext("webgpu" as "2d") as any;
  if (!context) { element.remove(); device.destroy(); return { available: false, reason: "webgpu-context-unavailable" }; }
  const format = gpu.getPreferredCanvasFormat(); context.configure({ device, format, alphaMode: "premultiplied", usage: 16 | 1 });
  const module = device.createShaderModule({ code: `
    struct Uniforms { offset: vec2f, padding: vec2f, color: vec4f }
    @group(0) @binding(0) var<uniform> settings: Uniforms;
    struct Vertex { @builtin(position) position: vec4f, @location(0) across: f32 }
    @vertex fn vertex(@builtin(vertex_index) corner: u32, @location(0) edge: vec4f) -> Vertex {
      let a=edge.xy*vec2f(260.,-142.5)+settings.offset; let b=edge.zw*vec2f(260.,-142.5)+settings.offset;
      let direction=normalize(b-a); let normal=vec2f(-direction.y,direction.x);
      let endPoint=corner==1u || corner==2u || corner==4u;
      let side=select(1.,-1.,corner==0u || corner==1u || corner==3u);
      var result: Vertex; result.across=side*${(HALF_WIDTH + .5 / pixelRatio).toFixed(8)};
      let position=select(a,b,endPoint)+normal*result.across;
      result.position=vec4f(position/vec2f(620.,375.)*vec2f(2.,-2.)+vec2f(-1.,1.),0.,1.); return result;
    }
    @fragment fn fragment(input: Vertex) -> @location(0) vec4f {
      let coverage=1.-smoothstep(${(HALF_WIDTH - .5 / pixelRatio).toFixed(8)},${(HALF_WIDTH + .5 / pixelRatio).toFixed(8)},abs(input.across)); return vec4f(settings.color.rgb*coverage,coverage);
    }` });
  device.pushErrorScope("validation");
  const pipeline = await device.createRenderPipelineAsync({ layout: "auto", vertex: { module, entryPoint: "vertex", buffers: [
    { arrayStride: 16, stepMode: "instance", attributes: [{ shaderLocation: 0, offset: 0, format: "float32x4" }] },
  ] }, fragment: { module, entryPoint: "fragment", targets: [{ format, blend: { color: { srcFactor: "one", dstFactor: "one-minus-src-alpha" }, alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha" } } }] }, primitive: { topology: "triangle-list" } });
  const buffers = data.map(trace => {
    const vertices = device.createBuffer({ size: trace.edges.byteLength, usage: 32 | 8 }); device.queue.writeBuffer(vertices, 0, trace.edges);
    const uniform = device.createBuffer({ size: 32, usage: 64 | 8 });
    const group = device.createBindGroup({ layout: pipeline.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: uniform } }] });
    return { vertices, uniform, group };
  });
  let texture: any;
  const validation = await device.popErrorScope(); if (validation) throw new Error(validation.message);
  device.pushErrorScope("validation");
  const info = adapter.info;
  const details = { format, adapter: info ? { vendor: info.vendor, architecture: info.architecture, device: info.device, description: info.description } : null };
  return { canvas: element, details, draw(shift) {
    const encoder = device.createCommandEncoder(); texture = context.getCurrentTexture();
    const pass = encoder.beginRenderPass({ colorAttachments: [{ view: texture.createView(), clearValue: { r: 0, g: 0, b: 0, a: 0 }, loadOp: "clear", storeOp: "store" }] });
    pass.setPipeline(pipeline);
    data.forEach((trace, index) => {
      const buffer = buffers[index]; device.queue.writeBuffer(buffer.uniform, 0, new Float32Array([330 + shift, 177.5, 0, 0, ...trace.color, 1]));
      pass.setBindGroup(0, buffer.group); pass.setVertexBuffer(0, buffer.vertices); pass.draw(6, trace.edges.length / 4);
    });
    pass.end(); device.queue.submit([encoder.finish()]);
  }, async read() {
    const rowBytes = Math.ceil(element.width * 4 / 256) * 256;
    const readback = device.createBuffer({ size: rowBytes * element.height, usage: 1 | 8 });
    const encoder = device.createCommandEncoder(); encoder.copyTextureToBuffer({ texture }, { buffer: readback, bytesPerRow: rowBytes }, { width: element.width, height: element.height });
    device.queue.submit([encoder.finish()]); await readback.mapAsync(1);
    const mapped = new Uint8Array(readback.getMappedRange()), bytes = new Uint8Array(element.width * element.height * 4);
    for (let row = 0; row < element.height; row++) bytes.set(mapped.subarray(row * rowBytes, row * rowBytes + element.width * 4), row * element.width * 4);
    readback.unmap(); readback.destroy();
    const drawValidation = await device.popErrorScope(); if (drawValidation) throw new Error(drawValidation.message);
    if (format === "bgra8unorm") for (let i = 0; i < bytes.length; i += 4) { const blue = bytes[i]; bytes[i] = bytes[i + 2]; bytes[i + 2] = blue; }
    return bytes;
  }, dispose() { for (const buffer of buffers) { buffer.vertices.destroy(); buffer.uniform.destroy(); } context.unconfigure(); device.destroy(); element.remove(); } };
}

export async function compareXYRenderersV1({ frames, pixelRatio }: { frames: number; pixelRatio: number }) {
  const data = fixtures(), results: Record<string, unknown> = {};
  let reference: Uint8Array | undefined;
  for (const [name, create] of [["canvas2d", canvas2D], ["webgl2", webGL2], ["webgpu", webGPU]] as const) {
    const initializeStarted = performance.now();
    const renderer = await create(data, pixelRatio);
    if ("available" in renderer) { results[name] = renderer; continue; }
    try {
      renderer.draw(0);
      const initializeAndFirstSubmitMs = performance.now() - initializeStarted;
      for (let frame = 0; frame < 30; frame++) { await nextFrame(); renderer.draw(Math.sin(frame / 30) * .2); }
      const submission: number[] = [], intervals: number[] = []; let previous = await nextFrame();
      for (let frame = 0; frame < frames; frame++) {
        const at = await nextFrame(); intervals.push(at - previous); previous = at;
        const started = performance.now(); renderer.draw(Math.sin(frame / 30) * .2); submission.push(performance.now() - started);
      }
      // Read once after hot-loop timing so Canvas readback cannot change its
      // acceleration policy before the measured draw submissions.
      renderer.draw(0);
      const readStarted = performance.now(), bytes = await renderer.read(), completionAndReadbackMs = performance.now() - readStarted;
      let occupied = 0, alphaDifference = 0, union = 0, intersection = 0;
      for (let i = 3; i < bytes.length; i += 4) {
        if (bytes[i] > 0) occupied++;
        if (reference) {
          alphaDifference += Math.abs(bytes[i] - reference[i]);
          if (bytes[i] > 32 || reference[i] > 32) union++;
          if (bytes[i] > 32 && reference[i] > 32) intersection++;
        }
      }
      if (occupied < 100) throw new Error(`${name} rendered an empty image`);
      if (!reference) reference = bytes;
      results[name] = { available: true, details: renderer.details ?? null, initializeAndFirstSubmitMs, completionAndReadbackMs, occupiedPixels: occupied,
        meanAlphaDifferenceFromCanvas: alphaDifference / (bytes.length / 4), alphaMaskIntersectionOverUnion: union ? intersection / union : 1, cpuSubmissionMs: summary(submission), animationCallbackIntervalMs: summary(intervals) };
    } finally { renderer.dispose(); }
  }
  return { schemaId: "circleheart-xy-renderer-comparison-v1", environment: { userAgent: navigator.userAgent, pixelRatio, width: WIDTH, height: HEIGHT, secureContext: isSecureContext, webgpuApi: "gpu" in navigator },
    workload: { traces: data.length, sourcePointsPerTrace: 3000, retainedSegments: data.reduce((sum, trace) => sum + trace.edges.length / 4, 0), frames,
      description: "same retained paired geometry, small affine changes; excludes live data preparation, transport, React, and numerical work",
      quality: "Canvas uses native joins; GPU prototypes use antialiased segment quads with butt caps, so join pixels are intentionally reported, not assumed identical" },
    timing: { cpuSubmissionMs: "JavaScript submission only, not completed GPU work", animationCallbackIntervalMs: "rAF callback spacing, not presented FPS",
      completionAndReadbackMs: "one final completion plus full image readback; not a pure GPU duration and not part of the timed hot loop" }, results };
}
