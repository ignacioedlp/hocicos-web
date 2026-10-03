import './motion';

const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const journey = document.querySelector<HTMLElement>('.journey')!;
const tabs = Array.from(journey.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
const panels = Array.from(journey.querySelectorAll<HTMLElement>('[role="tabpanel"]'));
const chapterStage = journey.querySelector<HTMLElement>('.chapters')!;
const announcement = journey.querySelector<HTMLElement>('.story-announcement')!;
const duration = 7000;
let current = 0;
let visible = false;
let focused = false;
let remaining = duration;
let startedAt = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
let transitions: Animation[] = [];

// Reserve the tallest chapter at the current width, so autoplay never moves the page.
function stabilizeHeight() {
  let height = 0;
  for (const panel of panels) {
    const hidden = panel.hidden;
    panel.style.visibility = 'hidden';
    panel.hidden = false;
    height = Math.max(height, panel.getBoundingClientRect().height);
    panel.hidden = hidden;
    panel.style.removeProperty('visibility');
  }
  chapterStage.style.minHeight = `${Math.ceil(height)}px`;
}
stabilizeHeight();
document.fonts.ready.then(stabilizeHeight);
let resizeFrame = 0;
window.addEventListener('resize', () => {
  cancelAnimationFrame(resizeFrame);
  resizeFrame = requestAnimationFrame(stabilizeHeight);
});

function stopClock() {
  if (timer !== undefined) {
    clearTimeout(timer);
    remaining = Math.max(0, remaining - (performance.now() - startedAt));
    timer = undefined;
  }
}

function syncPlayback() {
  stopClock();
  const running = !reduced.matches && visible && !focused && !document.hidden;
  if (!running) return;
  startedAt = performance.now();
  timer = setTimeout(() => { timer = undefined; selectChapter((current + 1) % tabs.length); }, remaining);
}

function selectChapter(index: number, manual = false, focus = false) {
  stopClock();
  remaining = duration;
  current = index;
  transitions.forEach(animation => animation.cancel());
  transitions = [];
  tabs.forEach((tab, i) => { tab.setAttribute('aria-selected', String(i === index)); tab.tabIndex = i === index ? 0 : -1; });
  panels.forEach((panel, i) => { panel.hidden = i !== index; });
  if (focus) tabs[index].focus();
  if (manual) announcement.textContent = `Paso ${index + 1} de 3: ${panels[index].querySelector('h3')!.textContent}`;
  if (!reduced.matches) {
    const image = panels[index].querySelector('img')!;
    transitions.push(image.animate([{ opacity: .35, transform: 'scale(1.045)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 700, easing: 'cubic-bezier(.16,1,.3,1)' }));
    panels[index].querySelectorAll('.chapter-copy > *, .chapter-status').forEach((element, i) => {
      transitions.push(element.animate([{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { duration: 500, delay: Math.min(i * 55, 220), easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' }));
    });
  }
  syncPlayback();
}

tabs.forEach((tab, i) => {
  tab.addEventListener('click', () => selectChapter(i, true));
  tab.addEventListener('keydown', event => {
    const next = event.key === 'ArrowRight' ? (i + 1) % tabs.length : event.key === 'ArrowLeft' ? (i + tabs.length - 1) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : null;
    if (next !== null) { event.preventDefault(); selectChapter(next, true, true); }
  });
});
journey.querySelectorAll<HTMLButtonElement>('[data-next]').forEach(button => button.addEventListener('click', () => selectChapter(Number(button.dataset.next), true, true)));
const interactionArea = journey.querySelector<HTMLElement>('.story-experience')!;
interactionArea.addEventListener('focusin', () => { focused = true; syncPlayback(); });
interactionArea.addEventListener('focusout', event => { focused = interactionArea.contains(event.relatedTarget as Node | null); syncPlayback(); });
document.addEventListener('visibilitychange', syncPlayback);
reduced.addEventListener('change', () => { transitions.forEach(animation => animation.cancel()); syncPlayback(); });
new IntersectionObserver(entries => { visible = entries[0].isIntersecting && entries[0].intersectionRatio >= .25; syncPlayback(); }, { threshold: .25 }).observe(chapterStage);
syncPlayback();

// Distinct, finite entrances; photos and handwritten notes keep their own rhythm.
const entranceObserver = new IntersectionObserver(entries => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    entranceObserver.unobserve(entry.target);
    if (reduced.matches) continue;
    const element = entry.target as HTMLElement;
    const note = element.classList.contains('hand-note');
    element.animate(note
      ? [{ opacity: 0, translate: '0 14px', rotate: '-4deg' }, { opacity: 1, translate: '0 0', rotate: '0deg' }]
      : [{ opacity: .5, transform: 'translateY(22px)' }, { opacity: 1, transform: 'none' }],
      { duration: note ? 850 : 700, easing: 'cubic-bezier(.16,1,.3,1)' });
  }
}, { threshold: .2 });
document.querySelectorAll('.mission-mark, .mission .hand-note, .cat-photo .hand-note, .care dl > div, .join > img, .join .hand-note').forEach(element => entranceObserver.observe(element));
