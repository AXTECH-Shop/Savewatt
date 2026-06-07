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
const motionImages = Array.from(document.querySelectorAll('[data-scroll-image]'));
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

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