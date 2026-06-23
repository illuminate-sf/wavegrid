/**
 * QuickJS sandbox engine: loads an (untrusted) pattern, runs render() per frame
 * under CPU-deadline + memory limits, returns the framebuffer to the host.
 */

import type { QuickJSContext, QuickJSHandle, QuickJSRuntime, QuickJSWASMModule } from 'quickjs-emscripten';
import { getQuickJS } from 'quickjs-emscripten';

import { generatePrelude } from './prelude';
import { DEFAULT_ENGINE_CONFIG, DEFAULT_GRID_CONFIG, EngineConfig, GridConfig, PatternMeta } from './types';

/** Strip `export` keywords so the code runs as a plain script in the sandbox. */
function stripExports(code: string): string {
  return code.replace(
    /\bexport\s+(?=(?:default\s+)?(?:async\s+)?(?:function|const|let|var|class)\b)/g,
    ''
  );
}

export interface PatternEngine {
  /** Load a pattern from JS source. Returns the pattern's metadata. */
  loadPattern(code: string, initialParams?: Record<string, unknown>): PatternMeta;
  /** Update a single parameter. Calls onParam() if the pattern defines it. */
  setParam(name: string, value: unknown): void;
  /** Render one frame. Returns the RGB framebuffer or null if not loaded. */
  renderFrame(t: number, dt: number, frame: number, bpm: number): number[] | null;
  /** Dispose the sandbox runtime (frees WASM memory). */
  dispose(): void;
  /** The loaded pattern's metadata. */
  readonly meta: PatternMeta;
  /** Whether a pattern is currently loaded and ready to render. */
  readonly loaded: boolean;
}

export interface CreateEngineOptions {
  /** Callback for pattern console.log() output. */
  onLog?: (msg: string) => void;
  /** Engine resource limits. */
  config?: Partial<EngineConfig>;
  /** Grid dimensions. */
  grid?: Partial<GridConfig>;
}

/**
 * Create a new pattern engine backed by a QuickJS sandbox.
 * Call this once; reuse the returned engine for multiple pattern loads.
 */
export async function createEngine(opts: CreateEngineOptions = {}): Promise<PatternEngine> {
  const QuickJS: QuickJSWASMModule = await getQuickJS();
  const cfg: EngineConfig = { ...DEFAULT_ENGINE_CONFIG, ...opts.config };
  const gridCfg: GridConfig = {
    ...DEFAULT_GRID_CONFIG,
    ...opts.grid
  };
  // Ensure count is consistent
  gridCfg.count = gridCfg.cols * gridCfg.rows;

  const PRELUDE = generatePrelude(gridCfg);

  let runtime: QuickJSRuntime | null = null;
  let vm: QuickJSContext | null = null;
  let deadline = 0;
  let _meta: PatternMeta = {};
  let params: Record<string, unknown> = {};
  let _loaded = false;

  const log = (m: string) => {
    try { if (opts.onLog) opts.onLog(m); } catch { /* ignore */ }
  };

  function evalVoid(code: string, budget: number): void {
    if (!vm) throw new Error('VM not initialized');
    deadline = Date.now() + budget;
    const h: QuickJSHandle = vm.unwrapResult(vm.evalCode(code));
    h.dispose();
  }

  function evalVal(code: string, budget: number): unknown {
    if (!vm) throw new Error('VM not initialized');
    deadline = Date.now() + budget;
    const h: QuickJSHandle = vm.unwrapResult(vm.evalCode(code));
    const v = vm.dump(h);
    h.dispose();
    return v;
  }

  function setGlobalStr(name: string, s: string): void {
    if (!vm) return;
    const h = vm.newString(s);
    vm.setProp(vm.global, name, h);
    h.dispose();
  }

  function dispose(): void {
    try { if (vm) vm.dispose(); } catch { /* ignore */ }
    try { if (runtime) runtime.dispose(); } catch { /* ignore */ }
    vm = null;
    runtime = null;
    _loaded = false;
  }

  function applyParams(): void {
    setGlobalStr('__paramsJSON', JSON.stringify(params));
    evalVoid('__setParams(__paramsJSON)', 500);
  }

  function loadPattern(code: string, initialParams: Record<string, unknown> = {}): PatternMeta {
    dispose();
    runtime = QuickJS.newRuntime();
    runtime.setMemoryLimit(cfg.memLimit);
    runtime.setMaxStackSize(cfg.stackLimit);
    runtime.setInterruptHandler(() => Date.now() > deadline);
    vm = runtime.newContext();

    // Expose __log to the sandbox
    const logFn = vm.newFunction('__log', (h) => {
      log(vm!.getString(h));
    });
    vm.setProp(vm.global, '__log', logFn);
    logFn.dispose();

    // Evaluate prelude
    evalVoid(PRELUDE, cfg.loadBudgetMs);

    // Wrap user code: strip exports, capture pattern entry points
    const wrapped = stripExports(code) +
      '\n;__pattern={meta:(typeof meta!=="undefined"?meta:{}),render:(typeof render!=="undefined"?render:null),' +
      'init:(typeof init!=="undefined"?init:null),cleanup:(typeof cleanup!=="undefined"?cleanup:null),' +
      'onParam:(typeof onParam!=="undefined"?onParam:null)};';
    evalVoid(wrapped, cfg.loadBudgetMs);

    // Extract metadata
    _meta = JSON.parse(
      (evalVal('JSON.stringify(__pattern.meta||{})', cfg.loadBudgetMs) as string) || '{}'
    );

    // Verify render function exists
    const hasRender = evalVal('!!(__pattern && __pattern.render)', cfg.loadBudgetMs);
    if (!hasRender) throw new Error('pattern has no render(ctx)');

    // Initialize params from metadata defaults + overrides
    params = {};
    const ps = _meta.params || {};
    for (const k in ps) params[k] = ps[k].default;
    Object.assign(params, initialParams);
    applyParams();

    // Reset state and call init()
    evalVoid('__resetState(); __runInit();', cfg.loadBudgetMs);
    _loaded = true;
    return _meta;
  }

  function setParam(name: string, value: unknown): void {
    if (!_loaded) return;
    params[name] = value;
    applyParams();
    setGlobalStr('__pName', String(name));
    setGlobalStr('__pVal', JSON.stringify(value));
    try {
      evalVoid('__runParam(__pName, JSON.parse(__pVal))', 500);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      log('onParam error: ' + msg);
    }
  }

  function renderFrame(t: number, dt: number, frame: number, bpm: number): number[] | null {
    if (!_loaded) return null;
    try {
      evalVoid(
        `__setTime(${+t},${+dt},${frame | 0},${+bpm}); __runRender();`,
        cfg.renderBudgetMs
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      log('render error: ' + msg);
      // keep partial frame
    }
    try {
      const raw = evalVal('__fbJSON()', cfg.renderBudgetMs);
      return JSON.parse(raw as string);
    } catch {
      return null;
    }
  }

  return {
    loadPattern,
    setParam,
    renderFrame,
    dispose,
    get meta() { return _meta; },
    get loaded() { return _loaded; }
  };
}
