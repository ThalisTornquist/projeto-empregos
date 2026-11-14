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

const CONFIG = window.TRAMPOFACIL_CONFIG || {};
const SUPABASE_ENABLED = Boolean(CONFIG.supabaseUrl && CONFIG.supabasePublishableKey);
const API_BASE_URL = CONFIG.apiBaseUrl || '';
const applicationBadges = document.querySelectorAll('[data-application-count]');

if (SUPABASE_ENABLED && window.supabase?.createClient) {
  window.TRAMPOFACIL_AUTH_CLIENT = window.TRAMPOFACIL_AUTH_CLIENT
    || window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabasePublishableKey);
}

function setApplicationCount(value) {
  applicationBadges.forEach((badge) => {
    badge.hidden = false;
    badge.textContent = String(value);
  });
}

function updateLocalApplicationCount() {
  try {
    const records = JSON.parse(localStorage.getItem('trampofacil-applications') || '[]');
    setApplicationCount(Array.isArray(records) ? records.length : 0);
  } catch {
    setApplicationCount(0);
  }
}

async function updateApplicationCount(session) {
  if (!SUPABASE_ENABLED) {
    updateLocalApplicationCount();
    return;
  }
  if (!session) {
    setApplicationCount(0);
    return;
  }
  if (!API_BASE_URL) {
    setApplicationCount('—');
    return;
  }
  try {
    const response = await fetch(`${API_BASE_URL}/applications`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!response.ok) throw new Error('Could not load application count');
    const records = await response.json();
    if (!Array.isArray(records)) throw new Error('Unexpected application list');
    setApplicationCount(records.length);
  } catch {
    // Preserve a visible, honest state instead of presenting a false zero.
    applicationBadges.forEach((badge) => { badge.hidden = false; badge.textContent = '…'; });
  }
}

function createProfileMenu() {
  if (!siteNav || !SUPABASE_ENABLED || !window.TRAMPOFACIL_AUTH_CLIENT) return;
  const wrapper = document.createElement('div');
  wrapper.className = 'profile-menu';
  wrapper.hidden = true;

  const button = document.createElement('button');
  button.className = 'profile-trigger';
  button.type = 'button';
  button.setAttribute('aria-label', 'Abrir menu da conta');
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-haspopup', 'true');
  const avatar = document.createElement('span');
  avatar.className = 'profile-avatar';
  avatar.setAttribute('aria-hidden', 'true');
  button.append(avatar);

  const dropdown = document.createElement('div');
  dropdown.className = 'profile-dropdown';
  dropdown.hidden = true;
  const email = document.createElement('span');
  email.className = 'profile-email';
  const applicationsLink = document.createElement('a');
  applicationsLink.textContent = 'Minhas candidaturas';
  applicationsLink.href = window.location.pathname.includes('/pages/') ? 'candidaturas.html' : 'pages/candidaturas.html';
  const switchButton = document.createElement('button');
  switchButton.type = 'button';
  switchButton.textContent = 'Trocar de conta';
  const signOutButton = document.createElement('button');
  signOutButton.type = 'button';
  signOutButton.textContent = 'Sair';
  dropdown.append(email, applicationsLink, switchButton, signOutButton);
  wrapper.append(button, dropdown);
  siteNav.append(wrapper);

  button.addEventListener('click', () => {
    const open = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(open));
    dropdown.hidden = !open;
  });
  document.addEventListener('click', (event) => {
    if (!wrapper.contains(event.target)) {
      button.setAttribute('aria-expanded', 'false');
      dropdown.hidden = true;
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      button.setAttribute('aria-expanded', 'false');
      dropdown.hidden = true;
    }
  });

  const endSession = async () => {
    switchButton.disabled = true;
    signOutButton.disabled = true;
    try {
      const { error } = await window.TRAMPOFACIL_AUTH_CLIENT.auth.signOut();
      if (error) throw error;
      // Reopen the tracker from a clean auth state so its login form is always shown.
      window.location.assign(applicationsLink.href);
    } catch {
      switchButton.disabled = false;
      signOutButton.disabled = false;
      window.alert('Não foi possível sair da conta agora. Tente novamente.');
    }
  };
  switchButton.addEventListener('click', endSession);
  signOutButton.addEventListener('click', endSession);

  const renderSession = (session) => {
    wrapper.hidden = !session;
    if (!session) return;
    const user = session.user || {};
    const metadata = user.user_metadata || {};
    email.textContent = user.email || 'Conta conectada';
    const photo = metadata.avatar_url || metadata.picture;
    avatar.replaceChildren();
    if (typeof photo === 'string' && /^https:\/\//i.test(photo)) {
      const image = document.createElement('img');
      image.src = photo;
      image.alt = '';
      image.referrerPolicy = 'no-referrer';
      avatar.append(image);
    } else {
      avatar.innerHTML = '<svg viewBox="0 0 24 24" focusable="false"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>';
    }
  };

  window.TRAMPOFACIL_AUTH_CLIENT.auth.getSession().then(({ data }) => {
    renderSession(data.session);
    updateApplicationCount(data.session);
  });
  window.TRAMPOFACIL_AUTH_CLIENT.auth.onAuthStateChange((_event, session) => {
    renderSession(session);
    updateApplicationCount(session);
  });
}

if (SUPABASE_ENABLED) createProfileMenu();
else updateApplicationCount(null);
