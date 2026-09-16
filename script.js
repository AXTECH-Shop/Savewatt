const root = document.documentElement;
const themeButton = document.querySelector('[data-theme-toggle]');
const themeLabel = document.querySelector('[data-theme-label]');
const menuButton = document.querySelector('[data-menu-toggle]');
const mobileMenu = document.querySelector('[data-mobile-menu]');
const header = document.querySelector('[data-header]');
const motionImages = Array.from(document.querySelectorAll('[data-scroll-image]'));
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

function readTheme() {
  try {
    const saved = localStorage.getItem('savewatt-theme');
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // Storage can be unavailable in strict privacy modes.
  }
  return prefersDark.matches ? 'dark' : 'light';
}

function setTheme(theme, persist = true) {
  root.dataset.theme = theme;
  if (persist) {
    try {
      localStorage.setItem('savewatt-theme', theme);
    } catch {
      // The visual preference still applies for the current page.
    }
  }
  const nextLabel = theme === 'dark' ? 'Clair' : 'Sombre';
  if (themeLabel) themeLabel.textContent = nextLabel;
  themeButton?.setAttribute('aria-label', `Activer le thème ${nextLabel.toLowerCase()}`);
}

setTheme(readTheme(), false);

themeButton?.addEventListener('click', () => {
  setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark');
});

function menuLinks() {
  return Array.from(mobileMenu?.querySelectorAll('a, button:not([disabled])') || []);
}

function closeMenu({ restoreFocus = false } = {}) {
  if (!mobileMenu || !menuButton) return;
  mobileMenu.hidden = true;
  mobileMenu.classList.remove('is-open');
  menuButton.setAttribute('aria-expanded', 'false');
  if (restoreFocus) menuButton.focus();
}

function openMenu() {
  if (!mobileMenu || !menuButton) return;
  mobileMenu.hidden = false;
  mobileMenu.classList.add('is-open');
  menuButton.setAttribute('aria-expanded', 'true');
  menuLinks()[0]?.focus();
}

menuButton?.addEventListener('click', () => {
  if (mobileMenu?.hidden) openMenu();
  else closeMenu({ restoreFocus: true });
});

mobileMenu?.addEventListener('click', (event) => {
  if (event.target instanceof HTMLAnchorElement) closeMenu();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && mobileMenu && !mobileMenu.hidden) {
    closeMenu({ restoreFocus: true });
    return;
  }

  if (event.key !== 'Tab' || !mobileMenu || mobileMenu.hidden) return;
  const links = menuLinks();
  if (!links.length) return;
  const first = links[0];
  const last = links[links.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});

window.addEventListener('resize', () => {
  if (window.innerWidth >= 920) closeMenu();
});

window.addEventListener('scroll', () => {
  header?.classList.toggle('is-scrolled', window.scrollY > 40);
}, { passive: true });

const revealTargets = document.querySelectorAll('.reveal, [data-reveal-children], [data-clip-reveal]');

if (reducedMotion.matches || !('IntersectionObserver' in window)) {
  revealTargets.forEach((element) => element.classList.add('is-visible'));
} else {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -4% 0px' });
  revealTargets.forEach((element) => revealObserver.observe(element));
}

const hero = document.querySelector('.hero');
hero?.addEventListener('pointermove', (event) => {
  if (reducedMotion.matches) return;
  const rect = hero.getBoundingClientRect();
  hero.style.setProperty('--spotlight-x', `${((event.clientX - rect.left) / rect.width) * 100}%`);
  hero.style.setProperty('--spotlight-y', `${((event.clientY - rect.top) / rect.height) * 100}%`);
});

document.querySelectorAll('[data-magnetic]').forEach((button) => {
  button.addEventListener('pointermove', (event) => {
    if (reducedMotion.matches || window.innerWidth < 920) return;
    const rect = button.getBoundingClientRect();
    const x = (event.clientX - rect.left - rect.width / 2) * 0.09;
    const y = (event.clientY - rect.top - rect.height / 2) * 0.09;
    button.style.transform = `translate(${x}px, ${y}px)`;
  });
  button.addEventListener('pointerleave', () => button.style.removeProperty('transform'));
});

let motionFrame = 0;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function updateImageMotion() {
  motionFrame = 0;
  if (reducedMotion.matches || window.innerWidth < 768) return;
  const viewportHeight = window.innerHeight || 1;
  const viewportWidth = window.innerWidth || 1;

  motionImages.forEach((element) => {
    const rect = element.getBoundingClientRect();
    if (rect.bottom < -120 || rect.top > viewportHeight + 120) {
      element.classList.remove('motion-active');
      return;
    }
    const vertical = clamp((rect.top + rect.height / 2 - viewportHeight / 2) / viewportHeight, -1, 1);
    const horizontal = clamp((rect.left + rect.width / 2 - viewportWidth / 2) / viewportWidth, -1, 1);
    const depth = Number(element.dataset.motionDepth || 16);
    const rotate = Number(element.dataset.motionRotate || 2);
    const lift = Number(element.dataset.motionLift || 8);
    const proximity = 1 - Math.abs(vertical);
    element.style.setProperty('--motion-y', `${(-vertical * depth).toFixed(2)}px`);
    element.style.setProperty('--motion-rx', `${(vertical * rotate).toFixed(2)}deg`);
    element.style.setProperty('--motion-ry', `${(-horizontal * rotate).toFixed(2)}deg`);
    element.style.setProperty('--motion-z', `${(proximity * lift).toFixed(2)}px`);
    element.style.setProperty('--motion-scale', (1 + proximity * 0.012).toFixed(3));
    element.classList.add('motion-active');
  });
}

function requestImageMotion() {
  if (motionFrame) return;
  motionFrame = window.requestAnimationFrame(updateImageMotion);
}

if (motionImages.length && !reducedMotion.matches) {
  updateImageMotion();
  window.addEventListener('scroll', requestImageMotion, { passive: true });
  window.addEventListener('resize', requestImageMotion);
}

reducedMotion.addEventListener?.('change', () => {
  motionImages.forEach((element) => {
    element.classList.remove('motion-active');
    element.style.removeProperty('--motion-y');
    element.style.removeProperty('--motion-rx');
    element.style.removeProperty('--motion-ry');
    element.style.removeProperty('--motion-z');
    element.style.removeProperty('--motion-scale');
  });
  document.querySelectorAll('[data-magnetic]').forEach((button) => button.style.removeProperty('transform'));
});

function setFieldValidity(field, isValid) {
  if (isValid) field.removeAttribute('aria-invalid');
  else field.setAttribute('aria-invalid', 'true');
}

function formValues(form) {
  const data = new FormData(form);
  const labels = {
    contact: 'Nom et prénom',
    organisation: 'Organisation',
    email: 'E-mail professionnel',
    telephone: 'Téléphone',
    sites: 'Nombre de sites',
    depense: 'Dépense annuelle d’électricité',
    fournisseur: 'Fournisseur actuel',
    echeance: 'Échéance du contrat',
    structure: 'Type de structure',
    equipe: 'Taille de l’équipe',
    territoire: 'Territoire couvert',
    besoin: 'Besoin principal',
    consentement: 'Consentement',
  };
  return Array.from(form.elements)
    .filter((field) => field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement)
    .filter((field) => field.name && field.type !== 'submit')
    .map((field) => {
      const labelText = labels[field.name] || field.name;
      const value = field.type === 'checkbox' ? (field.checked ? 'Oui' : 'Non') : String(data.get(field.name) || '').trim();
      return [labelText, value || 'Non renseigné'];
    });
}

document.querySelectorAll('[data-lead-form]').forEach((form) => {
  const status = form.querySelector('[data-form-status]');

  form.addEventListener('input', (event) => {
    const field = event.target;
    if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement) {
      setFieldValidity(field, field.checkValidity());
    }
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const fields = Array.from(form.querySelectorAll('input, select, textarea'));
    fields.forEach((field) => setFieldValidity(field, field.checkValidity()));
    const firstInvalid = fields.find((field) => !field.checkValidity());

    if (firstInvalid) {
      if (status) status.textContent = 'Vérifiez les champs indiqués avant de préparer votre demande.';
      firstInvalid.focus();
      return;
    }

    const isPartner = form.dataset.leadType === 'partenaire';
    const organisation = form.querySelector('[name="organisation"]')?.value?.trim() || 'organisation à préciser';
    const subject = isPartner
      ? `Demande de démo partenaire SaveWatt — ${organisation}`
      : `Demande de comparatif SaveWatt — ${organisation}`;
    const heading = isPartner ? 'Demande partenaire' : 'Demande entreprise';
    const rows = formValues(form).map(([label, value]) => `${label} : ${value}`);
    const body = [
      `${heading} préparée depuis savewatt.fr`,
      '',
      ...rows,
      '',
      'Aucun document sensible n’est joint à ce message.',
    ].join('\n');
    const mailto = `mailto:contact@savewatt.fr?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    if (status) {
      status.textContent = 'Votre messagerie va s’ouvrir avec un brouillon. La demande ne sera transmise que lorsque vous enverrez ce message.';
    }
    window.location.href = mailto;
  });
});
