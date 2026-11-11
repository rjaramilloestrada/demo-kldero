/* Kldero Steak Club (demo). Todo el contenido sale de data.json. */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePtr = matchMedia('(hover: hover) and (pointer: fine)');

  const SVGNS = 'http://www.w3.org/2000/svg';
  const h = (tag, attrs = {}, ...kids) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat()) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(c));
    return el;
  };
  const icon = (id, cls) => {
    const s = document.createElementNS(SVGNS, 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('aria-hidden', 'true');
    if (cls) s.setAttribute('class', cls);
    const u = document.createElementNS(SVGNS, 'use');
    u.setAttribute('href', '#' + id);
    s.append(u);
    return s;
  };
  /* Titulares con una palabra en script: ["Para dos,", "y sobra"] */
  const setTitle = (el, parts) => {
    if (!el || !parts || !parts.length) return;
    el.textContent = '';
    if (parts.length === 1) { el.textContent = parts[0]; return; }
    const last = parts[parts.length - 1];
    el.append(parts.slice(0, -1).join(' ') + ' ', h('span', { class: 'script' }, last));
  };
  const setText = (sel, v) => { const el = $(sel); if (el && v != null) el.textContent = v; return el; };
  const G = () => (!reduced && window.gsap) || null;

  let D = null;
  let sim = null; /* null = hoy real; 2 = martes; 6 = sábado */

  /* ---------- Formato ---------- */
  const money = n => '$' + n.toFixed(2);
  const pad2 = n => String(n).padStart(2, '0');
  const fmtPhone = n => /^593\d{9}$/.test(n) ? `0${n.slice(3, 5)} ${n.slice(5, 8)} ${n.slice(8)}` : '+' + n;
  const hourLabel = x => (x >= 24 ? '00:00' : pad2(x) + ':00');

  /* ---------- WhatsApp ---------- */
  const waLink = text => `https://wa.me/${D.whatsapp}?text=${encodeURIComponent(text)}`;
  const waText = key => (D.mensajes && D.mensajes[key]) || (D.mensajes && D.mensajes.general) || 'Hola';
  function bindWa(scope = document) {
    $$('[data-wa]', scope).forEach(a => { a.href = waLink(waText(a.dataset.wa)); });
  }

  /* ---------- Medición (sin IDs no se inyecta ningún script) ---------- */
  const M = { fb: false, ga: false };
  function initMedicion() {
    const m = D.medicion || {};
    const pid = String(m.meta_pixel_id || '').trim();
    const gid = String(m.ga4_id || '').trim();
    if (/^\d{5,20}$/.test(pid)) {
      (function (f, b, e, v, n, t, s) {
        if (f.fbq) return;
        n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
        if (!f._fbq) f._fbq = n;
        n.push = n; n.loaded = true; n.version = '2.0'; n.queue = [];
        t = b.createElement(e); t.async = true; t.src = v;
        s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
      })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
      window.fbq('init', pid);
      window.fbq('track', 'PageView');
      M.fb = true;
    }
    if (/^G-[A-Z0-9]{4,20}$/.test(gid)) {
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag('js', new Date());
      window.gtag('config', gid);
      const s = document.createElement('script');
      s.async = true;
      s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(gid);
      document.head.append(s);
      M.ga = true;
    }
  }
  /* whatsapp_click, add_to_cart, order_send, reservation_send */
  function track(name, params = {}) {
    try {
      if (M.fb && window.fbq) {
        const std = { whatsapp_click: 'Contact', add_to_cart: 'AddToCart', order_send: 'Lead', reservation_send: 'Lead' }[name];
        if (std) window.fbq('track', std, params); else window.fbq('trackCustom', name, params);
      }
      if (M.ga && window.gtag) window.gtag('event', name, params);
    } catch (e) { /* la medición nunca rompe la página */ }
  }

  /* ---------- Hora de Guayaquil (y simulador del demo) ---------- */
  function nowGye() {
    if (sim !== null) return { d: sim, h: 19, m: 0 };
    const f = new Intl.DateTimeFormat('en-US', { timeZone: D.zona_horaria || 'America/Guayaquil', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date());
    const o = {};
    f.forEach(p => { o[p.type] = p.value; });
    const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return { d: map[o.weekday], h: parseInt(o.hour, 10) % 24, m: parseInt(o.minute, 10) };
  }
  const dayInfo = d => D.horario.find(x => x.dias.includes(d)) || D.horario[0];
  function statusNow() {
    const t = nowGye();
    const i = dayInfo(t.d);
    const mins = t.h * 60 + t.m;
    if (mins >= i.abre * 60 && mins < i.cierra * 60) return { on: true, txt: 'Abierto ahora · cierra ' + hourLabel(i.cierra) };
    if (mins < i.abre * 60) return { on: false, txt: 'Cerrado · abre hoy ' + hourLabel(i.abre) };
    return { on: false, txt: 'Cerrado · abre mañana ' + hourLabel(dayInfo((t.d + 1) % 7).abre) };
  }
  const isMartes = () => nowGye().d === D.martes_loco.dia;

  /* ---------- Render: demo, marca, cabecera ---------- */
  function applyBrand() {
    const c = (D.marca && D.marca.colores) || {};
    const map = { carbon: '--coal', brasa_oscura: '--char', pizarra: '--slate', oro: '--gold', oro_claro: '--gold-hi', brasa: '--ember', hueso: '--bone', humo: '--mute' };
    for (const [k, v] of Object.entries(map)) if (c[k] && /^#[0-9a-f]{3,8}$/i.test(c[k])) root.style.setProperty(v, c[k]);
  }
  function renderDemo() {
    const d = D.demo || {};
    const bar = $('[data-demo-bar]');
    if (d.banner === false) { bar.hidden = true; }
    else if (d.texto) { setText('[data-demo-text]', d.texto); setText('[data-demo-text-foot]', d.texto); }
    if (d.simulador) setText('[data-sim-label]', d.simulador);
    if (d.noindex === false) { const r = $('meta[name="robots"]'); if (r) r.content = 'index, follow'; }
  }

  function sealSVG() {
    const txt = ((D.hero.sello || []).join(' · ') + ' · ').toUpperCase();
    const n = D.locales.length;
    return '<svg viewBox="0 0 100 100" focusable="false"><circle cx="50" cy="50" r="49" class="seal__bg"/>' +
      '<g class="seal__ring" data-seal-ring><defs><path id="sealp" d="M50 50m-37 0a37 37 0 1 1 74 0a37 37 0 1 1-74 0"/></defs>' +
      `<text><textPath href="#sealp" textLength="228" lengthAdjust="spacing">${txt}</textPath></text></g>` +
      `<text class="seal__n" x="50" y="59" text-anchor="middle">${n}</text><text class="seal__d" x="50" y="71" text-anchor="middle">LOCALES</text></svg>`;
  }
  function renderHero() {
    const hh = D.hero;
    const t = $('[data-hero-title]');
    if (hh.titulo && hh.titulo.length === 2) {
      t.textContent = '';
      t.append(h('span', { class: 'ht ht--a' }, hh.titulo[0]), ' ', h('span', { class: 'ht ht--b' }, hh.titulo[1]));
    }
    t.setAttribute('aria-label', (hh.titulo || []).join(' '));
    setText('[data-hero-script]', hh.script);
    setText('[data-hero-lead]', hh.texto);
    $('[data-seal]').innerHTML = sealSVG();
    const note = (D.marca && D.marca.ilustracion_nota) || 'Ilustración referencial';
    $$('[data-ph-note]').forEach(n => { n.textContent = note; });
    paintStatus();
  }
  function paintStatus() {
    const s = statusNow();
    setText('[data-status-txt]', s.txt);
    $('[data-status] .dot').className = 'dot' + (s.on ? ' on' : '');
    const mb = $('[data-martes-banner]');
    const on = isMartes();
    mb.hidden = !on;
    if (on) setText('[data-martes-text]', D.martes_loco.texto_corto);
  }

  function renderAtajos() {
    const ul = $('[data-atajos]');
    ul.textContent = '';
    D.atajos.forEach((a, i) => {
      ul.append(h('li', {}, h('a', { class: 'atajo magnetic', href: '#' + a.destino, 'data-go': a.destino },
        h('span', { class: 'atajo__n', 'aria-hidden': 'true' }, pad2(i + 1)),
        h('span', { class: 'atajo__t' }, a.etiqueta),
        h('small', {}, a.detalle),
        icon('i-arrow', 'atajo__ar'))));
    });
  }
  function renderMarquee() {
    const track = $('[data-marq]');
    track.textContent = '';
    for (let c = 0; c < 2; c++) {
      const g = h('div', { class: 'marq__g' });
      D.marquee.forEach(t => g.append(h('span', { class: 'marq__it' }, t, icon('i-star'))));
      track.append(g);
    }
  }

  /* ---------- Escena Crudo, sellado, servido ---------- */
  function renderEscena() {
    const e = D.escena;
    setText('[data-escena-eyebrow]', e.eyebrow);
    setText('[data-escena-titulo]', e.titulo);
    const steps = $('[data-steps]');
    const dots = $('[data-sdots]');
    steps.textContent = ''; dots.textContent = '';
    e.pasos.forEach((p, i) => {
      steps.append(h('div', { class: 'step' + (i === 0 ? ' on' : ''), 'data-i': i },
        h('span', { class: 'num' }, p.num), h('h3', {}, p.titulo), h('p', {}, p.texto)));
      dots.append(h('li', i === 0 ? { 'aria-current': 'step' } : {}, p.titulo));
    });
  }
  /* Versión estática (movimiento reducido o sin GSAP): los tres estados en tira */
  let staticDone = false;
  function renderStatic() {
    if (staticDone) return;
    staticDone = true;
    const box = $('[data-static]');
    const src = $('[data-scene-svg]');
    const e = D.escena;
    const wrap = h('div', { class: 'wrap' },
      h('div', { class: 'head' }, h('p', { class: 'eyebrow' }, e.eyebrow), h('h2', { class: 'h2' }, 'Crudo, ', h('span', { class: 'script' }, 'sellado, servido'))));
    const strip = h('div', { class: 'strip' });
    e.pasos.forEach((p, i) => {
      const fig = h('figure', { class: 'strip__f strip__f--' + i });
      const s = document.createElementNS(SVGNS, 'svg');
      s.setAttribute('viewBox', '0 0 440 340');
      s.setAttribute('aria-hidden', 'true');
      s.innerHTML = src.innerHTML;
      fig.append(s, h('figcaption', {}, h('span', { class: 'num' }, p.num), h('b', { class: 'step-t' }, p.titulo), h('span', {}, p.texto)));
      strip.append(fig);
    });
    wrap.append(strip, h('p', { class: 'note' }, (D.marca && D.marca.ilustracion_nota) || 'Ilustración referencial'));
    box.textContent = '';
    box.append(wrap);
  }

  /* ---------- Promos y carrito ---------- */
  const promoById = id => D.promos.find(p => p.id === id);
  const catById = id => D.carta.categorias.find(c => c.id === id);
  function priceHTML(n) {
    const w = Math.floor(n), c = Math.round((n - w) * 100);
    return `<sup>$</sup>${w}<span class="cents">.${pad2(c)}</span>`;
  }
  function renderPromos() {
    const ps = D.promos_seccion;
    setText('[data-promos-eyebrow]', ps.eyebrow);
    setTitle($('[data-promos-titulo]'), ps.titulo);
    setText('[data-promos-lead]', ps.lead);
    setText('[data-promos-nota]', ps.nota);
    const box = $('[data-promos]');
    box.textContent = '';
    const track = h('div', { class: 'ptrack', 'data-ptrack': '', role: 'group', 'aria-label': 'Promos vigentes', tabindex: '0' });
    D.promos.forEach(p => {
      track.append(h('article', { class: 'promo', 'data-spot': '' },
        h('div', { class: 'art' }, (() => {
          const s = document.createElementNS(SVGNS, 'svg');
          s.setAttribute('viewBox', '0 0 440 340'); s.setAttribute('aria-hidden', 'true');
          const u = document.createElementNS(SVGNS, 'use'); u.setAttribute('href', 'assets/promos.svg#' + p.arte); s.append(u); return s;
        })()),
        h('span', { class: 'what' }, p.que),
        h('h3', { class: 'name' }, p.nombre),
        h('span', { class: 'cond' + (p.solo_efectivo ? ' cond--cash' : '') }, p.condicion),
        h('div', { class: 'price', html: priceHTML(p.precio) }),
        h('button', { class: 'btn btn--gold btn--sm magnetic', type: 'button', 'data-addp': p.id }, 'Pedir esta promo')));
    });
    const dots = h('div', { class: 'pdots', role: 'group', 'aria-label': 'Elegir promo' });
    D.promos.forEach((p, i) => dots.append(h('button', { type: 'button', 'data-pi': i, 'aria-label': `Promo ${i + 1} de ${D.promos.length}: ${p.nombre}`, 'aria-current': String(i === 0) })));
    const m = D.martes_loco;
    const hot = isMartes();
    const martes = h('article', { class: 'promo martes' + (hot ? ' hot' : ''), 'data-spot': '' },
      hot ? h('span', { class: 'flag' }, 'Hoy') : null,
      h('div', { class: 'martes__t' }, h('span', { class: 'what' }, m.etiqueta), h('h3', { class: 'name' }, m.titulo), h('p', { class: 'lead' }, m.texto)),
      h('div', { class: 'price price--x' }, '2x1'),
      h('button', { class: 'btn ' + (hot ? 'btn--fire' : 'btn--ghost') + ' magnetic', type: 'button', 'data-addm': '1' }, hot ? m.boton_hoy : m.boton_otro_dia));
    box.append(track, dots, martes);
    bindCarousel();
  }
  let cio = null;
  function bindCarousel() {
    if (cio) cio.disconnect();
    const cards = $$('[data-ptrack] .promo');
    const dots = $$('.pdots button');
    const r = {};
    cio = new IntersectionObserver(es => {
      es.forEach(en => { r[cards.indexOf(en.target)] = en.intersectionRatio; });
      let b = 0, bv = -1;
      cards.forEach((c, i) => { if ((r[i] || 0) > bv) { bv = r[i] || 0; b = i; } });
      dots.forEach((d, i) => d.setAttribute('aria-current', String(i === b)));
    }, { threshold: [0, .25, .5, .75, 1], root: $('[data-ptrack]') });
    cards.forEach(c => cio.observe(c));
  }

  /* Carrito */
  const cart = {};
  function itemById(key) {
    if (key.startsWith('p-')) { const p = promoById(key); return { name: 'Promo: ' + p.nombre, short: p.nombre, price: p.precio, cash: !!p.solo_efectivo }; }
    if (key === 'martes') return { name: D.martes_loco.linea_pedido, short: D.martes_loco.titulo, price: 0, cash: false };
    const [cid, i] = key.split('|');
    const it = catById(cid).items[+i];
    return { name: it.nombre, short: it.nombre, price: it.precio, cash: false };
  }
  const cartKeys = () => Object.keys(cart).filter(k => cart[k] > 0);
  function totals() {
    let n = 0, t = 0;
    cartKeys().forEach(k => { n += cart[k]; t += cart[k] * itemById(k).price; });
    return { n, t };
  }
  let toastT = null;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = '';
    setTimeout(() => { t.textContent = msg; t.classList.add('show'); }, 30);
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('show'), 2200);
  }
  function bump() {
    $$('[data-fab-n], [data-dock-n], [data-cart-count]').forEach(e => { e.classList.remove('bump'); void e.offsetWidth; e.classList.add('bump'); });
  }
  function addToCart(key, el, quiet) {
    cart[key] = (cart[key] || 0) + 1;
    paintCart();
    if (el) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
    bump();
    if (!quiet) toast('Agregado: ' + itemById(key).short);
    track('add_to_cart', { item: itemById(key).short });
  }
  const payValue = () => ($('input[name="pay"]:checked') || {}).value || 'Efectivo';
  function orderMessage() {
    const keys = cartKeys();
    const tt = totals();
    const lines = keys.map(k => { const it = itemById(k); return `• ${cart[k]} x ${it.name}` + (it.price ? ` (${money(it.price * cart[k])})` : ''); });
    const loc = D.locales.find(l => l.id === $('#cl').value);
    const cashConflict = keys.some(k => itemById(k).cash) && payValue() === 'Transferencia';
    return D.mensajes.pedido_intro + '\n\n' + (lines.join('\n') || '(sin platos)') +
      `\n\nTotal aproximado: ${money(tt.t)} (sin envío)\nNombre: ${$('#cn').value || '(por completar)'}\nDirección: ${$('#ca').value || '(por completar)'}\nLocal más cercano: ${loc ? loc.nombre : ''}\nForma de pago: ${payValue()}` +
      (cashConflict ? '\nNota: la promo de panceta crujiente aplica solo en efectivo.' : '');
  }
  function paintCart() {
    const tt = totals();
    const keys = cartKeys();
    const fab = $('#fab');
    fab.classList.toggle('show', tt.n > 0);
    setText('[data-fab-n]', tt.n); setText('[data-fab-t]', money(tt.t));
    setText('[data-dock-n]', tt.n);
    $('[data-dock-n]').classList.toggle('show', tt.n > 0);
    setText('[data-dock-total]', tt.n > 0 ? ' · ' + money(tt.t) : '');
    $('#dockPedir').setAttribute('aria-label', tt.n > 0 ? `Pedir, ${tt.n} en el pedido, ${money(tt.t)}` : 'Pedir');
    const cc = $('[data-cart-count]');
    cc.textContent = tt.n; cc.hidden = tt.n === 0;
    setText('[data-obar-txt]', tt.n > 0 ? `Tu pedido: ${tt.n} ${tt.n === 1 ? 'producto' : 'productos'} · ${money(tt.t)}` : 'Tu pedido está vacío. Agrega promos o platos de la carta.');
    setText('[data-cart-total]', money(tt.t));
    const body = $('[data-cart-body]');
    body.textContent = '';
    if (!keys.length) body.append(h('div', { class: 'empty' }, 'Tu pedido está vacío. Agrega promos o platos de la carta.'));
    keys.forEach(k => {
      const it = itemById(k);
      body.append(h('div', { class: 'row' },
        h('b', {}, it.name), h('span', {}, it.price ? money(it.price * cart[k]) : ''),
        h('div', { class: 'qty' },
          h('button', { type: 'button', 'data-qk': k, 'data-qd': '-1', 'aria-label': 'Quitar uno de ' + it.short }, '−'),
          h('span', {}, String(cart[k])),
          h('button', { type: 'button', 'data-qk': k, 'data-qd': '1', 'aria-label': 'Agregar uno de ' + it.short }, '+'))));
    });
    const cash = keys.some(k => itemById(k).cash) && payValue() === 'Transferencia';
    $('[data-cash-warn]').hidden = !cash;
    const a = $('[data-send-wa]');
    a.href = waLink(orderMessage());
    a.setAttribute('aria-disabled', String(tt.n === 0));
  }

  const lastFocus = { el: null };
  const isOpen = () => $('#drawer').classList.contains('open');
  const INERT = ['.chrome', 'main', '.foot', '[data-dock]', '#fab'];
  function setInert(on) { INERT.forEach(s => $$(s).forEach(el => { if (on) el.setAttribute('inert', ''); else el.removeAttribute('inert'); })); }
  function openCart() {
    if (isOpen()) return;
    lastFocus.el = document.activeElement;
    paintCart();
    const d = $('#drawer');
    d.classList.add('open'); $('#veil').classList.add('open');
    d.setAttribute('aria-hidden', 'false');
    document.body.classList.add('drawer-open');
    setInert(true);
    if (window.__lenis) window.__lenis.stop();
    $('[data-close-cart]').focus();
  }
  function closeCart() {
    if (!isOpen()) return;
    const d = $('#drawer');
    d.classList.remove('open'); $('#veil').classList.remove('open');
    d.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('drawer-open');
    setInert(false);
    if (window.__lenis) window.__lenis.start();
    const f = lastFocus.el;
    if (f && document.contains(f) && f.offsetParent !== null) f.focus();
    else { const fab = $('#fab'); if (fab.classList.contains('show')) fab.focus(); }
    lastFocus.el = null;
  }

  /* ---------- Carta ---------- */
  let curTab = 'res';
  function renderCartaHead() {
    const c = D.carta;
    setText('[data-carta-eyebrow]', c.eyebrow);
    setTitle($('[data-carta-titulo]'), c.titulo);
    setText('[data-carta-lead]', c.lead);
    const flagged = c.categorias.some(cat => cat.items.some(i => i.estado === 'por_confirmar'));
    setText('[data-carta-nota]', c.nota + (flagged && c.nota_por_confirmar ? ' ' + c.nota_por_confirmar : ''));
    const st = $('[data-carta-stamp]');
    st.hidden = c.estado !== 'provisional';
  }
  function renderTabs() {
    const tabs = $('[data-tabs]');
    tabs.textContent = '';
    D.carta.categorias.forEach(c => {
      const on = c.id === curTab;
      tabs.append(h('button', { class: 'tab', role: 'tab', type: 'button', id: 'tab-' + c.id, 'data-k': c.id, 'aria-selected': String(on), 'aria-controls': 'carta-panel', tabindex: on ? '0' : '-1' }, c.nombre));
    });
    const p = $('[data-carta-grid]');
    p.id = 'carta-panel';
    p.setAttribute('aria-labelledby', 'tab-' + curTab);
  }
  function renderCarta() {
    const c = catById(curTab);
    const grid = $('[data-carta-grid]');
    grid.textContent = '';
    c.items.forEach((it, i) => {
      grid.append(h('div', { class: 'item', style: `--i:${i}` },
        h('h3', {}, it.nombre, it.estado === 'por_confirmar' ? h('span', { class: 'pc', title: 'Nombre o precio por confirmar con Kldero' }, 'por confirmar') : null),
        h('span', { class: 'pr' }, money(it.precio)),
        h('span', { class: 'd' }, it.desc || ''),
        h('button', { class: 'add', type: 'button', 'aria-label': 'Agregar ' + it.nombre, 'data-add': `${c.id}|${i}` }, '+')));
    });
  }
  function vt(fn) {
    if (document.startViewTransition && !reduced) { try { document.startViewTransition(fn); return; } catch (e) { /* sigue */ } }
    fn();
  }
  function selectTab(k, focus) {
    curTab = k;
    vt(() => {
      renderTabs(); renderCarta();
      if (focus) { const b = $('#tab-' + k); b.focus(); b.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
    });
  }

  /* ---------- Locales ---------- */
  let curLoc = null;
  function renderLocales() {
    const ls = D.locales_seccion;
    setText('[data-locales-eyebrow]', ls.eyebrow);
    setTitle($('[data-locales-titulo]'), ls.titulo);
    if (!curLoc) curLoc = D.locales[0].id;
    paintLocales();
  }
  function paintLocales() {
    const list = $('[data-loc-list]');
    list.textContent = '';
    D.locales.forEach(l => {
      list.append(h('button', { class: 'loc-btn', type: 'button', 'data-l': l.id, 'aria-pressed': String(l.id === curLoc) },
        h('span', { class: 'n' }, l.n), h('span', {}, h('b', {}, l.nombre), h('small', {}, l.direccion)), h('span', { class: 'pulse', 'aria-hidden': 'true' })));
    });
    const l = D.locales.find(x => x.id === curLoc);
    const t = nowGye();
    const pend = l.horario_estado === 'por_confirmar';
    const s = statusNow();
    const showDias = D.locales_seccion.show_dias;
    const liveToday = l.show_en_vivo && showDias.includes(t.d);
    const badges = h('div', { class: 'badges' });
    if (pend) badges.append(h('span', { class: 'badge badge--pend' }, 'Horario por confirmar'));
    else badges.append(h('span', { class: 'badge' }, h('span', { class: 'dot' + (s.on ? ' on' : '') }), s.txt));
    if (l.show_en_vivo) badges.append(h('span', { class: 'badge live' }, liveToday ? 'Show en vivo hoy' : 'Show en vivo ' + D.locales_seccion.show_etiqueta));
    const hours = h('div', { class: 'hours' + (pend ? ' hours--pend' : '') });
    D.horario.forEach(r => {
      const today = r.dias.includes(t.d) && !pend;
      hours.append(h('span', { class: today ? 'today' : '' }, r.etiqueta), h('b', { class: today ? 'today' : '' }, `${hourLabel(r.abre)} a ${hourLabel(r.cierra)}`));
    });
    const card = $('[data-loc-card]');
    card.textContent = '';
    card.append(h('div', { class: 'swap' },
      h('span', { class: 'bignum', 'aria-hidden': 'true' }, l.n),
      h('p', { class: 'eyebrow' }, 'Kldero #' + l.n),
      h('h3', {}, l.nombre),
      h('p', { class: 'addr' }, l.direccion + (l.zona ? ', ' + l.zona : '') + '.'),
      badges, hours,
      pend ? h('p', { class: 'loc__pend' }, 'Mostramos el horario general de Kldero. El de este local está por confirmar.') : null,
      h('div', { class: 'cta' },
        h('a', { class: 'btn btn--gold magnetic', target: '_blank', rel: 'noopener', href: 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(l.mapa) }, 'Cómo llegar'),
        h('button', { class: 'btn btn--ghost magnetic', type: 'button', 'data-resloc': l.id }, 'Reservar aquí'))));
  }

  /* ---------- Agenda ---------- */
  function renderAgenda() {
    const a = D.agenda;
    setText('[data-agenda-eyebrow]', a.eyebrow);
    setTitle($('[data-agenda-titulo]'), a.titulo);
    const box = $('[data-eventos]');
    box.textContent = '';
    D.eventos.forEach(ev => {
      box.append(h('article', { class: 'event', 'data-event': ev.id },
        h('div', { class: 'date' }, h('small', {}, ev.dia_semana + ' · ' + ev.mes), ev.dia),
        h('div', { class: 'cd', role: 'timer', 'aria-label': 'Cuenta regresiva para el show', 'data-cd': ev.inicio_utc },
          ...['días', 'horas', 'min', 'seg'].map((u, i) => h('div', {}, h('b', { 'data-cdv': i }, '--'), h('span', {}, u))),
          h('p', { class: 'cd-done' }, ev.final)),
        h('h3', {}, ev.titulo), h('p', {}, ev.texto),
        h('div', { class: 'badges' }, h('span', { class: 'badge' }, ev.hora), h('span', { class: 'badge' }, ev.local)),
        h('div', { class: 'cta' }, h('button', { class: 'btn btn--gold magnetic', type: 'button', 'data-resloc': ev.local_id, 'data-ocasion': 'Show en vivo' }, ev.boton))));
    });
    const wk = $('[data-semanal]');
    wk.textContent = '';
    D.semanal.forEach(w => {
      let txt = w.texto;
      if (!txt && w.texto_ref) txt = w.texto_ref.split('.').reduce((o, k) => (o ? o[k] : null), D);
      if (!txt) return;
      wk.append(h('div', { class: 'wk' }, h('b', {}, w.titulo), h('span', {}, txt)));
    });
    startCountdown();
  }
  let cdIv = null;
  function startCountdown() {
    clearInterval(cdIv);
    const box = $('[data-cd]');
    if (!box) return;
    const T = Date.parse(box.dataset.cd);
    const vals = $$('[data-cdv]', box);
    const tick = () => {
      const d = T - Date.now();
      if (d <= 0) { box.classList.add('past'); box.removeAttribute('role'); box.removeAttribute('aria-label'); clearInterval(cdIv); return; }
      const s = Math.floor(d / 1000);
      vals[0].textContent = Math.floor(s / 86400);
      vals[1].textContent = pad2(Math.floor(s % 86400 / 3600));
      vals[2].textContent = pad2(Math.floor(s % 3600 / 60));
      vals[3].textContent = pad2(s % 60);
    };
    tick();
    cdIv = setInterval(tick, 1000);
  }

  /* ---------- Cómo pedir, confianza, galería, FAQ ---------- */
  function renderPedir() {
    const p = D.pedir;
    setText('[data-pedir-eyebrow]', p.eyebrow);
    setTitle($('[data-pedir-titulo]'), p.titulo);
    const box = $('[data-formas]');
    box.textContent = '';
    p.formas.forEach(f => {
      let action;
      if (f.accion === 'carrito') action = h('button', { class: 'btn btn--fire magnetic', type: 'button', 'data-open-cart': '' }, f.boton);
      else if (f.accion === 'pedidosya') action = h('a', { class: 'btn btn--ghost magnetic', href: D.pedidosya.url, target: '_blank', rel: 'noopener', 'data-py': '' }, f.boton);
      else action = h('a', { class: 'btn btn--ghost magnetic', href: '#locales', 'data-go': 'locales' }, f.boton);
      box.append(h('div', { class: 'way' },
        h('span', { class: 'no', 'aria-hidden': 'true' }, f.letra), h('h3', {}, f.titulo), h('p', {}, f.texto),
        f.accion === 'pedidosya' && D.pedidosya.estado === 'por_confirmar' ? h('span', { class: 'pc pc--dark' }, D.pedidosya.nota) : null,
        action));
    });
    const e = p.envio;
    setText('[data-envio]', e.precio == null ? e.texto_sin_precio : 'Envío: ' + money(e.precio));
  }
  function renderConfianza() {
    const c = D.confianza;
    setText('[data-conf-eyebrow]', c.eyebrow);
    setTitle($('[data-conf-titulo]'), c.titulo);
    setText('[data-conf-nota]', c.nota);
    const ul = $('[data-stats]');
    ul.textContent = '';
    c.cifras.forEach(x => {
      const n = x.valor != null
        ? h('b', { class: 'n' }, x.prefijo || '', h('span', { 'data-count': x.valor }, String(x.valor)), x.sufijo || '')
        : h('b', { class: 'n t' }, x.texto);
      ul.append(h('li', {}, n, h('span', { class: 'l' }, x.etiqueta)));
    });
  }
  function renderGaleria() {
    const g = D.galeria;
    setText('[data-gal-eyebrow]', g.eyebrow);
    setTitle($('[data-gal-titulo]'), g.titulo);
    setText('[data-gal-lead]', g.lead);
    const m = $('[data-mosaic]');
    m.textContent = '';
    g.tiles.forEach((t, i) => {
      m.append(h('div', { class: 'tile tile--' + (t.forma || 'normal') },
        h('span', { class: 'tile__n', 'aria-hidden': 'true' }, pad2(i + 1)),
        icon('i-cam', 'tile__ic'),
        h('b', {}, g.texto_tile),
        h('small', {}, t.etiqueta),
        h('span', { class: 'tile__tag' }, 'Espacio reservado')));
    });
  }
  function renderFaq() {
    const f = D.faq_seccion;
    setText('[data-faq-eyebrow]', f.eyebrow);
    setTitle($('[data-faq-titulo]'), f.titulo);
    const box = $('[data-faq]');
    box.textContent = '';
    D.faq.filter(q => q.respuesta).forEach(q => {
      box.append(h('details', {}, h('summary', {}, q.pregunta), h('p', {}, q.respuesta)));
    });
  }

  /* ---------- Reserva ---------- */
  const R = { };
  const localDate = (offsetDays = 0) => {
    const d = new Date(Date.now() + offsetDays * 86400000);
    return new Intl.DateTimeFormat('en-CA', { timeZone: D.zona_horaria || 'America/Guayaquil' }).format(d);
  };
  function renderReserva() {
    const r = D.reserva;
    setText('[data-res-eyebrow]', r.eyebrow);
    setTitle($('[data-res-titulo]'), r.titulo);
    setText('[data-res-lead]', r.lead);
    setText('[data-res-btn]', r.boton);
    setText('[data-res-nota]', r.nota);
    setText('[data-chat-num]', fmtPhone(D.whatsapp));
    const opts = D.locales.map(l => h('option', { value: l.id }, l.nombre));
    $('#rl').replaceChildren(...opts);
    $('#cl').replaceChildren(...D.locales.map(l => h('option', { value: l.id }, l.nombre)));
    $('#ro').replaceChildren(...r.ocasiones.map(o => h('option', { value: o }, o)));
    $('#rp').value = r.personas_defecto; $('#rp').max = r.personas_max;
    $('#rh').value = r.hora_defecto; $('#rh').min = r.hora_minima;
    $('#rd').min = localDate(0); $('#rd').value = localDate(1);
    paintRes();
  }
  function reservaLines() {
    const l = D.locales.find(x => x.id === $('#rl').value) || D.locales[0];
    const d = $('#rd').value;
    const ds = d ? new Date(d + 'T12:00:00').toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' }) : '(por definir)';
    return [
      ['Local', l.nombre], ['Fecha', ds], ['Hora', $('#rh').value || '(por definir)'],
      ['Personas', $('#rp').value || '(por definir)'], ['Ocasión', $('#ro').value], ['Nombre', $('#rn').value.trim() || '(por completar)']
    ];
  }
  function paintRes() {
    const lines = reservaLines();
    const msg = D.mensajes.reserva_intro + '\n\n' + lines.map(([k, v]) => `${k}: ${v}`).join('\n');
    $('[data-res-wa]').href = waLink(msg);
    const b = $('[data-bubble]');
    b.textContent = '';
    b.append(h('div', { class: 'ml' }, D.mensajes.reserva_intro));
    lines.forEach(([k, v]) => b.append(h('div', { class: 'ml' }, h('span', { class: 'ml__k' }, k + ': '), h('span', { class: 'ml__v' }, v))));
  }
  function goReserva(localId, ocasion) {
    if (localId) $('#rl').value = localId;
    if (ocasion && [...$('#ro').options].some(o => o.value === ocasion)) $('#ro').value = ocasion;
    paintRes();
    go('reservar');
  }

  function renderFooter() {
    const ig = $('[data-ig]'); ig.href = 'https://www.instagram.com/' + encodeURIComponent(D.instagram) + '/'; setText('[data-ig] span', 'Instagram · @' + D.instagram);
    const tt = $('[data-tt]'); tt.href = 'https://www.tiktok.com/@' + encodeURIComponent(D.tiktok); setText('[data-tt] span', 'TikTok · @' + D.tiktok);
    $('[data-py]').href = D.pedidosya.url;
    const fl = $('[data-foot-locales]');
    D.locales.forEach(l => fl.append(h('span', { class: 'foot__line' }, l.nombre + (l.zona === 'Urdesa' ? ', Urdesa' : ''))));
    fl.append(h('p', { class: 'fh fh--gap' }, 'Horario'));
    D.horario.forEach(r => fl.append(h('span', { class: 'foot__line' }, `${r.etiqueta} · ${hourLabel(r.abre)} a ${hourLabel(r.cierra)}`)));
    fl.append(h('span', { class: 'foot__line foot__line--pend' }, 'Plaza Guayarte: horario por confirmar'));
  }

  /* ---------- Navegación, progreso, sección activa ---------- */
  function sectionTop(id) {
    if (id === 'inicio') return 0;
    const el = document.getElementById(id);
    if (!el) return null;
    const box = el.parentElement && el.parentElement.classList.contains('pin-spacer') ? el.parentElement : el;
    return box.getBoundingClientRect().top + window.scrollY;
  }
  function go(id, instant) {
    const y = sectionTop(id);
    if (y == null) return;
    if (window.__lenis && !instant) window.__lenis.scrollTo(y, { duration: 1.4, easing: t => 1 - Math.pow(1 - t, 4) });
    else window.scrollTo({ top: y, behavior: reduced || instant ? 'auto' : 'smooth' });
    try { history.replaceState(null, '', '#' + id); } catch (e) { /* nada */ }
  }
  function initNav() {
    const ids = ['promos', 'menu', 'locales', 'agenda', 'domicilio', 'reservar'];
    const alias = { domicilio: 'agenda' };
    let cur = '';
    const setActive = id => {
      cur = id;
      $$('[data-nav]').forEach(a => a.classList.toggle('is-on', a.dataset.nav === id));
    };
    if ('IntersectionObserver' in window) {
      const vis = new Set();
      const io = new IntersectionObserver(es => {
        es.forEach(en => { if (en.isIntersecting) vis.add(en.target.id); else vis.delete(en.target.id); });
        const found = ids.filter(i => vis.has(i)).pop();
        const next = found ? (alias[found] || found) : '';
        if (next !== cur) setActive(next);
      }, { rootMargin: '-45% 0px -50% 0px' });
      ids.forEach(i => { const el = document.getElementById(i); if (el) io.observe(el); });
    }
    const bar = $('[data-progress]');
    const top = $('[data-top]');
    let raf = 0;
    const upd = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - innerHeight;
      bar.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
      top.classList.toggle('solid', scrollY > 40);
    };
    addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(upd); }, { passive: true });
    addEventListener('resize', upd);
    upd();
    const chrome = $('.chrome');
    const setH = () => root.style.setProperty('--chrome-h', Math.ceil(chrome.getBoundingClientRect().height) + 'px');
    setH();
    if ('ResizeObserver' in window) new ResizeObserver(setH).observe(chrome); else addEventListener('resize', setH);
  }

  /* ---------- Eventos de la página ---------- */
  function bindEvents() {
    document.addEventListener('click', e => {
      const t = e.target.closest('button, a');
      if (!t) return;
      const goEl = t.closest('[data-go]');
      if (goEl) { e.preventDefault(); go(goEl.dataset.go); return; }
      if (t.hasAttribute('data-open-cart')) { openCart(); return; }
      if (t.dataset.addp) { addToCart(t.dataset.addp, t, true); openCart(); return; }
      if (t.dataset.addm) { addToCart('martes', t, true); openCart(); return; }
      if (t.dataset.add) { addToCart(t.dataset.add, t); return; }
      if (t.dataset.qk) {
        const k = t.dataset.qk;
        cart[k] = Math.max(0, (cart[k] || 0) + (+t.dataset.qd));
        if (!cart[k]) delete cart[k];
        paintCart();
        return;
      }
      if (t.dataset.k) { selectTab(t.dataset.k, true); return; }
      if (t.dataset.l) { const lid = t.dataset.l; curLoc = lid; vt(() => { paintLocales(); const nb = $(`[data-l="${lid}"]`); if (nb) nb.focus({ preventScroll: true }); }); return; }
      if (t.dataset.resloc) { closeCart(); goReserva(t.dataset.resloc, t.dataset.ocasion); return; }
      if (t.dataset.pi !== undefined) {
        const cards = $$('[data-ptrack] .promo'), tr = $('[data-ptrack]'), c = cards[+t.dataset.pi];
        tr.scrollTo({ left: c.getBoundingClientRect().left - tr.getBoundingClientRect().left + tr.scrollLeft - 16, behavior: reduced ? 'auto' : 'smooth' });
        return;
      }
      if (t.hasAttribute('data-close-cart')) { closeCart(); return; }
      if (t.hasAttribute('data-send-wa')) {
        if (!totals().n) { e.preventDefault(); toast('Agrega algo a tu pedido primero'); return; }
        t.href = waLink(orderMessage());
        track('order_send', { items: totals().n, total: +totals().t.toFixed(2) });
        return;
      }
      if (t.hasAttribute('data-res-wa')) { paintRes(); track('reservation_send', { local: $('#rl').value, personas: +$('#rp').value || 0 }); return; }
      if (t.hasAttribute('data-wa')) {
        t.href = waLink(waText(t.dataset.wa));
        track('whatsapp_click', { origen: t.classList.contains('dock__wa') ? 'barra_movil' : (t.closest('section') || {}).id || 'cabecera' });
        return;
      }
      if (t.closest('[data-sim]') && t.dataset.d !== undefined) {
        sim = t.dataset.d === '' ? null : +t.dataset.d;
        $$('[data-sim] button').forEach(b => b.setAttribute('aria-pressed', String(b === t)));
        paintStatus(); renderPromos(); paintLocales(); paintCart();
        return;
      }
    });
    $('#veil').addEventListener('click', closeCart);
    document.addEventListener('keydown', e => {
      if (!isOpen()) return;
      if (e.key === 'Escape') { closeCart(); return; }
      if (e.key === 'Tab') {
        const f = $$('button, a[href], input, select, textarea', $('#drawer')).filter(x => !x.disabled && x.offsetParent !== null && getComputedStyle(x).pointerEvents !== 'none');
        if (!f.length) return;
        const a = f[0], z = f[f.length - 1];
        if (!$('#drawer').contains(document.activeElement)) { e.preventDefault(); a.focus(); }
        else if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
        else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
      }
    });
    $('[data-tabs]').addEventListener('keydown', e => {
      const ks = D.carta.categorias.map(c => c.id);
      const i = ks.indexOf(curTab);
      let n;
      if (e.key === 'ArrowRight') n = (i + 1) % ks.length;
      else if (e.key === 'ArrowLeft') n = (i - 1 + ks.length) % ks.length;
      else if (e.key === 'Home') n = 0;
      else if (e.key === 'End') n = ks.length - 1;
      else return;
      e.preventDefault();
      selectTab(ks[n], true);
    });
    ['cn', 'ca', 'cl'].forEach(id => $('#' + id).addEventListener('input', paintCart));
    $('#cl').addEventListener('change', paintCart);
    $$('input[name="pay"]').forEach(r => r.addEventListener('change', paintCart));
    const rf = $('[data-rform]');
    rf.addEventListener('input', paintRes);
    rf.addEventListener('change', paintRes);
    rf.addEventListener('submit', e => e.preventDefault());
  }

  /* ---------- Brasas (canvas): pausa fuera de vista y con la pestaña oculta ---------- */
  function embers() {
    const cv = $('#embers');
    if (reduced || !cv) return;
    const cx = cv.getContext('2d');
    const dpr = Math.min(2, devicePixelRatio || 1);
    let W = 0, H = 0, P = [], run = false, vis = true;
    const spawn = init => ({ x: Math.random() * W, y: init ? Math.random() * H : H + 10, r: Math.random() * 2.2 + .6, vy: -(Math.random() * .7 + .25), vx: (Math.random() - .5) * .3, ph: Math.random() * 6.28, l: Math.random() * .6 + .4 });
    const size = () => { W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; cx.setTransform(dpr, 0, 0, dpr, 0, 0); P = []; const n = Math.round(Math.min(80, W / 14)); for (let i = 0; i < n; i++) P.push(spawn(true)); };
    size();
    addEventListener('resize', size);
    const loop = () => {
      if (!run || !vis || document.hidden) { run = false; return; }
      cx.clearRect(0, 0, W, H);
      cx.globalCompositeOperation = 'lighter';
      P.forEach((p, i) => {
        p.ph += .03; p.x += p.vx + Math.sin(p.ph) * .35; p.y += p.vy;
        const a = Math.max(0, Math.min(1, p.y / H)) * p.l;
        const g = cx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 6);
        g.addColorStop(0, `rgba(255,200,110,${a})`); g.addColorStop(.4, `rgba(228,87,46,${a * .5})`); g.addColorStop(1, 'rgba(228,87,46,0)');
        cx.fillStyle = g; cx.beginPath(); cx.arc(p.x, p.y, p.r * 6, 0, 6.283); cx.fill();
        if (p.y < -10) P[i] = spawn(false);
      });
      requestAnimationFrame(loop);
    };
    const start = () => { if (!run && vis && !document.hidden) { run = true; requestAnimationFrame(loop); } };
    new IntersectionObserver(e => { vis = e[0].isIntersecting; if (vis) start(); }).observe(cv);
    document.addEventListener('visibilitychange', start);
    start();
  }

  /* ---------- Movimiento (GSAP + ScrollTrigger + SplitText + Lenis) ---------- */
  let entered = false;
  const sm = (p, a, b) => { const k = Math.min(1, Math.max(0, (p - a) / (b - a))); return k * k * (3 - 2 * k); };
  function motion(contentReady) {
    const g = window.gsap, ST = window.ScrollTrigger, Split = window.SplitText;
    if (!g || !ST || !Split || reduced) { root.classList.remove('js-pending'); renderStatic(); return; }
    g.registerPlugin(ST, Split);
    ST.config({ ignoreMobileResize: true });

    const fontsReady = Promise.race([
      (document.fonts && document.fonts.ready) || Promise.resolve(),
      new Promise(r => setTimeout(r, 1200))
    ]);

    const mm = g.matchMedia();
    mm.add({
      desk: '(min-width: 900px) and (prefers-reduced-motion: no-preference)',
      mob: '(max-width: 899px) and (prefers-reduced-motion: no-preference)'
    }, ctx => {
      const desk = !!ctx.conditions.desk;
      let dead = false;
      const undo = [];
      const safe = fn => ctx.add(() => { try { fn(desk, undo); } catch (err) { console.warn('motion', err); rescue(); } });
      fontsReady.then(() => {
        if (dead) return;
        safe(buildHero);
        /* El resto (escena, aparición, contadores) espera a que se dibuje toda la página, por tramos */
        contentReady.then(() => { if (!dead) safe(buildRest); });
      });
      return () => { dead = true; undo.forEach(f => { try { f(); } catch (e) { /* nada */ } }); };
    });

    /* Si algo falla, todo queda visible y estático */
    function rescue() {
      root.classList.remove('js-pending', 'scene-live');
      renderStatic();
      try { g.set('[data-reveal], [data-stagger] > *, .promo, [data-hero-art], .hero__title, .hero__txt > *', { clearProps: 'all' }); } catch (e) { /* nada */ }
    }

    function buildHero(desk, undo) {

      /* Lenis solo en escritorio con puntero fino */
      if (desk && window.Lenis && finePtr.matches) {
        const lenis = new window.Lenis({ lerp: .1 });
        window.__lenis = lenis;
        lenis.on('scroll', ST.update);
        const tick = t => lenis.raf(t * 1000);
        g.ticker.add(tick);
        g.ticker.lagSmoothing(0);
        undo.push(() => { g.ticker.remove(tick); lenis.destroy(); window.__lenis = null; });
      }

      /* ---- Hero: entrada (solo una vez) ---- */
      const hero = $('#inicio');
      if (!entered) {
        entered = true;
        const splits = $$('.ht').map(el => Split.create(el, { type: 'chars', mask: 'chars', aria: 'none' }));
        root.classList.remove('js-pending');
        const wipe = { clipPath: 'inset(0 0 100% 0)' };
        const tl = g.timeline({ defaults: { ease: 'expo.out' }, onComplete: () => g.set('.hero__txt > *, .hero__cta > *', { clearProps: 'clipPath,transform' }) });
        tl.from('.status', { ...wipe, y: 10, duration: .7 }, 0)
          .from(splits.flatMap(s => s.chars), { yPercent: 118, duration: 1.05, stagger: .04 }, .05)
          .from('[data-hero-script]', { ...wipe, y: 18, duration: .8 }, .5)
          .from('[data-hero-lead], [data-martes-banner]', { ...wipe, y: 18, duration: .8 }, .6)
          .from('.hero__cta > *', { ...wipe, y: 18, duration: .7, stagger: .07 }, .7)
          .from('[data-hero-art]', { scale: .84, y: 50, rotate: -5, autoAlpha: 0, duration: 1.3 }, .15)
          .from('[data-seal] svg', { scale: 0, rotation: -100, duration: 1.1, ease: 'back.out(1.5)', transformOrigin: '50% 50%' }, .8);
      } else {
        root.classList.remove('js-pending');
      }
      g.to('[data-seal-ring]', { rotation: 360, duration: 26, ease: 'none', repeat: -1, transformOrigin: '50% 50%' });

      /* ---- Hero: parallax del plato y del texto ---- */
      const heroSt = { trigger: hero, start: 'top top', end: 'bottom top', scrub: true };
      g.to('[data-plate]', { y: desk ? 90 : 46, rotate: -5, scale: 1.07, ease: 'none', scrollTrigger: heroSt });
      g.to('.halo', { scale: 1.25, opacity: .5, ease: 'none', scrollTrigger: heroSt });
      g.to('[data-seal]', { y: desk ? -60 : -30, ease: 'none', scrollTrigger: heroSt });
      g.to('.hero__txt', { y: desk ? -50 : -24, ease: 'none', scrollTrigger: heroSt });

    }

    function buildRest(desk, undo) {
      const vh = () => innerHeight;

      /* ---- Marquee: velocidad ligada al scroll ---- */
      const mq = $('[data-marq]');
      if (mq) {
        root.classList.add('marq-js');
        const tw = g.to(mq, { xPercent: -50, duration: 46, ease: 'none', repeat: -1 });
        const decay = g.to(tw, { timeScale: 1, duration: .8, paused: true, ease: 'power2.out' });
        ST.create({
          trigger: mq, start: 'top bottom', end: 'bottom top',
          onToggle: s => (s.isActive ? tw.play() : tw.pause()),
          onUpdate: s => { const v = Math.min(5, Math.abs(s.getVelocity()) / 400); tw.timeScale(1 + v); decay.restart(); }
        });
        undo.push(() => { tw.kill(); decay.kill(); root.classList.remove('marq-js'); g.set(mq, { clearProps: 'transform' }); });
      }

      /* ---- Escena fijada: Crudo, Sellado, Servido (no en pantallas muy bajas) ---- */
      if (innerHeight < 520) renderStatic();
      if (innerHeight >= 520) {
      const stage = $('[data-stage]');
      const sc = $('#escena');
      const stepEls = $$('.step');
      const dotEls = $$('[data-sdots] li');
      let stepSplits = null;
      const splitSteps = () => { if (!stepSplits) stepSplits = $$('.step h3').map(el => Split.create(el, { type: 'chars', mask: 'chars', aria: 'none' })); return stepSplits; };
      const idle = window.requestIdleCallback || (f => setTimeout(f, 200));
      idle(() => { if (!stepSplits) splitSteps(); }, { timeout: 4000 });
      let curStep = 0;
      const apply = p => {
        const st = stage.style;
        st.setProperty('--raw', (1 - sm(p, .2, .48)).toFixed(3));
        st.setProperty('--mk', sm(p, .34, .6).toFixed(3));
        st.setProperty('--ht', (sm(p, .28, .55) * (1 - .5 * sm(p, .8, 1))).toFixed(3));
        st.setProperty('--sv', sm(p, .64, .86).toFixed(3));
        const n = p < .33 ? 0 : p < .66 ? 1 : 2;
        dotEls.forEach((d, i) => d.style.setProperty('--f', (i < n ? 1 : i > n ? 0 : Math.min(1, Math.max(0, (p - i * .33) / .33))).toFixed(3)));
        if (n !== curStep) {
          curStep = n;
          stepEls.forEach((e, i) => e.classList.toggle('on', i === n));
          dotEls.forEach((d, i) => { if (i === n) d.setAttribute('aria-current', 'step'); else d.removeAttribute('aria-current'); });
          g.fromTo(splitSteps()[n].chars, { yPercent: 112 }, { yPercent: 0, duration: .8, ease: 'expo.out', stagger: .035, overwrite: true });
        }
      };
      root.classList.add('scene-live');
      const sceneTl = g.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: sc, start: 'top top', end: () => '+=' + Math.round(vh() * (desk ? 2.5 : 2.2)),
          pin: true, anticipatePin: 1, scrub: .5, invalidateOnRefresh: true,
          onUpdate: self => apply(self.progress),
          onRefresh: self => apply(self.progress)
        }
      });
      sceneTl.fromTo('[data-scene-svg]', { scale: .95, rotate: -2 }, { scale: 1.04, rotate: 1.5, duration: 1, transformOrigin: '50% 55%' }, 0);
      undo.push(() => {
        root.classList.remove('scene-live');
        if (stepSplits) stepSplits.forEach(s => s.revert());
        renderStatic();
        g.set('[data-scene-svg]', { clearProps: 'transform' });
        stage.removeAttribute('style');
      });
      }

      /* ---- Aparición por sección (solo al entrar en pantalla) ---- */
      $$('[data-reveal]').forEach(el => {
        g.from(el, { y: 36, autoAlpha: 0, duration: .9, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
      });
      $$('[data-stagger]').forEach(box => {
        g.from([...box.children], { y: 30, autoAlpha: 0, duration: .8, ease: 'expo.out', stagger: .07, scrollTrigger: { trigger: box, start: 'top 86%', once: true } });
      });
      const promoCards = $$('[data-promos] .promo');
      g.set(promoCards, { autoAlpha: 0, y: 40 });
      ST.batch(promoCards, { start: 'top 92%', once: true, onEnter: els => g.to(els, { autoAlpha: 1, y: 0, duration: .9, ease: 'expo.out', stagger: .08, overwrite: true }) });
      undo.push(() => g.set(promoCards, { clearProps: 'all' }));

      /* ---- Contadores ---- */
      $$('[data-count]').forEach(el => {
        const to = +el.dataset.count;
        const o = { v: to };
        ST.create({
          trigger: el, start: 'top 90%', once: true,
          onEnter: () => { o.v = 0; el.textContent = '0'; g.to(o, { v: to, duration: 1.6, ease: 'power3.out', onUpdate: () => { el.textContent = Math.round(o.v); } }); }
        });
      });

      /* ---- Brillo que sigue al cursor y botones magnéticos (puntero fino) ---- */
      if (desk && finePtr.matches) {
        const gl = $('[data-glow]');
        const xTo = g.quickTo(gl, 'x', { duration: .6, ease: 'power3' });
        const yTo = g.quickTo(gl, 'y', { duration: .6, ease: 'power3' });
        const move = e => { gl.classList.add('is-on'); xTo(e.clientX); yTo(e.clientY); };
        addEventListener('pointermove', move, { passive: true });
        undo.push(() => { removeEventListener('pointermove', move); gl.classList.remove('is-on'); });

        const qs = new WeakMap();
        let cur = null;
        const q = b => { let o = qs.get(b); if (!o) { o = { x: g.quickTo(b, 'x', { duration: .4, ease: 'power3' }), y: g.quickTo(b, 'y', { duration: .4, ease: 'power3' }) }; qs.set(b, o); } return o; };
        const mv = e => {
          const b = e.target.closest && e.target.closest('.magnetic');
          if (b !== cur) { if (cur) { const o = q(cur); o.x(0); o.y(0); } cur = b; }
          if (b) { const r = b.getBoundingClientRect(); const o = q(b); o.x((e.clientX - (r.left + r.width / 2)) * .26); o.y((e.clientY - (r.top + r.height / 2)) * .32); }
        };
        addEventListener('pointermove', mv, { passive: true });
        undo.push(() => { removeEventListener('pointermove', mv); $$('.magnetic').forEach(b => g.set(b, { clearProps: 'transform' })); });
      }

      /* Brillo de las tarjetas con el puntero (solo variables CSS) */
      if (finePtr.matches) {
        const gm = e => {
          const c = e.target.closest && e.target.closest('[data-spot]');
          if (!c) return;
          const r = c.getBoundingClientRect();
          c.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
          c.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
        };
        addEventListener('pointermove', gm, { passive: true });
        undo.push(() => removeEventListener('pointermove', gm));
      }

      ST.refresh();
      if (location.hash.length > 1) {
        const id = decodeURIComponent(location.hash.slice(1));
        if (document.getElementById(id)) setTimeout(() => go(id, true), 60);
      }
    }
    addEventListener('load', () => ST.refresh(), { once: true });
  }

  /* ---------- Arranque ---------- */
  async function init() {
    try {
      const r = await fetch('data.json');
      if (!r.ok) throw new Error('HTTP ' + r.status);
      D = await r.json();
    } catch (err) {
      root.classList.remove('js-pending');
      $('main').prepend(h('p', { class: 'fatal', role: 'alert' }, 'No se pudo cargar data.json. Abre la página desde un servidor (por ejemplo, python3 -m http.server).'));
      console.warn('data.json', err);
      return;
    }
    applyBrand();
    renderDemo();
    renderHero();
    renderAtajos();
    renderMarquee();
    bindWa();
    initMedicion();
    initNav();
    embers();
    /* El resto de la página se dibuja por tramos, con un cuadro entre uno y otro, para no bloquear el hilo principal */
    const frame = () => new Promise(res => { let d = false; const f = () => { if (!d) { d = true; res(); } }; requestAnimationFrame(() => setTimeout(f, 0)); setTimeout(f, 120); });
    const steps = [
      () => { renderEscena(); if (reduced || !window.gsap || !window.ScrollTrigger || !window.SplitText) renderStatic(); },
      renderPromos,
      () => { renderCartaHead(); renderTabs(); renderCarta(); },
      renderLocales,
      renderAgenda,
      renderPedir,
      renderConfianza,
      renderGaleria,
      renderFaq,
      renderReserva,
      renderFooter
    ];
    const contentReady = (async () => {
      await frame();
      for (const s of steps) { try { s(); } catch (e) { console.warn('render', e); } await frame(); }
      bindWa();
      bindEvents();
      paintCart();
      setInterval(() => { paintStatus(); if (!$('[data-loc-card]').contains(document.activeElement)) paintLocales(); }, 60000);
    })();
    motion(contentReady);
  }
  init();
})();
