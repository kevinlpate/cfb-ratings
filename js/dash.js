/* Minimal stand-in for the Claude dashboard runtime, for the public site (college football).
   Datasets are CSV files in data/, loaded on first read (dash.data) or when a [data-source] names them.
   dash.draw(name, fn) registers a renderer for every element with data-draw="name"; renderers re-run when data
   arrives or params change. dash.params/setParams keep the tab/team/conference choices (and the URL hash). */
(function () {
  const store = {}, cbs = [], calcs = {}, draws = {};
  const base = 'data/';
  let ver = '', params = {};
  function runDraw(name) {
    const fn = draws[name]; if (!fn) return;
    document.querySelectorAll('[data-draw="' + name + '"]').forEach(el => { try { fn(el); } catch (e) { console.error(name, e); } });
  }
  function fire() {
    for (const fn of cbs) { try { fn(); } catch (e) { console.error(e); } }
    Object.keys(draws).forEach(runDraw);
  }
  function load(id) {
    if (calcs[id] || store[id]) return;
    store[id] = { status: 'loading', data: [], columns: [] };
    fetch(base + id + '.csv' + (ver ? '?v=' + ver : ''), { cache: 'no-cache' })
      .then(r => { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(t => { const rows = d3.csvParse(t); store[id] = { status: 'ok', data: rows, columns: rows.columns }; fire(); })
      .catch(e => { store[id] = { status: 'error', data: [], columns: [], message: String(e) }; fire(); });
  }
  function calcValue(id) {
    const c = calcs[id]; const ins = c.inputs.map(i => window.dash.data(i));
    if (ins.some(x => x.status !== 'ok')) return { status: ins.some(x => x.status === 'error') ? 'error' : 'loading', data: [] };
    try { return { status: 'ok', data: c.fn(...ins.map(x => x.data)) }; } catch (e) { return { status: 'error', data: [], message: String(e) }; }
  }
  window.dash = {
    data(id) { if (calcs[id]) return calcValue(id); load(id); return store[id]; },
    onData(fn) { cbs.push(fn); try { fn(); } catch (e) { console.error(e); } },
    calc(id, spec) { calcs[id] = spec; },
    draw(name, fn) { if (fn) draws[name] = fn; runDraw(name); },
    params() { return params; },
    setParams(p) { for (const k in p) { if (p[k] == null) delete params[k]; else params[k] = p[k]; } fire(); },
    resetParams() { params = {}; fire(); },
    setLink(h) { try { history.replaceState(null, '', '#' + h); } catch (e) {} },
    colors: ['#2f6fdd', '#d9822b', '#2a9d8f', '#8e5bd0', '#c0392b', '#6b6f76'],
    loader() {}, refresh() {},
    _start(v) {
      ver = v || '';
      const ids = new Set();
      document.querySelectorAll('[data-source]').forEach(el => el.dataset.source.split(/\s+/).forEach(s => s && ids.add(s)));
      ids.forEach(id => { if (!calcs[id]) load(id); });
      fire();
      let t; window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(fire, 150); });
    }
  };
})();
