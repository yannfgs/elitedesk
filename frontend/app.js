/* EliteDesk app.js (UI + MVP)
   Corrige / adiciona:
   1) Status legível e com cor (inclui "atrasado" quando farol=vermelho)
   2) Botões de ações na lista (ver ticket, histórico, registrar evento)
   3) Prioridade com cores diferentes
   4) Seleção de ticket (linha azul + habilita cards ELIA / Evento)
   5) Pré-visualização viva (inclui Natureza/Canal/Transportadora)
   6) ELIA “Melhorar texto” (stub local) + ELIA lista (resumo/pergunta)
   7) Anotações (localStorage) – adicionar / remover / limpar tudo
*/

(() => {
  const API_BASE = window.ELITEDESK_API_BASE || "http://127.0.0.1:8000";
  const LS_TOKEN_KEY = "elitedesk_access_token";
  const NOTES_LS_KEY = "elitedesk_notas_v1";

  const $ = (id) => document.getElementById(id);

  const STATUS_OPTIONS = [
    { value: "aberto", label: "Aberto" },
    { value: "em_atendimento", label: "Em atendimento" },
    { value: "aguardando", label: "Aguardando" },
    { value: "concluido", label: "Concluído" },
    { value: "cancelado", label: "Cancelado" },
  ];
  const STATUS_LABEL = Object.fromEntries(STATUS_OPTIONS.map((o) => [o.value, o.label]));
  const PRIORIDADE_LABEL = { baixa: "Baixa", media: "Média", alta: "Alta", critica: "Crítica" };

  // Fallback se /reference falhar
  const FALLBACK_REF = {
    empresas: ["Elite Aço", "Multio", "Multiserv", "RodoElite"],
    setores: [
      "Vendas",
      "Logística",
      "Financeiro",
      "SAC & CRM",
      "Contabilidade",
      "Fiscal",
      "Produção",
      "Manutenção",
      "Compras",
      "Obras",
      "PP&D",
    ],
    categorias: [
      "Problema na Entrega",
      "Arrependimento",
      "Avaria de Transporte",
      "Atraso na Entrega",
      "Cliente Comprou Errado",
      "Falta/Troca de Peças",
      "Falta de Acessórios",
      "Problema de Qualidade",
      "Problema Fiscal",
      "Problema na Montagem",
      "Problema no Pagamento",
      "Recobrança",
      "Inadimplência",
      "Orçamento",
      "Cotação",
      "Treinamento",
      "Auditoria",
    ],
    naturezas: ["Venda", "Devolução", "Troca", "Assistência Técnica", "Reposição", "Cobrança", "Ajuste/Alinhamento"],
    canais: [
      "B2B - Representantes",
      "B2B - Vendas Diretas",
      "B2G - Licitações",
      "D2C - Amazon",
      "D2C - Casas Bahia",
      "D2C - Ecommerce Elite Aço",
      "D2C - Americanas",
      "D2C - Magalu",
      "D2C - Mercado Livre",
      "D2C - Shopee",
      "D2C - Webcontinental",
    ],
    transportadoras: [
      "ALFA",
      "BRASPRESS",
      "Correios",
      "ATUAL",
      "J&T",
      "MENGUE",
      "MAGALOG",
      "MIRA",
      "RAPAL",
      "RODONAVES",
      "Solística",
      "TJB",
      "Trans-Império",
      "Mercado Livre",
      "Translovato",
      "TAP",
      "JADLOG",
      "Movimente",
    ],
  };

  let accessToken = localStorage.getItem(LS_TOKEN_KEY) || null;
  let currentUser = null;
  let refData = null;

  let mostrarMeus = false;
  let ticketsById = new Map();
  let ticketsCache = [];
  let ticketSelecionado = null;
  let ticketLinhaSelecionada = null;

  let chartStatus = null;
  let chartSetor = null;
  let chartResponsavel = null;

  // --------------------
  // Helpers
  // --------------------
  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function ensureGlobalMessageArea() {
    if ($("mensagem-global")) return;
    const container = document.querySelector(".container");
    if (!container) return;
    const div = document.createElement("div");
    div.id = "mensagem-global";
    div.className = "mb-3";
    container.insertBefore(div, container.firstChild);
  }

  function getMessageArea() {
    return $("mensagem-global") || $("mensagem") || null;
  }

  function mostrarMensagem(tipo, texto) {
    const div = getMessageArea();
    if (!div) {
      alert(texto);
      return;
    }
    div.innerHTML = `<div class="alert alert-${tipo} py-2 mb-0">${escapeHtml(texto)}</div>`;
    setTimeout(() => (div.innerHTML = ""), 4500);
  }

  async function safeJson(resp) {
    try {
      return await resp.json();
    } catch {
      return null;
    }
  }

  function normalizeText(s) {
    return String(s ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function normalizeStatus(s) {
    const raw = normalizeText(s);
    if (!raw) return "aberto";

    // já é código
    if (STATUS_LABEL[raw]) return raw;

    // rótulos
    const map = {
      aberto: "aberto",
      "em atendimento": "em_atendimento",
      em_atendimento: "em_atendimento",
      aguardando: "aguardando",
      concluido: "concluido",
      cancelado: "cancelado",
    };
    return map[raw] || "aberto";
  }

  function normalizePrioridade(p) {
    const raw = normalizeText(p);
    const map = {
      baixa: "baixa",
      media: "media",
      alta: "alta",
      critica: "critica",
      // aceita rótulos com P1/P2 etc
      "critica (p1)": "critica",
      "alta (p2)": "alta",
      "media (p3)": "media",
      "baixa (p4)": "baixa",
    };
    return map[raw] || "baixa";
  }

  function parseDateAny(dateStr) {
    if (!dateStr) return null;
    if (dateStr instanceof Date) return dateStr;
    const s = String(dateStr).trim();
    if (!s) return null;

    // ISO (YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ss)
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
      const iso = s.includes("T") ? s : `${s.substring(0, 10)}T00:00:00`;
      const d = new Date(iso);
      return isNaN(d.getTime()) ? null : d;
    }

    // BR (DD-MM-YYYY ou DD/MM/YYYY)
    const m = s.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);
    if (m) {
      const dd = m[1], mm = m[2], yyyy = m[3];
      const hh = m[4] || "00", mi = m[5] || "00", ss = m[6] || "00";
      const iso = `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}`;
      const d = new Date(iso);
      return isNaN(d.getTime()) ? null : d;
    }

    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }

  function formatDateTime(dtStr) {
    const d = parseDateAny(dtStr);
    if (!d) return String(dtStr ?? "");
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  async function apiFetch(path, { method = "GET", auth = true, json = true, body, raw = false } = {}) {
    const headers = {};
    if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`;
    if (json && body !== undefined) headers["Content-Type"] = "application/json";

    const resp = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : json ? JSON.stringify(body) : body,
    });

    if (resp.status === 401) {
      if (accessToken) {
        accessToken = null;
        localStorage.removeItem(LS_TOKEN_KEY);
        currentUser = null;
        atualizarLoginStatus();
      }
      const data = await safeJson(resp);
      const err = new Error(data?.detail || "Não autorizado.");
      err.status = 401;
      err.data = data;
      throw err;
    }

    if (!resp.ok) {
      const data = await safeJson(resp);
      const err = new Error(data?.detail || `Erro HTTP ${resp.status}`);
      err.status = resp.status;
      err.data = data;
      throw err;
    }

    if (raw) return resp;

    const ct = resp.headers.get("content-type") || "";
    return ct.includes("application/json") ? await resp.json() : await resp.text();
  }

  // --------------------
  // Tabs
  // --------------------
  function ativarTab(tabIdAtivo, viewIdAtiva) {
    const tabs = ["tab-abertura", "tab-lista", "tab-dashboard", "tab-calendario", "tab-notas"];
    const views = ["view-abertura", "view-lista", "view-dashboard", "view-calendario", "view-notas"];
    tabs.forEach((tid) => $(tid)?.classList.toggle("active", tid === tabIdAtivo));
    views.forEach((vid) => $(vid)?.classList.toggle("d-none", vid !== viewIdAtiva));

    if (viewIdAtiva === "view-notas") renderNotas();
  }

  function bindTabs() {
    $("tab-abertura")?.addEventListener("click", () => ativarTab("tab-abertura", "view-abertura"));
    $("tab-lista")?.addEventListener("click", async () => {
      ativarTab("tab-lista", "view-lista");
      await carregarTickets();
    });
    $("tab-dashboard")?.addEventListener("click", async () => {
      ativarTab("tab-dashboard", "view-dashboard");
      await carregarDashboard();
    });
    $("tab-calendario")?.addEventListener("click", () => ativarTab("tab-calendario", "view-calendario"));
    $("tab-notas")?.addEventListener("click", () => ativarTab("tab-notas", "view-notas"));
  }

  // --------------------
  // Combos / Reference
  // --------------------
  async function carregarReference() {
    try {
      const data = await apiFetch("/reference", { auth: false });
      refData = data && typeof data === "object" ? data : null;
    } catch (err) {
      console.warn("[EliteDesk] /reference falhou, usando fallback local.", err);
      refData = null;
    }
  }

  function refList(key) {
    const v = refData?.[key];
    if (Array.isArray(v) && v.length) return v;
    return FALLBACK_REF[key] || [];
  }

  function fillSelect(sel, values, emptyLabel = "Selecione...") {
    if (!sel) return;
    sel.innerHTML = "";
    if (emptyLabel !== null) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = emptyLabel;
      sel.appendChild(opt);
    }
    (values || []).forEach((v) => {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = v;
      sel.appendChild(opt);
    });
    sel.disabled = false;
  }

  async function carregarCategorias(setorNome) {
    const sel = $("categoria");
    if (!sel) return;

    // Sempre mantém habilitado (pra não “ficar cinza”)
    if (!setorNome) {
      fillSelect(sel, refList("categorias"), "Selecione...");
      return;
    }

    try {
      sel.innerHTML = `<option value="">Carregando categorias...</option>`;
      sel.disabled = true;

      const data = await apiFetch(`/categorias?setor_nome=${encodeURIComponent(setorNome)}`, { auth: false });
      const nomes = (Array.isArray(data) ? data : [])
        .map((c) => (typeof c === "string" ? c : c?.nome))
        .filter(Boolean);

      if (nomes.length) {
        fillSelect(sel, nomes, "Selecione...");
        return;
      }
    } catch {
      // fallback
    }

    fillSelect(sel, refList("categorias"), "Selecione...");
  }

  function preencherCombosDeReference() {
    fillSelect($("empresa"), refList("empresas"), "Selecione...");
    fillSelect($("setor"), refList("setores"), "Selecione...");
    fillSelect($("categoria"), refList("categorias"), "Selecione...");

    fillSelect($("natureza"), refList("naturezas"), "Selecione...");
    fillSelect($("canal"), refList("canais"), "Selecione...");
    fillSelect($("transportadora"), refList("transportadoras"), "Selecione...");

    const filtroSetor = $("filtro-setor");
    if (filtroSetor && filtroSetor.tagName === "SELECT") {
      fillSelect(filtroSetor, refList("setores"), "(Todos)");
    }
  }

  // --------------------
  // Preview (Abertura)
  // --------------------
  function ensurePreviewExtras() {
    const prioEl = $("preview-prioridade");
    const catEl = $("preview-categoria");
    if (!prioEl || !catEl) return;

    const container = prioEl.parentElement; // div .mb-1
    if (!container) return;

    const makeBadge = (icon, id, placeholder) => {
      const span = document.createElement("span");
      span.className = "badge bg-light text-muted border me-1";
      span.innerHTML = `<i class="bi ${icon} me-1"></i><span id="${id}">${escapeHtml(placeholder)}</span>`;
      return span;
    };

    if (!$("preview-natureza")) container.insertBefore(makeBadge("bi-diagram-2", "preview-natureza", "Natureza"), prioEl);
    if (!$("preview-canal")) container.insertBefore(makeBadge("bi-broadcast", "preview-canal", "Canal"), prioEl);
    if (!$("preview-transportadora")) container.insertBefore(makeBadge("bi-truck", "preview-transportadora", "Transportadora"), prioEl);
  }

  function atualizarPreview() {
    const pvTit = $("preview-titulo");
    if (!pvTit) return;

    const empresa = $("empresa")?.value || "Empresa";
    const setor = $("setor")?.value || "Setor";
    const cat = $("categoria")?.value || "Categoria";
    const natureza = $("natureza")?.value || "Natureza";
    const canal = $("canal")?.value || "Canal";
    const transp = $("transportadora")?.value || "Transportadora";

    pvTit.textContent = ($("titulo")?.value || "").trim() || "Título do ticket";
    $("preview-empresa") && ($("preview-empresa").textContent = empresa);
    $("preview-setor") && ($("preview-setor").textContent = setor);
    $("preview-categoria") && ($("preview-categoria").textContent = cat);

    $("preview-natureza") && ($("preview-natureza").textContent = natureza);
    $("preview-canal") && ($("preview-canal").textContent = canal);
    $("preview-transportadora") && ($("preview-transportadora").textContent = transp);

    const prioRaw = $("prioridade")?.value || "baixa";
    const prio = normalizePrioridade(prioRaw);

    const pvPrio = $("preview-prioridade");
    if (pvPrio) {
      pvPrio.textContent = PRIORIDADE_LABEL[prio] || prio;
      pvPrio.className = "badge-prioridade " + ({ baixa: "prio-baixa", media: "prio-media", alta: "prio-alta", critica: "prio-critica" }[prio] || "prio-baixa");
    }

    $("preview-prazo-ideal") && ($("preview-prazo-ideal").textContent = $("prazo_ideal")?.value || "–");
    $("preview-prazo-limite") && ($("preview-prazo-limite").textContent = $("prazo_limite")?.value || "–");

    $("preview-descricao") && ($("preview-descricao").textContent = ($("descricao")?.value || "").trim() || "A descrição aparecerá aqui conforme você digitar.");

    $("preview-contato-nome") && ($("preview-contato-nome").textContent = ($("contato_nome")?.value || "").trim() || "–");
    $("preview-contato-email") && ($("preview-contato-email").textContent = ($("contato_email")?.value || "").trim() || "–");
    $("preview-contato-telefone") && ($("preview-contato-telefone").textContent = ($("contato_telefone")?.value || "").trim() || "–");
  }

  // --------------------
  // ELIA – Melhorar texto (stub local)
  // --------------------
  function eliaGerarSugestao() {
    const titulo = ($("titulo")?.value || "").trim();
    const descricao = ($("descricao")?.value || "").trim();

    if (!titulo && !descricao) {
      mostrarMensagem("warning", "Preencha Título e/ou Descrição para gerar sugestão.");
      return null;
    }

    const ctx = [];
    const addCtx = (k, v) => v && ctx.push(`${k}: ${v}`);

    addCtx("Empresa", $("empresa")?.value);
    addCtx("Setor", $("setor")?.value);
    addCtx("Categoria", $("categoria")?.value);
    addCtx("Natureza", $("natureza")?.value);
    addCtx("Canal", $("canal")?.value);
    addCtx("Transportadora", $("transportadora")?.value);
    addCtx("Prioridade", PRIORIDADE_LABEL[normalizePrioridade($("prioridade")?.value)] || $("prioridade")?.value);
    addCtx("Prazo ideal", $("prazo_ideal")?.value);
    addCtx("Prazo limite", $("prazo_limite")?.value);

    let novoTitulo = titulo || `Ticket - ${$("categoria")?.value || $("setor")?.value || "Assunto"}`;
    novoTitulo = novoTitulo.replace(/\s+/g, " ").trim();
    novoTitulo = novoTitulo.charAt(0).toUpperCase() + novoTitulo.slice(1);

    const baseDesc = descricao || "(Descreva aqui o problema, impacto e dados relevantes.)";
    const novoDesc =
      `Contexto\n- ${ctx.filter(Boolean).join("\n- ")}\n\n` +
      `Descrição\n${baseDesc}\n\n` +
      `Próximo passo sugerido\n- Definir responsável e registrar a próxima ação (ligação/e-mail/contato com transportadora).\n- Atualizar o status e acompanhar o farol/SLA.\n`;

    return { titulo: novoTitulo, descricao: novoDesc };
  }

  function bindEliaMelhorarTexto() {
    $("elia-sugerir-texto")?.addEventListener("click", () => {
      const sug = eliaGerarSugestao();
      if (!sug) return;
      $("elia-titulo-sugerido") && ($("elia-titulo-sugerido").value = sug.titulo);
      $("elia-descricao-sugerida") && ($("elia-descricao-sugerida").value = sug.descricao);
      $("elia-aplicar-texto") && ($("elia-aplicar-texto").disabled = false);
      mostrarMensagem("success", "Sugestão gerada (modo local).");
    });

    $("elia-aplicar-texto")?.addEventListener("click", () => {
      const t = ($("elia-titulo-sugerido")?.value || "").trim();
      const d = ($("elia-descricao-sugerida")?.value || "").trim();
      if (!t && !d) return;

      $("titulo") && ($("titulo").value = t || $("titulo").value);
      $("descricao") && ($("descricao").value = d || $("descricao").value);
      $("elia-aplicar-texto") && ($("elia-aplicar-texto").disabled = true);
      atualizarPreview();
      mostrarMensagem("success", "Sugestão aplicada no formulário.");
    });
  }

  // --------------------
  // Auth
  // --------------------
  function atualizarLoginStatus() {
    const st = $("login-status");
    if (currentUser && accessToken) {
      st && (st.textContent = `Autenticado como ${currentUser.email || "—"} (perfil: ${currentUser.perfil || "—"})`);
    } else {
      st && (st.textContent = "Não autenticado.");
    }
    $("ea-user-name") && ($("ea-user-name").textContent = currentUser?.email || "Não autenticado");
    $("ea-user-role") && ($("ea-user-role").textContent = currentUser?.perfil || "–");
  }

  async function carregarUsuarioAtual() {
    if (!accessToken) {
      currentUser = null;
      atualizarLoginStatus();
      return;
    }
    try {
      currentUser = await apiFetch("/users/me", { auth: true });
    } catch {
      currentUser = null;
    }
    atualizarLoginStatus();
  }

  async function login(email, senha) {
    const body = new URLSearchParams();
    body.append("username", email);
    body.append("password", senha);

    const resp = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!resp.ok) {
      const data = await safeJson(resp);
      throw new Error(data?.detail || "E-mail ou senha inválidos.");
    }

    const data = await resp.json();
    if (!data?.access_token) throw new Error("API não retornou access_token.");

    accessToken = data.access_token;
    localStorage.setItem(LS_TOKEN_KEY, accessToken);
    await carregarUsuarioAtual();
  }

  function logout() {
    accessToken = null;
    currentUser = null;
    localStorage.removeItem(LS_TOKEN_KEY);
    atualizarLoginStatus();

    const tbody = document.querySelector("#tabela-tickets tbody");
    if (tbody) tbody.innerHTML = "<tr><td colspan='11'>Não autenticado. Faça login para visualizar os tickets.</td></tr>";
  }

  // --------------------
  // Tickets (badges + seleção)
  // --------------------
  function badgeFarol(f) {
    if (f === "verde") return '<span class="badge badge-farol-verde">Verde</span>';
    if (f === "amarelo") return '<span class="badge badge-farol-amarelo">Amarelo</span>';
    if (f === "vermelho") return '<span class="badge badge-farol-vermelho">Vermelho</span>';
    return escapeHtml(f ?? "");
  }

  function badgePrioridade(pRaw) {
    const p = normalizePrioridade(pRaw);
    const cls = { baixa: "prio-baixa", media: "prio-media", alta: "prio-alta", critica: "prio-critica" }[p] || "prio-baixa";
    return `<span class="badge-prioridade ${cls}">${escapeHtml(PRIORIDADE_LABEL[p] || p)}</span>`;
  }

  function badgeStatus(statusRaw, farolRaw) {
    const s = normalizeStatus(statusRaw);
    const farol = String(farolRaw || "").toLowerCase();

    let cls =
      { aberto: "status-aberto", em_atendimento: "status-em_atendimento", aguardando: "status-aguardando", concluido: "status-concluido", cancelado: "status-cancelado" }[s] ||
      "status-aberto";

    // “Atrasado” visual se farol vermelho e não concluído/cancelado
    if (farol === "vermelho" && !["concluido", "cancelado"].includes(s)) cls = "status-atrasado";

    return `<span class="badge-status ${cls}">${escapeHtml(STATUS_LABEL[s] || s)}</span>`;
  }

  function montarSelectStatus(valorAtualRaw, idTicket) {
    const valorAtual = normalizeStatus(valorAtualRaw);
    let html = `<select class="form-select form-select-sm select-status" data-id="${idTicket}">`;
    STATUS_OPTIONS.forEach((opt) => {
      const sel = opt.value === valorAtual ? "selected" : "";
      html += `<option value="${opt.value}" ${sel}>${opt.label}</option>`;
    });
    html += `</select>`;
    return html;
  }

  function selecionarTicketLista(ticket, linha) {
    ticketSelecionado = ticket;

    if (ticketLinhaSelecionada) ticketLinhaSelecionada.classList.remove("table-active");
    if (linha) {
      ticketLinhaSelecionada = linha;
      linha.classList.add("table-active");
    }

    $("elia-info-lista") && ($("elia-info-lista").textContent = `Ticket ${ticket.numero_protocolo} – ${ticket.titulo}`);
    $("elia-resumir-ticket")?.removeAttribute("disabled");
    $("elia-pergunta-ticket")?.removeAttribute("disabled");
    $("elia-perguntar-ticket")?.removeAttribute("disabled");
    $("btn-registrar-evento")?.removeAttribute("disabled");
  }

  function buildTicketsQS() {
    const p = new URLSearchParams();
    const add = (k, v) => {
      const s = (v ?? "").toString().trim();
      if (s) p.append(k, s);
    };

    add("status", $("filtro-status")?.value);
    add("setor", $("filtro-setor")?.value);
    add("prioridade", $("filtro-prioridade")?.value);
    add("protocolo", $("filtro-protocolo")?.value);
    add("solicitante", $("filtro-solicitante")?.value);
    add("responsavel", $("filtro-responsavel")?.value);

    add("data_ini", $("filtro-data-ini")?.value);
    add("data_fim", $("filtro-data-fim")?.value);
    add("prazo_ini", $("filtro-prazo-ini")?.value);
    add("prazo_fim", $("filtro-prazo-fim")?.value);

    if (mostrarMeus) add("meus", "true");

    const qs = p.toString();
    return qs ? `?${qs}` : "";
  }

  async function carregarTickets() {
    const tbody = document.querySelector("#tabela-tickets tbody");
    if (!tbody) return;

    if (!accessToken) {
      tbody.innerHTML = "<tr><td colspan='11'>Não autenticado. Faça login para visualizar os tickets.</td></tr>";
      return;
    }

    tbody.innerHTML = "<tr><td colspan='11'>Carregando...</td></tr>";
    ticketsById = new Map();
    ticketsCache = [];

    try {
      const dados = await apiFetch(`/tickets${buildTicketsQS()}`, { auth: true });
      if (!Array.isArray(dados) || !dados.length) {
        tbody.innerHTML = "<tr><td colspan='11'>Nenhum ticket encontrado.</td></tr>";
        return;
      }

      ticketsCache = dados;
      dados.forEach((t) => ticketsById.set(String(t.id), t));

      tbody.innerHTML = "";
      dados.forEach((t) => {
        const tr = document.createElement("tr");
        tr.dataset.id = String(t.id);
        tr.classList.add("table-row-compact");

        const statusCode = normalizeStatus(t.status);
        const prioCode = normalizePrioridade(t.prioridade);

        tr.innerHTML = `
          <td>${escapeHtml(t.id ?? "")}</td>
          <td>${escapeHtml(t.numero_protocolo ?? "")}</td>
          <td>${escapeHtml(t.titulo ?? "")}</td>
          <td>${escapeHtml(t.setor ?? "")}</td>
          <td>${badgePrioridade(prioCode)}</td>
          <td>${escapeHtml(t.solicitante_email ?? "")}</td>
          <td>${escapeHtml(t.responsavel_email ?? "")}</td>
          <td>${badgeFarol(t.farol)}</td>
          <td>${badgeStatus(statusCode, t.farol)}</td>
          <td>${escapeHtml(formatDateTime(t.data_abertura))}</td>
          <td>
            <div class="d-flex flex-wrap gap-1 align-items-center">
              ${montarSelectStatus(statusCode, t.id)}
              <button class="btn btn-sm btn-primary" data-action="salvar-status" data-id="${t.id}">Salvar</button>

              <button class="btn btn-sm btn-outline-success" data-action="assumir" data-id="${t.id}" title="Assumir ticket">
                <i class="bi bi-person-check"></i>
              </button>

              <button class="btn btn-sm btn-outline-secondary" data-action="ver-ticket" data-id="${t.id}" title="Ver ticket">
                <i class="bi bi-eye"></i>
              </button>

              <button class="btn btn-sm btn-outline-secondary" data-action="ver-historico" data-id="${t.id}" title="Ver histórico">
                <i class="bi bi-clock-history"></i>
              </button>

              <button class="btn btn-sm btn-outline-primary" data-action="evento-rapido" data-id="${t.id}" title="Registrar evento">
                <i class="bi bi-journal-plus"></i>
              </button>
            </div>
          </td>
        `;
        tbody.appendChild(tr);
      });
    } catch (err) {
      console.error("carregarTickets:", err);
      tbody.innerHTML = "<tr><td colspan='11'>Erro ao carregar tickets.</td></tr>";
      mostrarMensagem("danger", err?.data?.detail || "Erro ao carregar tickets.");
    }
  }

  async function atualizarStatus(id, novoStatus) {
    try {
      await apiFetch(`/tickets/${id}/status`, { method: "PATCH", auth: true, json: true, body: { status: novoStatus } });
      mostrarMensagem("success", "Status atualizado.");
      await carregarTickets();
      await carregarResumoGeral();
    } catch (err) {
      console.error("atualizarStatus:", err);
      mostrarMensagem("danger", err?.data?.detail || "Erro ao atualizar status.");
    }
  }

  async function assumirTicket(id) {
    try {
      await apiFetch(`/tickets/${id}/assumir`, { method: "PATCH", auth: true, json: false });
      mostrarMensagem("success", "Ticket assumido.");
      await carregarTickets();
      await carregarResumoGeral();
    } catch (err) {
      console.error("assumirTicket:", err);
      mostrarMensagem("danger", err?.data?.detail || "Erro ao assumir ticket (confira se a rota /tickets/{id}/assumir existe no backend).");
    }
  }

  // --------------------
  // Modais (Ticket / Histórico)
  // --------------------
  function ensureModals() {
    if ($("modal-ticket")) return;

    const html = `
      <div class="modal fade" id="modal-ticket" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-lg modal-dialog-scrollable">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="modal-ticket-title">Ticket</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
            </div>
            <div class="modal-body" id="modal-ticket-body"></div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline-secondary btn-sm" id="btn-copiar-protocolo">
                <i class="bi bi-clipboard me-1"></i>Copiar protocolo
              </button>
              <button type="button" class="btn btn-primary btn-sm" data-bs-dismiss="modal">Fechar</button>
            </div>
          </div>
        </div>
      </div>

      <div class="modal fade" id="modal-historico" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-lg modal-dialog-scrollable">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="modal-historico-title">Histórico</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
            </div>
            <div class="modal-body" id="modal-historico-body"></div>
            <div class="modal-footer">
              <button type="button" class="btn btn-primary btn-sm" data-bs-dismiss="modal">Fechar</button>
            </div>
          </div>
        </div>
      </div>
    `;
    const wrap = document.createElement("div");
    wrap.innerHTML = html;
    document.body.appendChild(wrap);
  }

  function showModal(modalId) {
    const el = $(modalId);
    if (!el) return;
    if (window.bootstrap?.Modal) {
      window.bootstrap.Modal.getOrCreateInstance(el).show();
    } else {
      // fallback: sem bootstrap (não deve acontecer)
      el.classList.add("show");
      el.style.display = "block";
    }
  }

  async function copiarTexto(texto) {
    const t = String(texto || "").trim();
    if (!t) return;

    try {
      await navigator.clipboard.writeText(t);
      mostrarMensagem("success", "Copiado para a área de transferência.");
      return;
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = t;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      mostrarMensagem("success", "Copiado para a área de transferência.");
    }
  }

  async function abrirModalTicket(id) {
    const t = ticketsById.get(String(id));
    if (!t) return;

    const statusCode = normalizeStatus(t.status);
    const prioCode = normalizePrioridade(t.prioridade);

    $("modal-ticket-title") && ($("modal-ticket-title").textContent = `${t.numero_protocolo || "Ticket"} — ${t.titulo || ""}`);

    const body = `
      <div class="mb-2">
        ${badgeStatus(statusCode, t.farol)} ${badgeFarol(t.farol)} ${badgePrioridade(prioCode)}
      </div>

      <div class="row g-2 mb-2">
        <div class="col-md-6"><div class="small text-muted">Empresa</div><div>${escapeHtml(t.empresa || "—")}</div></div>
        <div class="col-md-6"><div class="small text-muted">Setor</div><div>${escapeHtml(t.setor || "—")}</div></div>
        <div class="col-md-6"><div class="small text-muted">Categoria</div><div>${escapeHtml(t.categoria_nome || "—")}</div></div>
        <div class="col-md-6"><div class="small text-muted">Responsável</div><div>${escapeHtml(t.responsavel_email || "—")}</div></div>
        <div class="col-md-6"><div class="small text-muted">Solicitante</div><div>${escapeHtml(t.solicitante_email || "—")}</div></div>
        <div class="col-md-6"><div class="small text-muted">Abertura</div><div>${escapeHtml(formatDateTime(t.data_abertura))}</div></div>
      </div>

      <div class="row g-2 mb-2">
        <div class="col-md-4"><div class="small text-muted">Natureza</div><div>${escapeHtml(t.natureza || "—")}</div></div>
        <div class="col-md-4"><div class="small text-muted">Canal</div><div>${escapeHtml(t.canal || "—")}</div></div>
        <div class="col-md-4"><div class="small text-muted">Transportadora</div><div>${escapeHtml(t.transportadora || "—")}</div></div>
      </div>

      <div class="mb-2">
        <div class="small text-muted">Descrição</div>
        <div class="border rounded p-2" style="white-space: pre-wrap;">${escapeHtml(t.descricao || "")}</div>
      </div>

      <div class="row g-2">
        <div class="col-md-4"><div class="small text-muted">Contato</div><div>${escapeHtml(t.contato_nome || "—")}</div></div>
        <div class="col-md-4"><div class="small text-muted">E-mail</div><div>${escapeHtml(t.contato_email || "—")}</div></div>
        <div class="col-md-4"><div class="small text-muted">Telefone</div><div>${escapeHtml(t.contato_telefone || "—")}</div></div>
      </div>
    `;

    $("modal-ticket-body") && ($("modal-ticket-body").innerHTML = body);

    $("btn-copiar-protocolo") &&
      ($("btn-copiar-protocolo").onclick = () => copiarTexto(t.numero_protocolo || ""));

    showModal("modal-ticket");
  }

  async function abrirModalHistorico(id) {
    const t = ticketsById.get(String(id));
    if (!t) return;

    $("modal-historico-title") && ($("modal-historico-title").textContent = `Histórico — ${t.numero_protocolo || "Ticket"}`);

    const container = $("modal-historico-body");
    if (container) container.innerHTML = "<div class='text-muted'>Carregando histórico...</div>";

    try {
      const eventos = await apiFetch(`/tickets/${id}/eventos`, { auth: true });
      const list = Array.isArray(eventos) ? eventos : [];

      if (!list.length) {
        container && (container.innerHTML = "<div class='text-muted'>Nenhum evento registrado.</div>");
      } else {
        const items = list
          .slice()
          .reverse()
          .map((e) => {
            const data = formatDateTime(e.data_evento);
            const tipo = e.tipo || "anotacao";
            const det = e.detalhe || "";
            const user = e.usuario_email || "";
            return `
              <div class="list-group-item">
                <div class="d-flex justify-content-between">
                  <div><strong>${escapeHtml(tipo)}</strong></div>
                  <div class="small text-muted">${escapeHtml(data)}</div>
                </div>
                <div class="small text-muted">${escapeHtml(user)}</div>
                <div style="white-space: pre-wrap;">${escapeHtml(det)}</div>
              </div>
            `;
          })
          .join("");

        container &&
          (container.innerHTML = `<div class="list-group">${items}</div>`);
      }

      showModal("modal-historico");
    } catch (err) {
      console.error("abrirModalHistorico:", err);
      container && (container.innerHTML = "<div class='text-danger'>Erro ao carregar histórico.</div>");
      mostrarMensagem("danger", err?.data?.detail || "Erro ao carregar histórico.");
    }
  }

  // --------------------
  // Registro manual de evento (card da Lista)
  // --------------------
  async function registrarEventoNoSelecionado() {
    if (!ticketSelecionado) {
      mostrarMensagem("warning", "Selecione um ticket na tabela antes de registrar evento.");
      return;
    }

    const tipo = $("evento-tipo")?.value || "anotacao";
    const detalhe = ($("evento-detalhe")?.value || "").trim();

    if (!detalhe) {
      mostrarMensagem("warning", "Preencha o campo DETALHE do evento.");
      return;
    }

    try {
      await apiFetch(`/tickets/${ticketSelecionado.id}/eventos`, {
        method: "POST",
        auth: true,
        json: true,
        body: { tipo, detalhe },
      });

      $("evento-detalhe") && ($("evento-detalhe").value = "");
      mostrarMensagem("success", "Evento registrado com sucesso.");

      // opcional: abrir histórico pra confirmar
      // await abrirModalHistorico(ticketSelecionado.id);
    } catch (err) {
      console.error("registrarEventoNoSelecionado:", err);
      mostrarMensagem("danger", err?.data?.detail || "Erro ao registrar evento.");
    }
  }

  // --------------------
  // ELIA – Lista (stub local)
  // --------------------
  async function getEventosSelecionadoSafe() {
    if (!ticketSelecionado) return [];
    try {
      const ev = await apiFetch(`/tickets/${ticketSelecionado.id}/eventos`, { auth: true });
      return Array.isArray(ev) ? ev : [];
    } catch {
      return [];
    }
  }

  function eliaSetResposta(texto) {
    const div = $("elia-resposta-ticket");
    if (!div) return;
    div.innerHTML = `<pre class="mb-0" style="white-space: pre-wrap;">${escapeHtml(texto)}</pre>`;
  }

  function gerarResumoLocal(t, eventos) {
    const s = normalizeStatus(t.status);
    const p = normalizePrioridade(t.prioridade);

    const linhas = [];
    linhas.push(`Protocolo: ${t.numero_protocolo}`);
    linhas.push(`Título: ${t.titulo}`);
    linhas.push(`Status: ${STATUS_LABEL[s] || s} | Farol: ${t.farol} | Prioridade: ${PRIORIDADE_LABEL[p] || p}`);
    linhas.push(`Empresa: ${t.empresa} | Setor: ${t.setor} | Categoria: ${t.categoria_nome || "—"}`);
    linhas.push(`Natureza: ${t.natureza || "—"} | Canal: ${t.canal || "—"} | Transportadora: ${t.transportadora || "—"}`);
    linhas.push(`Solicitante: ${t.solicitante_email || "—"} | Responsável: ${t.responsavel_email || "—"}`);
    linhas.push(`Abertura: ${formatDateTime(t.data_abertura)}`);
    linhas.push("");
    linhas.push("Descrição:");
    linhas.push(t.descricao || "");
    linhas.push("");

    const ult = (eventos || []).slice().reverse().slice(0, 5);
    if (ult.length) {
      linhas.push("Últimos eventos:");
      ult.forEach((e) => {
        linhas.push(`- ${formatDateTime(e.data_evento)} | ${e.tipo}: ${e.detalhe || ""}`);
      });
      linhas.push("");
    }

    linhas.push("Próximo passo sugerido:");
    if (t.farol === "vermelho" && !["concluido", "cancelado"].includes(s)) {
      linhas.push("- Ticket em ATRASO: registrar ação imediata e atualizar responsável/status.");
    } else {
      linhas.push("- Registrar a próxima interação (cliente/transportadora/fornecedor) e acompanhar o prazo.");
    }

    return linhas.join("\n");
  }

  function responderPerguntaLocal(t, eventos, pergunta) {
    const q = normalizeText(pergunta);
    const s = normalizeStatus(t.status);

    if (!q) return "Escreva uma pergunta para a ELIA responder.";

    if (q.includes("encerrar") || q.includes("concluir") || q.includes("finalizar")) {
      return [
        "Para encerrar com segurança:",
        "1) Confirme com o solicitante/cliente que o problema foi resolvido.",
        "2) Registre um evento final (o que foi feito + evidências).",
        "3) Atualize o status para 'Concluído'.",
        "4) Se houver custo/fornecedor, anexe/registre as referências.",
      ].join("\n");
    }

    if (q.includes("prazo") || q.includes("sla") || q.includes("atras")) {
      return [
        `Status atual: ${STATUS_LABEL[s] || s}`,
        `Farol atual: ${t.farol}`,
        "Sugestão:",
        "- Se estiver amarelo/vermelho, registre a próxima ação e ajuste o responsável agora.",
      ].join("\n");
    }

    return [
      "Resposta (modo local):",
      "- Veja o histórico (botão de relógio) para entender a última ação registrada.",
      "- Se ainda não houver próxima ação definida, registre um evento com o próximo passo e o prazo esperado.",
    ].join("\n");
  }

  async function eliaResumirSelecionado() {
    if (!ticketSelecionado) {
      mostrarMensagem("warning", "Selecione um ticket na tabela primeiro.");
      return;
    }
    const eventos = await getEventosSelecionadoSafe();
    eliaSetResposta(gerarResumoLocal(ticketSelecionado, eventos));
  }

  async function eliaPerguntarSelecionado() {
    if (!ticketSelecionado) {
      mostrarMensagem("warning", "Selecione um ticket na tabela primeiro.");
      return;
    }
    const pergunta = ($("elia-pergunta-ticket")?.value || "").trim();
    const eventos = await getEventosSelecionadoSafe();
    eliaSetResposta(responderPerguntaLocal(ticketSelecionado, eventos, pergunta));
  }

  // --------------------
  // Resumo geral
  // --------------------
  async function carregarResumoGeral() {
    if (!accessToken) return;
    try {
      const dados = await apiFetch("/reports/summary", { auth: true });
      const by = dados.by_status || {};
      $("resumo-total") && ($("resumo-total").textContent = dados.total ?? 0);
      $("resumo-aberto") && ($("resumo-aberto").textContent = by.aberto ?? 0);
      $("resumo-em_atendimento") && ($("resumo-em_atendimento").textContent = by.em_atendimento ?? 0);
      $("resumo-aguardando") && ($("resumo-aguardando").textContent = by.aguardando ?? 0);
      $("resumo-concluido") && ($("resumo-concluido").textContent = by.concluido ?? 0);
      $("resumo-cancelado") && ($("resumo-cancelado").textContent = by.cancelado ?? 0);
    } catch (err) {
      console.warn("carregarResumoGeral:", err);
    }
  }

  // --------------------
  // Dashboard
  // --------------------
  function filtrarTicketsPorPeriodoDashboard(tickets) {
    const iniStr = $("dash-data-ini")?.value || "";
    const fimStr = $("dash-data-fim")?.value || "";
    if (!iniStr && !fimStr) return tickets;

    const ini = iniStr ? new Date(iniStr + "T00:00:00") : null;
    const fim = fimStr ? new Date(fimStr + "T23:59:59") : null;

    return (tickets || []).filter((t) => {
      const d = parseDateAny(t.data_abertura);
      if (!d) return false;
      if (ini && d < ini) return false;
      if (fim && d > fim) return false;
      return true;
    });
  }

  function criarChart(ctx, labels, values, chartRef) {
    if (!window.Chart || !ctx) return null;
    if (chartRef) chartRef.destroy();
    return new Chart(ctx, {
      type: "bar",
      data: { labels, datasets: [{ data: values, borderWidth: 1 }] },
      options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } },
    });
  }

  async function carregarDashboard() {
    if (!accessToken) return;

    try {
      let tickets = await apiFetch("/tickets", { auth: true });
      tickets = Array.isArray(tickets) ? tickets : [];
      tickets = filtrarTicketsPorPeriodoDashboard(tickets);

      const byStatus = tickets.reduce((acc, t) => {
        const s = normalizeStatus(t.status);
        acc[s] = (acc[s] || 0) + 1;
        return acc;
      }, {});

      $("dash-resumo-total") && ($("dash-resumo-total").textContent = tickets.length);
      $("dash-resumo-aberto") && ($("dash-resumo-aberto").textContent = byStatus.aberto || 0);
      $("dash-resumo-em_atendimento") && ($("dash-resumo-em_atendimento").textContent = byStatus.em_atendimento || 0);
      $("dash-resumo-aguardando") && ($("dash-resumo-aguardando").textContent = byStatus.aguardando || 0);
      $("dash-resumo-concluido") && ($("dash-resumo-concluido").textContent = byStatus.concluido || 0);

      chartStatus = criarChart(
        document.getElementById("chart-status")?.getContext("2d"),
        Object.keys(byStatus).map((s) => STATUS_LABEL[s] || s),
        Object.values(byStatus),
        chartStatus
      );

      const bySetor = tickets.reduce((acc, t) => {
        const s = t.setor || "sem_setor";
        acc[s] = (acc[s] || 0) + 1;
        return acc;
      }, {});
      chartSetor = criarChart(
        document.getElementById("chart-setor")?.getContext("2d"),
        Object.keys(bySetor),
        Object.values(bySetor),
        chartSetor
      );

      const byResp = tickets.reduce((acc, t) => {
        const r = t.responsavel_email || "sem_responsavel";
        acc[r] = (acc[r] || 0) + 1;
        return acc;
      }, {});
      chartResponsavel = criarChart(
        document.getElementById("chart-responsavel")?.getContext("2d"),
        Object.keys(byResp),
        Object.values(byResp),
        chartResponsavel
      );
    } catch (err) {
      console.error("carregarDashboard:", err);
      mostrarMensagem("danger", "Erro ao carregar dashboard.");
    }
  }

  // --------------------
  // Export CSV + Print
  // --------------------
  function downloadText(filename, content) {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function csvEscape(v) {
    const s = String(v ?? "");
    if (s.includes('"') || s.includes(",") || s.includes("\n")) return `"${s.replaceAll('"', '""')}"`;
    return s;
  }

  function exportarCSV() {
    if (!ticketsCache.length) return mostrarMensagem("warning", "Não há tickets para exportar.");

    const cols = [
      ["id", "ID"],
      ["numero_protocolo", "Protocolo"],
      ["titulo", "Título"],
      ["empresa", "Empresa"],
      ["setor", "Setor"],
      ["categoria_nome", "Categoria"],
      ["prioridade", "Prioridade"],
      ["status", "Status"],
      ["farol", "Farol"],
      ["solicitante_email", "Solicitante"],
      ["responsavel_email", "Responsável"],
      ["data_abertura", "Abertura"],
    ];

    const header = cols.map((c) => csvEscape(c[1])).join(",");
    const rows = ticketsCache.map((t) =>
      cols
        .map(([k]) => {
          if (k === "status") return csvEscape(STATUS_LABEL[normalizeStatus(t.status)] || t.status);
          if (k === "prioridade") return csvEscape(PRIORIDADE_LABEL[normalizePrioridade(t.prioridade)] || t.prioridade);
          if (k === "data_abertura") return csvEscape(formatDateTime(t.data_abertura));
          return csvEscape(t?.[k]);
        })
        .join(",")
    );

    const csv = [header, ...rows].join("\n");
    downloadText(`elitedesk_tickets_${new Date().toISOString().slice(0, 10)}.csv`, csv);
    mostrarMensagem("success", "CSV gerado.");
  }

  function openPrintWindow(title, bodyHtml) {
    const w = window.open("", "_blank", "width=1100,height=800");
    if (!w) return mostrarMensagem("warning", "Pop-up bloqueado. Permita pop-ups para imprimir.");

    w.document.open();
    w.document.write(`
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(title)}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 16px; }
            h1 { font-size: 18px; margin: 0 0 12px; }
            .meta { color: #555; font-size: 12px; margin-bottom: 12px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 6px; vertical-align: top; }
            th { background: #f3f3f3; text-align: left; }
            .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 10px 0 16px; }
            .card { border: 1px solid #ddd; padding: 10px; border-radius: 8px; }
            .card strong { font-size: 18px; display: block; }
            img { max-width: 100%; }
          </style>
        </head>
        <body>
          ${bodyHtml}
          <script>window.onload = () => window.print();</script>
        </body>
      </html>
    `);
    w.document.close();
  }

  function imprimirListaTickets() {
    if (!ticketsCache.length) return mostrarMensagem("warning", "Não há tickets para imprimir.");

    const rows = ticketsCache
      .map((t) => {
        const s = STATUS_LABEL[normalizeStatus(t.status)] || t.status;
        const p = PRIORIDADE_LABEL[normalizePrioridade(t.prioridade)] || t.prioridade;
        return `
          <tr>
            <td>${escapeHtml(t.id)}</td>
            <td>${escapeHtml(t.numero_protocolo || "")}</td>
            <td>${escapeHtml(t.titulo || "")}</td>
            <td>${escapeHtml(t.setor || "")}</td>
            <td>${escapeHtml(p || "")}</td>
            <td>${escapeHtml(t.solicitante_email || "")}</td>
            <td>${escapeHtml(t.responsavel_email || "")}</td>
            <td>${escapeHtml(t.farol || "")}</td>
            <td>${escapeHtml(s || "")}</td>
            <td>${escapeHtml(formatDateTime(t.data_abertura))}</td>
          </tr>
        `;
      })
      .join("");

    openPrintWindow(
      "EliteDesk — Lista de Tickets",
      `
        <h1>EliteDesk — Lista de Tickets</h1>
        <div class="meta">Gerado em ${escapeHtml(new Date().toLocaleString())}</div>
        <table>
          <thead>
            <tr>
              <th>ID</th><th>Protocolo</th><th>Título</th><th>Setor</th><th>Prioridade</th>
              <th>Solicitante</th><th>Responsável</th><th>Farol</th><th>Status</th><th>Abertura</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      `
    );
  }

  function imprimirDashboard() {
    const ini = $("dash-data-ini")?.value || "—";
    const fim = $("dash-data-fim")?.value || "—";

    const total = $("dash-resumo-total")?.textContent || "0";
    const aberto = $("dash-resumo-aberto")?.textContent || "0";
    const emAt = $("dash-resumo-em_atendimento")?.textContent || "0";
    const aguard = $("dash-resumo-aguardando")?.textContent || "0";
    const concl = $("dash-resumo-concluido")?.textContent || "0";

    const imgStatus = document.getElementById("chart-status")?.toDataURL?.() || "";
    const imgSetor = document.getElementById("chart-setor")?.toDataURL?.() || "";
    const imgResp = document.getElementById("chart-responsavel")?.toDataURL?.() || "";

    openPrintWindow(
      "EliteDesk — Dashboard",
      `
        <h1>EliteDesk — Dashboard</h1>
        <div class="meta">Gerado em ${escapeHtml(new Date().toLocaleString())} — Período: ${escapeHtml(ini)} até ${escapeHtml(fim)}</div>

        <div class="grid">
          <div class="card"><span>Total</span><strong>${escapeHtml(total)}</strong></div>
          <div class="card"><span>Abertos</span><strong>${escapeHtml(aberto)}</strong></div>
          <div class="card"><span>Em atendimento</span><strong>${escapeHtml(emAt)}</strong></div>
          <div class="card"><span>Aguardando</span><strong>${escapeHtml(aguard)}</strong></div>
        </div>

        <div class="grid">
          <div class="card"><span>Concluídos</span><strong>${escapeHtml(concl)}</strong></div>
        </div>

        ${imgStatus ? `<h2>Status</h2><img src="${imgStatus}" />` : ""}
        ${imgSetor ? `<h2>Setor</h2><img src="${imgSetor}" />` : ""}
        ${imgResp ? `<h2>Responsável</h2><img src="${imgResp}" />` : ""}
      `
    );
  }

  // --------------------
  // Anotações (localStorage)
  // --------------------
  function loadNotas() {
    try {
      const raw = localStorage.getItem(NOTES_LS_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  function saveNotas(notas) {
    localStorage.setItem(NOTES_LS_KEY, JSON.stringify(notas || []));
  }

  function renderNotas() {
    const lista = $("lista-notas");
    if (!lista) return;

    const notas = loadNotas();
    if (!notas.length) {
      lista.innerHTML = `<div class="list-group-item small text-muted">Nenhuma anotação cadastrada.</div>`;
      return;
    }

    // ordena por prazo (se tiver) e depois por criado
    const sorted = notas.slice().sort((a, b) => {
      const ap = a.prazo || "";
      const bp = b.prazo || "";
      if (ap && bp && ap !== bp) return ap.localeCompare(bp);
      if (ap && !bp) return -1;
      if (!ap && bp) return 1;
      return String(b.created_at || "").localeCompare(String(a.created_at || ""));
    });

    lista.innerHTML = sorted
      .map((n) => {
        const prazoTxt = n.prazo ? `<div class="small text-muted mt-1"><i class="bi bi-calendar3 me-1"></i>${escapeHtml(n.prazo)}</div>` : "";
        const catTxt = n.categoria ? `<span class="badge bg-light text-dark border">${escapeHtml(n.categoria)}</span>` : "";
        return `
          <div class="list-group-item" data-nota-id="${escapeHtml(n.id)}">
            <div class="d-flex justify-content-between align-items-start gap-2">
              <div>
                <div class="fw-semibold">${escapeHtml(n.titulo || "(Sem título)")}</div>
                <div class="small" style="white-space: pre-wrap;">${escapeHtml(n.descricao || "")}</div>
                <div class="mt-1">${catTxt}</div>
                ${prazoTxt}
              </div>
              <button class="btn btn-outline-danger btn-sm" data-action="nota-excluir" title="Excluir">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </div>
        `;
      })
      .join("");
  }

  function addNota() {
    const titulo = ($("nota-titulo")?.value || "").trim();
    const descricao = ($("nota-descricao")?.value || "").trim();
    const categoria = ($("nota-categoria")?.value || "").trim();
    const prazo = ($("nota-prazo")?.value || "").trim();

    if (!titulo && !descricao) {
      mostrarMensagem("warning", "Preencha Título ou Descrição para salvar a anotação.");
      return;
    }

    const notas = loadNotas();
    notas.push({
      id: String(Date.now()),
      titulo,
      descricao,
      categoria,
      prazo,
      created_at: new Date().toISOString(),
    });
    saveNotas(notas);

    $("nota-titulo") && ($("nota-titulo").value = "");
    $("nota-descricao") && ($("nota-descricao").value = "");
    $("nota-categoria") && ($("nota-categoria").value = "");
    $("nota-prazo") && ($("nota-prazo").value = "");

    renderNotas();
    mostrarMensagem("success", "Anotação adicionada.");
  }

  function limparNotas() {
    if (!confirm("Tem certeza que deseja apagar TODAS as anotações?")) return;
    saveNotas([]);
    renderNotas();
    mostrarMensagem("success", "Anotações apagadas.");
  }

  // --------------------
  // Delegation da tabela
  // --------------------
  function bindTabelaTicketsDelegation() {
    const tbody = document.querySelector("#tabela-tickets tbody");
    if (!tbody) return;

    tbody.addEventListener("click", async (e) => {
      const tr = e.target.closest("tr[data-id]");
      if (!tr) return;

      const id = tr.dataset.id;
      const ticket = ticketsById.get(String(id));
      if (ticket) selecionarTicketLista(ticket, tr);

      const btn = e.target.closest("button[data-action]");
      if (!btn) return;

      e.preventDefault();

      const action = btn.getAttribute("data-action");

      if (action === "salvar-status") {
        const sel = tbody.querySelector(`select.select-status[data-id="${id}"]`);
        return atualizarStatus(id, sel?.value);
      }
      if (action === "assumir") return assumirTicket(id);
      if (action === "ver-ticket") return abrirModalTicket(id);
      if (action === "ver-historico") return abrirModalHistorico(id);
      if (action === "evento-rapido") {
        const box = $("evento-detalhe");
        box?.scrollIntoView({ behavior: "smooth", block: "center" });
        box?.focus();
        return;
      }
    });
  }

  // --------------------
  // Bind UI
  // --------------------
  function bindUI() {
    bindTabs();
    bindTabelaTicketsDelegation();
    bindEliaMelhorarTexto();

    // preview
    $("ticket-form")?.addEventListener("input", atualizarPreview);
    $("empresa")?.addEventListener("change", atualizarPreview);
    $("setor")?.addEventListener("change", async () => {
      await carregarCategorias($("setor")?.value || "");
      atualizarPreview();
    });
    $("categoria")?.addEventListener("change", atualizarPreview);
    $("natureza")?.addEventListener("change", atualizarPreview);
    $("canal")?.addEventListener("change", atualizarPreview);
    $("transportadora")?.addEventListener("change", atualizarPreview);
    $("prioridade")?.addEventListener("change", atualizarPreview);

    // filtros lista
    $("btn-aplicar-filtros")?.addEventListener("click", (e) => {
      e.preventDefault();
      carregarTickets();
    });
    $("btn-limpar-filtros")?.addEventListener("click", () => {
      [
        "filtro-status",
        "filtro-setor",
        "filtro-prioridade",
        "filtro-protocolo",
        "filtro-data-ini",
        "filtro-data-fim",
        "filtro-prazo-ini",
        "filtro-prazo-fim",
        "filtro-solicitante",
        "filtro-responsavel",
      ].forEach((id) => $(id) && ($(id).value = ""));
      mostrarMeus = false;
      carregarTickets();
    });

    $("btn-meus")?.addEventListener("click", () => {
      if (!accessToken) return mostrarMensagem("danger", "Faça login para ver seus tickets.");
      mostrarMeus = true;
      carregarTickets();
    });
    $("btn-todos")?.addEventListener("click", () => {
      mostrarMeus = false;
      carregarTickets();
    });

    $("btn-recarregar")?.addEventListener("click", async () => {
      await carregarTickets();
      await carregarResumoGeral();
      if (!$("view-dashboard")?.classList.contains("d-none")) await carregarDashboard();
    });

    // export/print lista
    $("btn-list-export")?.addEventListener("click", exportarCSV);
    $("btn-list-print")?.addEventListener("click", imprimirListaTickets);

    // dashboard
    $("btn-dash-aplicar")?.addEventListener("click", (e) => {
      e.preventDefault();
      carregarDashboard();
    });
    $("btn-dash-limpar")?.addEventListener("click", () => {
      $("dash-data-ini") && ($("dash-data-ini").value = "");
      $("dash-data-fim") && ($("dash-data-fim").value = "");
      carregarDashboard();
    });
    $("btn-dash-print")?.addEventListener("click", imprimirDashboard);

    // ELIA lista
    $("elia-resumir-ticket")?.addEventListener("click", eliaResumirSelecionado);
    $("elia-perguntar-ticket")?.addEventListener("click", eliaPerguntarSelecionado);

    // registrar evento (lista)
    $("btn-registrar-evento")?.addEventListener("click", registrarEventoNoSelecionado);

    // notas
    $("btn-nota-add")?.addEventListener("click", addNota);
    $("btn-nota-limpar-tudo")?.addEventListener("click", limparNotas);
    $("lista-notas")?.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;
      const item = e.target.closest("[data-nota-id]");
      if (!item) return;
      const id = item.getAttribute("data-nota-id");
      if (!id) return;

      if (btn.getAttribute("data-action") === "nota-excluir") {
        const notas = loadNotas().filter((n) => n.id !== id);
        saveNotas(notas);
        renderNotas();
        mostrarMensagem("success", "Anotação removida.");
      }
    });

    // login
    $("login-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = $("login-email")?.value || "";
      const senha = $("login-senha")?.value || "";
      try {
        await login(email, senha);
        mostrarMensagem("success", "Login realizado com sucesso.");
        await carregarResumoGeral();
        await carregarTickets();
      } catch (err) {
        console.error("login:", err);
        mostrarMensagem("danger", err.message || "Falha de login.");
      }
    });

    $("btn-logout")?.addEventListener("click", () => {
      logout();
      mostrarMensagem("success", "Logout realizado.");
    });

    // criar ticket
    $("ticket-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!accessToken) return mostrarMensagem("danger", "Faça login para abrir tickets.");

      const payload = {
        empresa: $("empresa")?.value || "",
        setor: $("setor")?.value || "",
        categoria_nome: $("categoria")?.value || null,
        natureza: $("natureza")?.value || null,
        canal: $("canal")?.value || null,
        transportadora: $("transportadora")?.value || null,
        titulo: $("titulo")?.value || "",
        descricao: $("descricao")?.value || "",
        prioridade: normalizePrioridade($("prioridade")?.value || "baixa"),
        prazo_ideal: $("prazo_ideal")?.value || null,
        prazo_limite: $("prazo_limite")?.value || null,
        contato_nome: $("contato_nome")?.value || "",
        contato_email: $("contato_email")?.value || "",
        contato_telefone: $("contato_telefone")?.value || "",
      };

      try {
        await apiFetch("/tickets", { method: "POST", auth: true, json: true, body: payload });
        mostrarMensagem("success", "Ticket criado!");
        $("ticket-form")?.reset();
        atualizarPreview();
        await carregarResumoGeral();
      } catch (err) {
        console.error("criar_ticket:", err);
        mostrarMensagem("danger", err?.data?.detail || "Erro ao criar ticket.");
      }
    });
  }

  // --------------------
  // Boot
  // --------------------
  document.addEventListener("DOMContentLoaded", async () => {
    ensureGlobalMessageArea();
    ensureModals();
    ensurePreviewExtras();

    bindUI();
    ativarTab("tab-abertura", "view-abertura");

    await carregarReference();
    preencherCombosDeReference();

    await carregarUsuarioAtual();
    atualizarPreview();
    renderNotas();

    if (accessToken) {
      await carregarResumoGeral();
    }
  });
})();
