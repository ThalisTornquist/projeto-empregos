const menuToggle = document.querySelector('.menu-toggle');
const siteNav = document.querySelector('.site-nav');

if (menuToggle && siteNav) {
  menuToggle.addEventListener('click', () => {
    const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
    menuToggle.setAttribute('aria-expanded', String(!isOpen));
    siteNav.classList.toggle('is-open', !isOpen);
  });
}

document.querySelectorAll('[data-year]').forEach((element) => {
  element.textContent = new Date().getFullYear();
});

async function updateApplicationCount() {
  const config = window.TRAMPOFACIL_CONFIG || {};
  const badges = document.querySelectorAll('[data-application-count]');
  if (config.supabaseUrl && config.supabasePublishableKey) {
    badges.forEach((element) => { element.hidden = true; });
    return;
  }
  try {
    const applications = JSON.parse(localStorage.getItem('trampofacil-applications') || '[]');
    badges.forEach((element) => { element.textContent = Array.isArray(applications) ? applications.length : '0'; });
  } catch {
    badges.forEach((element) => { element.textContent = '0'; });
  }
}

updateApplicationCount();
