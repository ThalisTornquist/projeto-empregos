const STORAGE_KEY = 'trampofacil-applications';
const LOCAL_API_URL = ['localhost', '127.0.0.1'].includes(window.location.hostname)
  ? 'http://127.0.0.1:8000'
  : '';
const CONFIG = window.TRAMPOFACIL_CONFIG || {};
const API_BASE_URL = CONFIG.apiBaseUrl || LOCAL_API_URL;
const SUPABASE_ENABLED = Boolean(CONFIG.supabaseUrl && CONFIG.supabasePublishableKey);
const statusLabels = {
  applied: 'Candidatura enviada', interview: 'Entrevista', test: 'Teste técnico',
  offer: 'Proposta', rejected: 'Encerrada',
};
const form = document.querySelector('#application-form');
const list = document.querySelector('#application-list');
const statusFilter = document.querySelector('#status-filter');
const storageMessage = document.querySelector('#storage-message');
const storageNote = document.querySelector('.privacy-note');
const trackerContent = document.querySelector('#tracker-content');
const accountPanel = document.querySelector('#account-panel');
const authForm = document.querySelector('#auth-form');
const authMessage = document.querySelector('#auth-message');
const configurationMessage = document.querySelector('#configuration-message');
let applications = [];
let pageError = '';
let supabaseClient = null;
let currentSession = null;

if (SUPABASE_ENABLED && window.supabase?.createClient) {
  supabaseClient = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabasePublishableKey);
}

function showAccountState(session) {
  const isLoggedIn = Boolean(session);
  currentSession = session;
  if (SUPABASE_ENABLED) {
    accountPanel.hidden = false;
    document.querySelector('#account-local-notice').hidden = true;
    document.querySelector('#account-heading').textContent = 'Entre para acompanhar suas vagas';
    document.querySelector('#account-copy').textContent = 'Crie uma conta ou entre para acessar sua lista pessoal, de qualquer dispositivo.';
    document.querySelector('#auth-form').hidden = isLoggedIn;
    document.querySelector('#account-session').hidden = !isLoggedIn;
    trackerContent.hidden = !isLoggedIn || !API_BASE_URL;
    if (isLoggedIn) document.querySelector('#account-email').textContent = session.user.email || 'Conta conectada';
    if (!API_BASE_URL) {
      configurationMessage.hidden = false;
      configurationMessage.textContent = 'A autenticação está pronta, mas falta configurar a URL da API em assets/js/config.js para salvar as candidaturas na sua conta.';
    }
  } else {
    accountPanel.hidden = false;
    document.querySelector('#auth-form').hidden = true;
    document.querySelector('#account-session').hidden = true;
    document.querySelector('#account-heading').textContent = 'Login online ainda não configurado';
    document.querySelector('#account-copy').textContent = 'Por isso você não encontrou os campos de login: esta cópia está rodando sem um projeto Supabase conectado.';
    const localNotice = document.querySelector('#account-local-notice');
    localNotice.hidden = false;
    localNotice.textContent = API_BASE_URL
      ? 'O painel continua funcionando em modo local; os registros ficam no SQLite deste computador. Para ter cadastro e contas separadas, falta criar o Supabase e preencher as configurações de autenticação e API.'
      : 'O painel continua funcionando como demonstração no navegador. Para ter cadastro e contas separadas, falta criar o Supabase e conectar a API hospedada.';
    trackerContent.hidden = false;
  }
}

async function apiRequest(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (SUPABASE_ENABLED) {
    const { data } = await supabaseClient.auth.getSession();
    const accessToken = data.session?.access_token;
    if (!accessToken) throw new Error('Entre na sua conta para carregar suas candidaturas.');
    headers.Authorization = `Bearer ${accessToken}`;
  }
  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.detail || `A API respondeu com o código ${response.status}.`);
  }
  return response.status === 204 ? null : response.json();
}

function loadLocalApplications() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(stored)
      ? stored.filter((item) => item && item.id && item.company && item.role && statusLabels[item.status])
      : [];
  } catch {
    throw new Error('O armazenamento do navegador está indisponível.');
  }
}

function saveLocalApplications() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(applications));
  } catch {
    throw new Error('Não foi possível salvar neste navegador. Confira o espaço disponível.');
  }
}

async function refreshApplications() {
  if (SUPABASE_ENABLED && !currentSession) {
    applications = [];
    pageError = '';
    render();
    return;
  }
  pageError = '';
  try {
    applications = API_BASE_URL ? await apiRequest('/applications') : loadLocalApplications();
  } catch (error) {
    applications = [];
    const apiHost = API_BASE_URL ? new URL(API_BASE_URL).hostname : '';
    pageError = CONFIG.apiBaseUrl && !SUPABASE_ENABLED
      ? 'A API online exige uma conta. Configure a URL e a chave pública do Supabase em assets/js/config.js.'
      : ['localhost', '127.0.0.1'].includes(apiHost) && error.message === 'Failed to fetch'
        ? 'Não consegui acessar a API local. Confira se ela está ligada e se a porta do site está permitida em TRAMPOFACIL_CORS_ORIGINS.'
        : error.message;
  }
  render();
}

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function render() {
  const visibleItems = statusFilter.value === 'all'
    ? applications
    : applications.filter((item) => item.status === statusFilter.value);
  list.replaceChildren();
  document.querySelector('[data-stat-total]').textContent = applications.length;
  document.querySelector('[data-stat-active]').textContent = applications.filter((item) => ['applied', 'interview', 'test'].includes(item.status)).length;
  document.querySelector('[data-stat-interviews]').textContent = applications.filter((item) => item.status === 'interview').length;
  document.querySelector('[data-stat-offers]').textContent = applications.filter((item) => item.status === 'offer').length;
  document.querySelector('[data-list-count]').textContent = `(${visibleItems.length})`;
  document.querySelectorAll('[data-application-count]').forEach((element) => { element.textContent = applications.length; });

  storageMessage.hidden = !pageError;
  storageMessage.textContent = pageError;
  if (storageNote) storageNote.textContent = SUPABASE_ENABLED
    ? 'As candidaturas ficam vinculadas à sua conta e só você pode acessá-las.'
    : API_BASE_URL
      ? 'Modo local: os dados ficam no banco SQLite deste computador.'
      : 'Demonstração: os dados ficam apenas neste navegador, sem conta e sem sincronização.';

  if (pageError) {
    const errorState = makeElement('div', 'empty-state');
    errorState.append(makeElement('span', 'empty-icon', '!'));
    errorState.append(makeElement('h3', '', 'Não foi possível carregar as candidaturas.'));
    errorState.append(makeElement('p', '', pageError));
    list.append(errorState);
    return;
  }
  if (!visibleItems.length) {
    const empty = makeElement('div', 'empty-state');
    empty.append(makeElement('span', 'empty-icon', statusFilter.value === 'all' ? '✳' : '⌕'));
    empty.append(makeElement('h3', '', statusFilter.value === 'all' ? 'Sua próxima oportunidade começa aqui.' : 'Nenhuma vaga nesta etapa.'));
    empty.append(makeElement('p', '', statusFilter.value === 'all' ? 'Depois de se candidatar em outro site, registre a vaga aqui para acompanhar o processo.' : 'Escolha outro filtro ou atualize a etapa de uma candidatura.'));
    list.append(empty);
    return;
  }

  visibleItems.forEach((item) => {
    const card = makeElement('article', 'application-card');
    const top = makeElement('div', 'application-top');
    const info = makeElement('div', 'application-info');
    info.append(makeElement('span', 'application-initial', item.company.trim().charAt(0).toUpperCase()));
    const text = makeElement('div', '');
    text.append(makeElement('h3', '', item.role));
    text.append(makeElement('p', '', item.company));
    info.append(text);
    top.append(info, makeElement('span', `status-pill status-${item.status}`, statusLabels[item.status]));
    card.append(top);

    const meta = makeElement('div', 'application-meta');
    if (item.date) meta.append(makeElement('span', '', `Candidatou-se em ${new Date(`${item.date}T12:00:00`).toLocaleDateString('pt-BR')}`));
    if (item.link) {
      const link = makeElement('a', '', 'Abrir anúncio ↗');
      link.href = item.link;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      meta.append(link);
    }
    if (meta.childElementCount) card.append(meta);

    const actions = makeElement('div', 'application-actions');
    const changeLabel = makeElement('label', 'visually-hidden', `Alterar etapa de ${item.role} na empresa ${item.company}`);
    const change = makeElement('select', 'application-status');
    Object.entries(statusLabels).forEach(([value, label]) => {
      const option = makeElement('option', '', label);
      option.value = value;
      option.selected = value === item.status;
      change.append(option);
    });
    changeLabel.append(change);
    change.addEventListener('change', async () => {
      change.disabled = true;
      try {
        if (API_BASE_URL) await apiRequest(`/applications/${item.id}`, { method: 'PATCH', body: JSON.stringify({ status: change.value }) });
        else {
          applications = applications.map((record) => record.id === item.id ? { ...record, status: change.value } : record);
          saveLocalApplications();
        }
        await refreshApplications();
      } catch (error) { window.alert(error.message); await refreshApplications(); }
    });
    const remove = makeElement('button', 'remove-button', 'Remover');
    remove.type = 'button';
    remove.setAttribute('aria-label', `Remover ${item.role} na empresa ${item.company}`);
    remove.addEventListener('click', async () => {
      if (!window.confirm(`Remover a candidatura para ${item.role} na empresa ${item.company}?`)) return;
      remove.disabled = true;
      try {
        if (API_BASE_URL) await apiRequest(`/applications/${item.id}`, { method: 'DELETE' });
        else { applications = applications.filter((record) => record.id !== item.id); saveLocalApplications(); }
        await refreshApplications();
      } catch (error) { window.alert(error.message); await refreshApplications(); }
    });
    actions.append(changeLabel, remove);
    card.append(actions);
    list.append(card);
  });
}

if (SUPABASE_ENABLED) {
  accountPanel.hidden = false;
  trackerContent.hidden = true;
  if (!supabaseClient) {
    document.querySelector('#auth-form').hidden = true;
    configurationMessage.hidden = false;
    configurationMessage.textContent = 'Não foi possível carregar o cliente de autenticação. Confira sua conexão e recarregue a página.';
  } else {
    supabaseClient.auth.getSession().then(({ data }) => {
      showAccountState(data.session);
      refreshApplications();
    });
    supabaseClient.auth.onAuthStateChange((_event, session) => {
      showAccountState(session);
      refreshApplications();
    });
    authForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const button = event.submitter;
      const email = authForm.elements.email.value.trim();
      const password = authForm.elements.password.value;
      authMessage.textContent = 'Aguarde…';
      authForm.querySelectorAll('button').forEach((control) => { control.disabled = true; });
      try {
        const result = button.dataset.authAction === 'signup'
          ? await supabaseClient.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}${window.location.pathname}` } })
          : await supabaseClient.auth.signInWithPassword({ email, password });
        if (result.error) authMessage.textContent = result.error.message;
        else if (button.dataset.authAction === 'signup' && !result.data.session)
          authMessage.textContent = 'Conta criada. Confirme o e-mail enviado para concluir o cadastro e depois entre.';
        else authMessage.textContent = 'Conta conectada.';
      } catch {
        authMessage.textContent = 'Não foi possível falar com o serviço de login. Confira sua conexão e tente novamente.';
      } finally {
        authForm.querySelectorAll('button').forEach((control) => { control.disabled = false; });
      }
    });
    document.querySelector('#logout-button').addEventListener('click', async () => {
      try {
        const { error } = await supabaseClient.auth.signOut();
        authMessage.textContent = error?.message || 'Você saiu da sua conta.';
      } catch {
        authMessage.textContent = 'Não foi possível encerrar a sessão agora. Tente novamente.';
      }
    });
  }
} else {
  showAccountState(null);
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const rawLink = String(data.get('link')).trim();
  let safeLink = '';
  if (rawLink) {
    try {
      const parsedLink = new URL(rawLink);
      if (!['http:', 'https:'].includes(parsedLink.protocol)) throw new Error('Protocolo inválido');
      safeLink = parsedLink.href;
    } catch {
      form.querySelector('#link').setCustomValidity('Informe um link que comece com http:// ou https://.');
      form.querySelector('#link').reportValidity();
      return;
    }
  }
  form.querySelector('#link').setCustomValidity('');
  const application = {
    company: String(data.get('company')).trim(), role: String(data.get('role')).trim(),
    status: String(data.get('status')), date: String(data.get('date')) || new Date().toISOString().slice(0, 10), link: safeLink || null,
  };
  if (!application.company || !application.role || !statusLabels[application.status]) return;
  const submit = form.querySelector('[type="submit"]');
  submit.disabled = true;
  try {
    if (API_BASE_URL) await apiRequest('/applications', { method: 'POST', body: JSON.stringify(application) });
    else { applications.unshift({ ...application, id: `${Date.now()}-${Math.random().toString(16).slice(2)}` }); saveLocalApplications(); }
    statusFilter.value = 'all';
    form.reset();
    document.querySelector('#date').value = new Date().toISOString().slice(0, 10);
    await refreshApplications();
  } catch (error) { window.alert(error.message); }
  finally { submit.disabled = false; }
});

statusFilter.addEventListener('change', render);
form.querySelector('#link').addEventListener('input', (event) => event.currentTarget.setCustomValidity(''));
document.querySelector('#date').value = new Date().toISOString().slice(0, 10);
if (!SUPABASE_ENABLED) refreshApplications();
