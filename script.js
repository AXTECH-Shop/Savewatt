const root = document.documentElement;
const themeButton = document.querySelector('[data-theme-toggle]');
const themeLabel = document.querySelector('[data-theme-label]');
const menuButton = document.querySelector('[data-menu-toggle]');
const mobileMenu = document.querySelector('[data-mobile-menu]');
const header = document.querySelector('[data-header]');
const form = document.querySelector('[data-audit-form]');
const statusBox = document.querySelector('[data-form-status]');
const fileInput = document.querySelector('[data-file-input]');
const fileNote = document.querySelector('[data-file-note]');
const auditTool = document.querySelector('[data-audit-tool]');
const toolResult = document.querySelector('[data-tool-result]');
const motionImages = Array.from(document.querySelectorAll('[data-scroll-image]'));
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const COOKIE_CONSENT_KEY = 'savewatt-cookie-consent';
let lastToolReport = null;

const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
const savedTheme = localStorage.getItem('savewatt-theme');
const initialTheme = savedTheme === 'dark' ? 'light' : 'light';

function setTheme(theme) {
  root.dataset.theme = theme;
  localStorage.setItem('savewatt-theme', theme);
  if (themeLabel) themeLabel.textContent = theme === 'dark' ? 'Clair' : 'Sombre';
  if (themeButton) themeButton.setAttribute('aria-label', theme === 'dark' ? 'Activer le thème clair' : 'Activer le thème sombre');
}

function closeMenu() {
  if (!mobileMenu || !menuButton) return;
  mobileMenu.hidden = true;
  mobileMenu.classList.remove('is-open');
  menuButton.setAttribute('aria-expanded', 'false');
}

function openMenu() {
  if (!mobileMenu || !menuButton) return;
  mobileMenu.hidden = false;
  mobileMenu.classList.add('is-open');
  menuButton.setAttribute('aria-expanded', 'true');
  const firstLink = mobileMenu.querySelector('a');
  firstLink?.focus();
}

async function submitAuditRequest() {
  throw new Error("Le connecteur de soumission n'est pas encore configuré.");
}

function setFieldValidity(field, isValid) {
  field.toggleAttribute('aria-invalid', !isValid);
}

function validateFile(file) {
  if (!file) return '';
  const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
  if (!allowedTypes.includes(file.type)) return 'Format refusé. Ajoutez un PDF ou une image.';
  if (file.size > 10 * 1024 * 1024) return 'Fichier trop lourd. La limite actuelle est de 10 Mo.';
  return '';
}

setTheme(initialTheme);

function createCookieBanner() {
  if (localStorage.getItem(COOKIE_CONSENT_KEY)) return;

  const banner = document.createElement('section');
  banner.className = 'cookie-banner';
  banner.setAttribute('aria-label', 'Gestion des cookies');
  banner.innerHTML = `
    <strong>Gestion des cookies</strong>
    <p>SaveWatt utilise uniquement des stockages nécessaires au fonctionnement du site pour le moment. Les mesures d'audience ou cookies marketing ne seront activés qu'après votre accord.</p>
    <div class="cookie-actions">
      <button class="button" type="button" data-cookie-accept>Accepter</button>
      <button class="button button-secondary" type="button" data-cookie-refuse>Refuser</button>
      <a class="cookie-link" href="/cookies/">Lire la politique cookies</a>
    </div>
  `;
  document.body.appendChild(banner);

  banner.querySelector('[data-cookie-accept]')?.addEventListener('click', () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
    window.saveWattCanUseAnalytics = true;
    banner.hidden = true;
  });

  banner.querySelector('[data-cookie-refuse]')?.addEventListener('click', () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'refused');
    window.saveWattCanUseAnalytics = false;
    banner.hidden = true;
  });
}

window.saveWattCanUseAnalytics = localStorage.getItem(COOKIE_CONSENT_KEY) === 'accepted';
createCookieBanner();

themeButton?.addEventListener('click', () => {
  setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark');
});

menuButton?.addEventListener('click', () => {
  if (mobileMenu?.hidden) openMenu();
  else closeMenu();
});

mobileMenu?.addEventListener('click', (event) => {
  if (event.target instanceof HTMLAnchorElement) closeMenu();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeMenu();
    menuButton?.focus();
  }
});

window.addEventListener('scroll', () => {
  header?.classList.toggle('is-scrolled', window.scrollY > 40);
}, { passive: true });

let motionFrame = 0;

function clampMotion(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function updateImageMotion() {
  motionFrame = 0;
  if (reducedMotion.matches) return;

  const viewportHeight = window.innerHeight || 1;
  const viewportWidth = window.innerWidth || 1;

  motionImages.forEach((element) => {
    const rect = element.getBoundingClientRect();
    const isVisible = rect.bottom > -120 && rect.top < viewportHeight + 120;

    if (!isVisible) {
      element.classList.remove('motion-active');
      return;
    }

    const depth = Number(element.dataset.motionDepth || 22);
    const rotate = Number(element.dataset.motionRotate || 3);
    const elementCenterY = rect.top + rect.height / 2;
    const elementCenterX = rect.left + rect.width / 2;
    const verticalOffset = clampMotion((elementCenterY - viewportHeight / 2) / viewportHeight, -1, 1);
    const horizontalOffset = clampMotion((elementCenterX - viewportWidth / 2) / viewportWidth, -1, 1);

    element.style.setProperty('--motion-y', `${(-verticalOffset * depth).toFixed(2)}px`);
    element.style.setProperty('--motion-rx', `${(verticalOffset * rotate).toFixed(2)}deg`);
    element.style.setProperty('--motion-ry', `${(-horizontalOffset * rotate).toFixed(2)}deg`);
    element.style.setProperty('--motion-scale', (1 + (1 - Math.abs(verticalOffset)) * 0.012).toFixed(3));
    element.classList.add('motion-active');
  });
}

function requestImageMotion() {
  if (motionFrame) return;
  motionFrame = window.requestAnimationFrame(updateImageMotion);
}

if (motionImages.length) {
  updateImageMotion();
  window.addEventListener('scroll', requestImageMotion, { passive: true });
  window.addEventListener('resize', requestImageMotion);
}

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.16 });

document.querySelectorAll('.reveal').forEach((element) => observer.observe(element));

fileInput?.addEventListener('change', () => {
  const file = fileInput.files?.[0];
  const message = validateFile(file);
  setFieldValidity(fileInput, !message);
  if (fileNote) fileNote.textContent = message || (file ? `${file.name} prêt pour vérification.` : 'PDF ou image, 10 Mo maximum.');
});

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const requiredFields = form.querySelectorAll('[required]');
  let hasErrors = false;

  requiredFields.forEach((field) => {
    const isValid = field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement ? field.checkValidity() : true;
    setFieldValidity(field, isValid);
    hasErrors = hasErrors || !isValid;
  });

  const fileError = validateFile(fileInput?.files?.[0]);
  if (fileInput) setFieldValidity(fileInput, !fileError);
  hasErrors = hasErrors || Boolean(fileError);

  if (hasErrors) {
    statusBox.textContent = fileError || 'Vérifiez les champs indiqués avant de poursuivre.';
    form.querySelector('[aria-invalid="true"]')?.focus();
    return;
  }

  statusBox.textContent = 'Validation en cours...';
  try {
    await submitAuditRequest(new FormData(form));
    statusBox.textContent = "Votre demande a bien été transmise. Un membre de l'équipe SaveWatt vous recontactera selon le délai indiqué.";
    form.reset();
  } catch (error) {
    statusBox.textContent = "La demande est prête, mais l'envoi n'est pas activé : le connecteur de soumission doit être configuré avant la mise en production.";
  }
});

function parseMoney(value) {
  const cleaned = String(value || '').replace(/[^0-9,.-]/g, '').replace(',', '.');
  return Number(cleaned) || 0;
}

function formatEuros(value) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Math.max(0, value));
}

function scoreSpend(spend) {
  if (spend >= 1000000) return 30;
  if (spend >= 500000) return 26;
  if (spend >= 150000) return 22;
  if (spend >= 50000) return 15;
  return 8;
}

function scoreSector(sector) {
  return {
    collectivite: 12,
    multisite: 14,
    industrie: 14,
    hotel: 10,
    copro: 8,
    tertiaire: 8,
    autre: 5,
  }[sector] || 0;
}

function getBand(score) {
  if (score >= 72) return 'high';
  if (score >= 45) return 'medium';
  return 'low';
}

function setText(selector, value) {
  const element = document.querySelector(selector);
  if (element) element.textContent = value;
}

function updateReportMailto() {
  if (!auditTool || !lastToolReport) return;
  const email = auditTool.querySelector('[name="toolEmail"]')?.value || '';
  const mailto = document.querySelector('[data-mailto-report]');
  const subject = encodeURIComponent(`Pré-diagnostic SaveWatt - score ${lastToolReport.score}`);
  const body = encodeURIComponent(`Bonjour SaveWatt,\n\nJe souhaite recevoir la checklist complète et qualifier ce pré-diagnostic.\n\nScore: ${lastToolReport.score}/100\nRécupération indicative: ${lastToolReport.recoveryRange}\nÉconomie annuelle indicative: ${lastToolReport.savingsRange}\nCEE: ${lastToolReport.ceeStatus}\nEmail: ${email}\n\nMerci.`);
  mailto?.setAttribute('href', `mailto:contact@savewatt.fr?subject=${subject}&body=${body}`);
}

auditTool?.addEventListener('submit', (event) => {
  event.preventDefault();

  const data = new FormData(auditTool);
  const sector = data.get('sector');
  const annualSpend = parseMoney(data.get('annualSpend'));
  const sites = Number(data.get('sites')) || 1;
  const history = Number(data.get('history')) || 12;
  const contractAge = Number(data.get('contractAge')) || 0;
  const signals = data.getAll('signals');
  const requiredFields = auditTool.querySelectorAll('[required]');
  let hasErrors = false;

  requiredFields.forEach((field) => {
    const valid = field.checkValidity();
    field.toggleAttribute('aria-invalid', !valid);
    hasErrors = hasErrors || !valid;
  });

  if (hasErrors || annualSpend <= 0) {
    const spendInput = auditTool.querySelector('[name="annualSpend"]');
    spendInput?.toggleAttribute('aria-invalid', annualSpend <= 0);
    spendInput?.focus();
    return;
  }

  let score = scoreSpend(annualSpend) + scoreSector(sector);
  score += sites >= 10 ? 20 : sites >= 5 ? 16 : sites >= 2 ? 10 : 3;
  score += history >= 60 ? 12 : history >= 36 ? 10 : history >= 24 ? 8 : 4;
  score += contractAge >= 36 ? 14 : contractAge >= 24 ? 10 : contractAge >= 12 ? 5 : 2;
  score += Math.min(signals.length * 7, 30);
  score = Math.min(100, Math.round(score));

  const band = getBand(score);
  const recoveryRates = {
    low: [0.002, 0.01],
    medium: [0.005, 0.025],
    high: [0.01, 0.04],
  }[band];
  const savingsRates = {
    low: [0.01, 0.03],
    medium: [0.02, 0.06],
    high: [0.03, 0.09],
  }[band];

  const recoveryRange = `${formatEuros(annualSpend * recoveryRates[0])} à ${formatEuros(annualSpend * recoveryRates[1])}`;
  const savingsRange = `${formatEuros(annualSpend * savingsRates[0])} à ${formatEuros(annualSpend * savingsRates[1])} / an`;
  const hasCeeSignal = signals.includes('works') || ['collectivite', 'industrie', 'hotel', 'tertiaire'].includes(String(sector));
  const ceeStatus = hasCeeSignal ? 'À vérifier' : 'Secondaire';

  const titles = {
    low: 'Potentiel modéré, à filtrer rapidement',
    medium: 'Potentiel réel à qualifier sur factures',
    high: 'Potentiel prioritaire pour audit complet',
  };
  const summaries = {
    low: 'Le profil ne montre pas encore un signal fort, mais une facture récente peut suffire à écarter ou confirmer une anomalie visible.',
    medium: 'Le niveau de dépense, l’historique ou les signaux déclarés justifient une vérification structurée des factures et contrats.',
    high: 'Le profil combine plusieurs facteurs favorables : dépenses importantes, complexité opérationnelle et signaux de récupération ou d’optimisation.',
  };
  const docs = [
    'Une facture électricité récente et une facture gaz si applicable',
    'Contrat fournisseur ou offre tarifaire actuelle',
    'PDL/PRM pour électricité, PCE pour gaz',
    history >= 24 ? 'Historique 24 à 60 mois de factures' : 'Au moins 12 mois de factures pour confirmer les tendances',
    sites > 1 ? 'Liste des sites avec adresses et fournisseurs' : 'Adresse du site audité',
    signals.includes('works') ? 'Description des travaux envisagés pour vérifier les leviers CEE' : 'Mandat autorisant SaveWatt à contacter le fournisseur si une anomalie est confirmée',
  ];

  setText('[data-score-value]', String(score));
  setText('[data-result-title]', titles[band]);
  setText('[data-result-summary]', summaries[band]);
  setText('[data-recovery-range]', recoveryRange);
  setText('[data-savings-range]', savingsRange);
  setText('[data-cee-status]', ceeStatus);

  const docsList = document.querySelector('[data-next-docs]');
  if (docsList) {
    docsList.innerHTML = '';
    docs.forEach((doc) => {
      const item = document.createElement('li');
      item.textContent = doc;
      docsList.appendChild(item);
    });
  }

  lastToolReport = { score, recoveryRange, savingsRange, ceeStatus };
  updateReportMailto();

  toolResult.hidden = false;
  toolResult.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'nearest' });
});

auditTool?.querySelector('[name="toolEmail"]')?.addEventListener('input', updateReportMailto);