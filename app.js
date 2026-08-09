/* Morris & Cope — motion layer.
   Only transform/opacity are animated. Everything degrades to a static,
   fully-readable page if JS or motion is unavailable. */

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Header: condense once the hero starts to leave ---------- */
const head = document.querySelector('.site-head');
const dock = document.querySelector('.dock');
let lastY = window.scrollY;

function onScroll() {
  const y = window.scrollY;
  head?.classList.toggle('is-stuck', y > 24);
  if (dock) dock.classList.toggle('is-up', y > 520 && y < document.body.scrollHeight - window.innerHeight - 240);
  lastY = y;
}
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

/* ---------- Mobile drawer ---------- */
const burger = document.querySelector('.burger');
const drawer = document.querySelector('.drawer');

function setDrawer(open) {
  if (!burger || !drawer) return;
  burger.setAttribute('aria-expanded', String(open));
  drawer.classList.toggle('is-open', open);
  drawer.setAttribute('aria-hidden', String(!open));
  document.body.style.overflow = open ? 'hidden' : '';
}
burger?.addEventListener('click', () => setDrawer(burger.getAttribute('aria-expanded') !== 'true'));
drawer?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setDrawer(false)));
document.addEventListener('keydown', e => { if (e.key === 'Escape') setDrawer(false); });

/* ---------- Hero entrance ---------- */
requestAnimationFrame(() => {
  document.querySelectorAll('.stage').forEach(s => s.classList.add('is-live'));
});

/* ---------- Hero calculator ----------
   Straight arithmetic on what the visitor enters. The markup already holds
   a sensible default, so this only ever refines what is on screen. */
const calc = document.querySelector('[data-calc]');
if (calc) {
  const slider  = calc.querySelector('input[type="range"]');
  const hoursEl = calc.querySelector('[data-hours]');
  const yearEl  = calc.querySelector('[data-year]');
  const weeksEl = calc.querySelector('[data-weeks]');
  const WEEKS_IN_YEAR = 52;
  const WORKING_WEEK  = 40;

  const paint = () => {
    const hours = Number(slider.value);
    const min = Number(slider.min), max = Number(slider.max);
    const perYear = hours * WEEKS_IN_YEAR;

    slider.style.setProperty('--fill', ((hours - min) / (max - min)) * 100 + '%');
    hoursEl.textContent = hours + (hours === 1 ? ' hr' : ' hrs');
    yearEl.textContent  = perYear.toLocaleString('en-NZ');
    weeksEl.textContent = Math.round(perYear / WORKING_WEEK);

    yearEl.classList.remove('is-tick');
    void yearEl.offsetWidth;          // restart the nudge on every change
    yearEl.classList.add('is-tick');
  };

  slider.addEventListener('input', paint);
  paint();

  // Count the headline figure up once, the first time it is seen
  if (!reduced) {
    const target = Number(slider.value) * WEEKS_IN_YEAR;
    const countIO = new IntersectionObserver((entries, obs) => {
      if (!entries[0].isIntersecting) return;
      obs.disconnect();
      const started = performance.now();
      const run = (now) => {
        const t = Math.min(1, (now - started) / 950);
        const eased = 1 - Math.pow(1 - t, 3);
        yearEl.textContent = Math.round(target * eased).toLocaleString('en-NZ');
        if (t < 1) requestAnimationFrame(run);
      };
      requestAnimationFrame(run);
    }, { threshold: 0.4 });
    countIO.observe(calc);
  }
}

/* ---------- Scroll reveals ---------- */
const revealables = document.querySelectorAll('.reveal');
if (reduced) {
  revealables.forEach(el => el.classList.add('is-in'));
} else {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -60px 0px', threshold: 0 });
  revealables.forEach(el => io.observe(el));

  // Safety net: nothing stays invisible just because an observer callback
  // was missed (fast scrolling, restored scroll position, bfcache).
  const sweep = () => {
    revealables.forEach(el => {
      if (el.classList.contains('is-in')) return;
      if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('is-in');
    });
  };
  window.addEventListener('load', sweep);
  window.addEventListener('pageshow', sweep);
  setTimeout(sweep, 1200);
}

/* ---------- Step activation ---------- */
const steps = document.querySelectorAll('.step');
if (steps.length) {
  const stepIO = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('is-on'); });
  }, { threshold: 0.5 });
  steps.forEach(s => stepIO.observe(s));
}

/* ---------- Flight path: the route draws itself as you scroll ---------- */
const route = document.querySelector('.route');
const trace = route?.querySelector('.route__trace');

if (route && trace && !reduced) {
  let ticking = false;

  const draw = () => {
    ticking = false;
    const r = route.getBoundingClientRect();
    const vh = window.innerHeight;
    // 0 when the route's top hits 78% of the viewport, 1 once its bottom clears 45%
    const start = vh * 0.82;
    const end = vh * 0.35;
    const p = Math.min(1, Math.max(0, (start - r.top) / Math.max(1, start - end + r.height * 0.35)));

    trace.style.strokeDashoffset = String(1 - p);
  };

  const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(draw); } };
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request);
  draw();
}

/* ---------- Testimonial rail ---------- */
document.querySelectorAll('[data-rail]').forEach(group => {
  const rail = group.querySelector('.rail');
  const [prev, next] = group.querySelectorAll('.rail-nav button');
  if (!rail) return;
  const step = () => rail.querySelector('.quote')?.getBoundingClientRect().width + 24 || 400;
  prev?.addEventListener('click', () => rail.scrollBy({ left: -step(), behavior: reduced ? 'auto' : 'smooth' }));
  next?.addEventListener('click', () => rail.scrollBy({ left: step(), behavior: reduced ? 'auto' : 'smooth' }));
});

/* ---------- Accordions ---------- */
document.querySelectorAll('.acc').forEach(acc => {
  acc.querySelectorAll('.acc__btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.acc__item');
      const open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
      item.classList.toggle('is-open', !open);
    });
  });
});

/* ---------- "Read more" disclosures on the services page ---------- */
document.querySelectorAll('.more__btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const more = btn.closest('.more');
    const open = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!open));
    more.classList.toggle('is-open', !open);
    btn.closest('.svc-detail')?.classList.toggle('is-open', !open);
    btn.querySelector('[data-label]').textContent = open ? 'Read more' : 'Show less';
  });
});

/* Open the matching panel when arrived at via #hash */
function openFromHash() {
  if (!location.hash) return;
  let target;
  try { target = document.querySelector(location.hash); } catch { return; }
  if (!target) return;

  const accBtn = target.querySelector('.acc__btn');
  if (accBtn) {
    accBtn.setAttribute('aria-expanded', 'true');
    accBtn.closest('.acc__item')?.classList.add('is-open');
  }
  const moreBtn = target.querySelector('.more__btn');
  if (moreBtn && moreBtn.getAttribute('aria-expanded') !== 'true') {
    moreBtn.click();
  }
}
openFromHash();
window.addEventListener('hashchange', openFromHash);

/* ---------- Footer year ---------- */
document.querySelectorAll('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
