// QuickJS sandbox engine: loads an (untrusted) pattern, runs render() per frame
// under CPU-deadline + memory limits, returns the framebuffer to the host.
import { getQuickJS } from 'quickjs-emscripten';
import { readFileSync } from 'node:fs';

const PRELUDE = readFileSync(new URL('./sandbox-prelude.js', import.meta.url), 'utf8');
const stripExports = c => c.replace(/\bexport\s+(?=(?:default\s+)?(?:async\s+)?(?:function|const|let|var|class)\b)/g, '');

export async function createEngine({ onLog, config = {} } = {}) {
  const QuickJS = await getQuickJS();
  const cfg = { memLimit: 64 * 1024 * 1024, stackLimit: 512 * 1024, renderBudgetMs: 6, loadBudgetMs: 2000, ...config };

  let runtime = null, vm = null, deadline = 0, meta = {}, params = {}, loaded = false;
  const log = m => { try { onLog && onLog(m); } catch {} };

  const evalVoid = (code, budget) => { deadline = Date.now() + budget; vm.unwrapResult(vm.evalCode(code)).dispose(); };
  const evalVal  = (code, budget) => { deadline = Date.now() + budget; const h = vm.unwrapResult(vm.evalCode(code)); const v = vm.dump(h); h.dispose(); return v; };
  const setGlobalStr = (name, s) => { const h = vm.newString(s); vm.setProp(vm.global, name, h); h.dispose(); };

  function dispose() { try { vm && vm.dispose(); } catch {} try { runtime && runtime.dispose(); } catch {} vm = null; runtime = null; loaded = false; }

  function applyParams() {
    setGlobalStr('__paramsJSON', JSON.stringify(params));
    evalVoid('__setParams(__paramsJSON)', 500);
  }

  function loadPattern(code, initialParams = {}) {
    dispose();
    runtime = QuickJS.newRuntime();
    runtime.setMemoryLimit(cfg.memLimit);
    runtime.setMaxStackSize(cfg.stackLimit);
    runtime.setInterruptHandler(() => Date.now() > deadline);
    vm = runtime.newContext();

    const logFn = vm.newFunction('__log', h => log(vm.getString(h)));
    vm.setProp(vm.global, '__log', logFn); logFn.dispose();

    evalVoid(PRELUDE, cfg.loadBudgetMs);

    const wrapped = stripExports(code) +
      '\n;__pattern={meta:(typeof meta!=="undefined"?meta:{}),render:(typeof render!=="undefined"?render:null),' +
      'init:(typeof init!=="undefined"?init:null),cleanup:(typeof cleanup!=="undefined"?cleanup:null),' +
      'onParam:(typeof onParam!=="undefined"?onParam:null)};';
    evalVoid(wrapped, cfg.loadBudgetMs);

    meta = JSON.parse(evalVal('JSON.stringify(__pattern.meta||{})', cfg.loadBudgetMs) || '{}');
    const hasRender = evalVal('!!(__pattern && __pattern.render)', cfg.loadBudgetMs);
    if (!hasRender) throw new Error('pattern has no render(ctx)');

    params = {};
    const ps = meta.params || {};
    for (const k in ps) params[k] = ps[k].default;
    Object.assign(params, initialParams || {});
    applyParams();

    evalVoid('__resetState(); __runInit();', cfg.loadBudgetMs);
    loaded = true;
    return meta;
  }

  function setParam(name, value) {
    if (!loaded) return;
    params[name] = value;
    applyParams();
    setGlobalStr('__pName', String(name));
    setGlobalStr('__pVal', JSON.stringify(value));
    try { evalVoid('__runParam(__pName, JSON.parse(__pVal))', 500); } catch (e) { log('onParam error: ' + (e?.message || e)); }
  }

  function renderFrame(t, dt, frame, bpm) {
    if (!loaded) return null;
    try { evalVoid(`__setTime(${+t},${+dt},${frame | 0},${+bpm}); __runRender();`, cfg.renderBudgetMs); }
    catch (e) { log('render error: ' + (e?.message || e)); /* keep partial frame */ }
    try { return JSON.parse(evalVal('__fbJSON()', cfg.renderBudgetMs)); }
    catch { return null; }
  }

  return { loadPattern, setParam, renderFrame, dispose, get meta() { return meta; }, get loaded() { return loaded; } };
}
