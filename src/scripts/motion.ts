const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
const targets = document.querySelectorAll<HTMLElement>(
  '.reveal, .stats > div, .step, .community li, .faq details, .closing-brand, .closing > div:last-child',
);

// Content stays visible without JavaScript. Only opt in once the observer exists.
const observer = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    entry.target.classList.toggle('in-view', entry.isIntersecting);
    if (entry.isIntersecting) entry.target.classList.add('visible');
  }
}, { threshold: 0.08 });

targets.forEach((element) => {
  element.classList.add('motion-reveal');
  observer.observe(element);
});
document.querySelectorAll('.steps-grid, .stats, .community ul').forEach((group) => {
  Array.from(group.children).forEach((child, index) => {
    (child as HTMLElement).style.setProperty('--reveal-delay', `${index * 85}ms`);
  });
});
document.documentElement.classList.add('motion-ready');

// Keep the disclosure open until its closing animation finishes, so layout never snaps.
document.querySelectorAll<HTMLDetailsElement>('.faq details').forEach((details) => {
  const summary = details.querySelector('summary');
  const answer = details.querySelector('p');
  if (!summary || !answer) return;
  let animation: Animation | undefined;
  let answerAnimation: Animation | undefined;
  let expanded = details.open;

  const finish = () => {
    animation?.cancel();
    answerAnimation?.cancel();
    animation = undefined;
    answerAnimation = undefined;
    details.open = expanded;
    details.style.removeProperty('height');
    details.style.removeProperty('overflow');
    delete details.dataset.expanded;
  };

  summary.addEventListener('click', (event) => {
    if (preference.matches) return;
    event.preventDefault();
    const startHeight = details.getBoundingClientRect().height;
    const startOpacity = details.open ? getComputedStyle(answer).opacity : '0';
    animation?.cancel();
    answerAnimation?.cancel();
    expanded = !expanded;
    details.dataset.expanded = String(expanded);
    details.style.removeProperty('height');
    details.open = expanded;
    const endHeight = details.getBoundingClientRect().height;
    details.open = true;
    details.style.height = `${startHeight}px`;
    details.style.overflow = 'hidden';
    animation = details.animate(
      [{ height: `${startHeight}px` }, { height: `${endHeight}px` }],
      { duration: 380, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'forwards' },
    );
    answerAnimation = answer.animate(
      [{ opacity: startOpacity }, { opacity: expanded ? 1 : 0 }],
      { duration: expanded ? 300 : 180, easing: 'ease-out', fill: 'forwards' },
    );
    animation.onfinish = finish;
  });
  details.addEventListener('toggle', () => {
    if (!animation) expanded = details.open;
  });
  window.addEventListener('resize', finish);
  preference.addEventListener('change', finish);
});

// A short, bounded magnetic response on desktop; touch keeps its native behavior.
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
document.querySelectorAll<HTMLElement>('.header-cta, .button, .store').forEach((element) => {
  element.addEventListener('pointermove', (event) => {
    if (preference.matches || !finePointer.matches || event.pointerType === 'touch') return;
    const bounds = element.getBoundingClientRect();
    const x = Math.max(-5, Math.min(5, (event.clientX - bounds.left - bounds.width / 2) * 0.07));
    const y = Math.max(-3, Math.min(3, (event.clientY - bounds.top - bounds.height / 2) * 0.07));
    element.style.setProperty('--magnet-x', `${x}px`);
    element.style.setProperty('--magnet-y', `${y}px`);
  });
  const reset = () => {
    element.style.removeProperty('--magnet-x');
    element.style.removeProperty('--magnet-y');
  };
  element.addEventListener('pointerleave', reset);
  element.addEventListener('pointercancel', reset);
  element.addEventListener('blur', reset);
});

// Highlight the section being read, including for keyboard navigation.
const links = document.querySelectorAll<HTMLAnchorElement>('.site-header nav a');
const sections = Array.from(links).map((link) => document.querySelector(link.hash)).filter(Boolean) as HTMLElement[];
const sectionObserver = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (entry.isIntersecting) {
      links.forEach((link) => {
        if (link.hash === `#${entry.target.id}`) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    } else {
      links.forEach((link) => {
        if (link.hash === `#${entry.target.id}`) link.removeAttribute('aria-current');
      });
    }
  }
}, { rootMargin: '-15% 0px -45% 0px', threshold: 0 });
sections.forEach((section) => sectionObserver.observe(section));
