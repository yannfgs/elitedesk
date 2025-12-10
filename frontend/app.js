const API_BASE = "http://127.0.0.1:8000";

// ---- ELEMENTOS DE EVENTO (CARD) ----
const eventoTipo = document.getElementById("evento-tipo");
const eventoDetalhe = document.getElementById("evento-detalhe");
const btnRegistrarEvento = document.getElementById("btn-registrar-evento");

// ---- STATUS PADRÃO ----
const STATUS_OPTIONS = [
  { value: "aberto", label: "Aberto" },
  { value: "em_atendimento", label: "Em atendimento" },
  { value: "aguardando", label: "Aguardando" },
  { value: "concluido", label: "Concluído" },
  { value: "cancelado", label: "Cancelado" },
];

let accessToken = null;
let currentUser = null;
let mostrarMeus = false;

// ELEMENTOS PRINCIPAIS
const selectEmpresa = document.getElementById("empresa");
const selectSetor = document.getElementById("setor");
const selectCategoria = document.getElementById("categoria");
let categoriasPorNome = {};

const form = document.getElementById("ticket-form");
const loginForm = document.getElementById("login-form");
const btnLogout = document.getElementById("btn-logout");
const loginStatusDiv = document.getElementById("login-status");
const mensagemDiv = document.getElementById("mensagem");

const tabelaBody = document.querySelector("#tabela-tickets tbody");
const btnRecarregar = document.getElementById("btn-recarregar");
const btnAplicarFiltros = document.getElementById("btn-aplicar-filtros");
const btnMeus = document.getElementById("btn-meus");
const btnTodos = document.getElementById("btn-todos");

// botões de exportação / impressão da LISTA
const btnListExport = document.getElementById("btn-list-export");
const btnListPrint = document.getElementById("btn-list-print");

// botão de limpar filtros da LISTA
const btnLimparFiltros = document.getElementById("btn-limpar-filtros");

// filtros da LISTA
const filtroStatus = document.getElementById("filtro-status");
const filtroSetor = document.getElementById("filtro-setor");
const filtroPrioridade = document.getElementById("filtro-prioridade");
const filtroProtocolo = document.getElementById("filtro-protocolo");
const filtroDataIni = document.getElementById("filtro-data-ini");
const filtroDataFim = document.getElementById("filtro-data-fim");
const filtroPrazoIni = document.getElementById("filtro-prazo-ini");
const filtroPrazoFim = document.getElementById("filtro-prazo-fim");

// RESUMO GERAL
const resumoTotal = document.getElementById("resumo-total");
const resumoAberto = document.getElementById("resumo-aberto");
const resumoEmAtendimento = document.getElementById("resumo-em_atendimento");
const resumoAguardando = document.getElementById("resumo-aguardando");
const resumoConcluido = document.getElementById("resumo-concluido");
const resumoCancelado = document.getElementById("resumo-cancelado");

// DASHBOARD
const dashDataIni = document.getElementById("dash-data-ini");
const dashDataFim = document.getElementById("dash-data-fim");
const dashResumoTotal = document.getElementById("dash-resumo-total");
const dashResumoAberto = document.getElementById("dash-resumo-aberto");
const dashResumoEmAtendimento = document.getElementById(
  "dash-resumo-em_atendimento"
);
const dashResumoAguardando = document.getElementById("dash-resumo-aguardando");
const dashResumoConcluido = document.getElementById("dash-resumo-concluido");
const btnDashAplicar = document.getElementById("btn-dash-aplicar");
const btnDashExport = document.getElementById("btn-dash-export"); // opcional
const btnDashPrint = document.getElementById("btn-dash-print");
const btnDashLimpar = document.getElementById("btn-dash-limpar");

// TABS
const tabAbertura = document.getElementById("tab-abertura");
const tabLista = document.getElementById("tab-lista");
const tabDashboard = document.getElementById("tab-dashboard");
const viewAbertura = document.getElementById("view-abertura");
const viewLista = document.getElementById("view-lista");
const viewDashboard = document.getElementById("view-dashboard");

// GRÁFICOS
let chartStatus = null;
let chartSetor = null;
let chartResponsavel = null;

// MODAL HISTÓRICO
const modalHistoricoEl = document.getElementById("modalHistorico");
let modalHistorico = null;
if (modalHistoricoEl) {
  modalHistorico = new bootstrap.Modal(modalHistoricoEl);
}

// MODAL VISUALIZAÇÃO DE TICKET
const modalTicketViewEl = document.getElementById("modalTicketView");
let modalTicketView = null;
if (modalTicketViewEl) {
  modalTicketView = new bootstrap.Modal(modalTicketViewEl);
}
const ticketViewBody = document.getElementById("ticket-view-body");
const btnTicketPrint = document.getElementById("btn-ticket-print");

// MODAL DE EVENTO (ícone da coluna AÇÕES)
const modalEventoEl = document.getElementById("modalEvento");
let modalEvento = null;
if (modalEventoEl) {
  modalEvento = new bootstrap.Modal(modalEventoEl);
}
const eventoTicketInfo = document.getElementById("evento-ticket-info");
const eventoTipoModal = document.getElementById("evento-tipo-modal");
const eventoDetalheModal = document.getElementById("evento-detalhe-modal");
const btnSalvarEventoModal = document.getElementById("btn-salvar-evento-modal");
let ticketEventoAlvo = null;

// PRÉ-VISUALIZAÇÃO (ABERTURA)
const previewTitulo = document.getElementById("preview-titulo");
const previewEmpresa = document.getElementById("preview-empresa");
const previewSetor = document.getElementById("preview-setor");
const previewCategoria = document.getElementById("preview-categoria");
const previewPrioridade = document.getElementById("preview-prioridade");
const previewPrazoIdeal = document.getElementById("preview-prazo-ideal");
const previewPrazoLimite = document.getElementById("preview-prazo-limite");
const previewDescricao = document.getElementById("preview-descricao");
const previewContatoNome = document.getElementById("preview-contato-nome");
const previewContatoEmail = document.getElementById("preview-contato-email");
const previewContatoTelefone = document.getElementById(
  "preview-contato-telefone"
);

// ELIA – melhorar texto (ABERTURA)
const eliaSugerirTextoBtn = document.getElementById("elia-sugerir-texto");
const eliaAplicarTextoBtn = document.getElementById("elia-aplicar-texto");
const eliaTituloSugeridoInput = document.getElementById("elia-titulo-sugerido");
const eliaDescricaoSugeridaInput = document.getElementById(
  "elia-descricao-sugerida"
);

// ELIA – análise (LISTA)
let ticketSelecionado = null;
let ticketLinhaSelecionada = null;
const eliaInfoLista = document.getElementById("elia-info-lista");
const eliaResumirTicketBtn = document.getElementById("elia-resumir-ticket");
const eliaPerguntaTicket = document.getElementById("elia-pergunta-ticket");
const eliaPerguntarTicketBtn = document.getElementById("elia-perguntar-ticket");
const eliaRespostaTicketDiv = document.getElementById("elia-resposta-ticket");

// ========= FUNÇÕES UTILITÁRIAS =========

function getAuthHeaders() {
  const headers = {};
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
  return headers;
}

function getAuthJsonHeaders() {
  const headers = getAuthHeaders();
  headers["Content-Type"] = "application/json";
  return headers;
}

function mostrarMensagem(tipo, texto) {
  if (!mensagemDiv) return;
  mensagemDiv.innerHTML = `
    <div class="alert alert-${tipo} py-2 mb-0">
      ${texto}
    </div>`;
  setTimeout(() => (mensagemDiv.innerHTML = ""), 4000);
}

function atualizarLoginStatus() {
  if (!loginStatusDiv) return;
  if (currentUser && accessToken) {
    loginStatusDiv.textContent = `Autenticado como ${currentUser.email} (perfil: ${currentUser.perfil})`;
  } else {
    loginStatusDiv.textContent = "Não autenticado.";
  }
}

function badgeFarol(farol) {
  if (farol === "verde")
    return '<span class="badge badge-farol-verde">Verde</span>';
  if (farol === "amarelo")
    return '<span class="badge badge-farol-amarelo">Amarelo</span>';
  if (farol === "vermelho")
    return '<span class="badge badge-farol-vermelho">Vermelho</span>';
  return farol;
}

function badgeStatus(status) {
  const cls =
    {
      aberto: "status-aberto",
      em_atendimento: "status-em_atendimento",
      aguardando: "status-aguardando",
      concluido: "status-concluido",
      cancelado: "status-cancelado",
    }[status] || "status-aberto";
  return `<span class="badge-status ${cls}">${status}</span>`;
}

function badgePrioridade(prio) {
  const cls =
    {
      baixa: "prio-baixa",
      media: "prio-media",
      alta: "prio-alta",
      critica: "prio-critica",
    }[prio] || "prio-baixa";
  return `<span class="badge-prioridade ${cls}">${prio}</span>`;
}

function montarSelectStatus(valorAtual) {
  let html = `<select class="form-select form-select-sm select-status">`;
  STATUS_OPTIONS.forEach((opt) => {
    const selected = opt.value === valorAtual ? "selected" : "";
    html += `<option value="${opt.value}" ${selected}>${opt.label}</option>`;
  });
  html += `</select>`;
  return html;
}

// helper para copiar apenas um elemento para nova janela e imprimir
function printElementById(id, titulo = "Relatório") {
  const el = document.getElementById(id);
  if (!el) {
    window.print();
    return;
  }
  const win = window.open("", "_blank");
  win.document.write(`
    <html>
      <head>
        <title>${titulo}</title>
        <link
          href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"
          rel="stylesheet"
        />
      </head>
      <body class="p-4">
        <div class="container">
          ${el.outerHTML}
        </div>
      </body>
    </html>
  `);
  win.document.close();
  win.focus();
  win.print();
}

function getPeriodoDashboard() {
  const ini = dashDataIni?.value || "";
  const fim = dashDataFim?.value || "";
  const params = new URLSearchParams();
  if (ini) params.append("data_ini", ini);
  if (fim) params.append("data_fim", fim);
  return params;
}

async function carregarUsuarioAtual() {
  if (!accessToken) {
    currentUser = null;
    atualizarLoginStatus();
    return;
  }
  try {
    const resp = await fetch(`${API_BASE}/users/me`, {
      headers: getAuthHeaders(),
    });
    if (!resp.ok) {
      currentUser = null;
      accessToken = null;
      atualizarLoginStatus();
      return;
    }
    currentUser = await resp.json();
    atualizarLoginStatus();
  } catch (err) {
    console.error(err);
    currentUser = null;
    accessToken = null;
    atualizarLoginStatus();
  }
}

// ========= PRÉ-VISUALIZAÇÃO (ABERTURA) =========

function atualizarPreview() {
  if (!previewTitulo) return;

  previewTitulo.textContent =
    document.getElementById("titulo").value.trim() || "Título do ticket";
  previewEmpresa.textContent = selectEmpresa.value || "Empresa não selecionada";
  previewSetor.textContent = selectSetor.value || "Setor não selecionado";
  previewCategoria.textContent =
    selectCategoria.value || "Categoria não selecionada";

  const prio = document.getElementById("prioridade").value || "baixa";
  previewPrioridade.textContent = prio;
  previewPrioridade.className =
    "badge-prioridade " +
    {
      baixa: "prio-baixa",
      media: "prio-media",
      alta: "prio-alta",
      critica: "prio-critica",
    }[prio];

  previewPrazoIdeal.textContent =
    document.getElementById("prazo_ideal").value || "–";
  previewPrazoLimite.textContent =
    document.getElementById("prazo_limite").value || "–";

  previewDescricao.textContent =
    document.getElementById("descricao").value.trim() ||
    "A descrição aparecerá aqui conforme você digitar.";

  previewContatoNome.textContent =
    document.getElementById("contato_nome").value.trim() || "–";
  previewContatoEmail.textContent =
    document.getElementById("contato_email").value.trim() || "–";
  previewContatoTelefone.textContent =
    document.getElementById("contato_telefone").value.trim() || "–";
}

// ========= ELIA – análise (Lista) =========

function selecionarTicketLista(ticket, linha) {
  ticketSelecionado = ticket;

  // destaca a linha na tabela
  if (ticketLinhaSelecionada) {
    ticketLinhaSelecionada.classList.remove("table-active");
  }
  if (linha) {
    ticketLinhaSelecionada = linha;
    ticketLinhaSelecionada.classList.add("table-active");
  }

  if (eliaInfoLista) {
    eliaInfoLista.textContent = `Ticket ${ticket.numero_protocolo} – ${ticket.titulo}`;
  }
  if (eliaResumirTicketBtn) eliaResumirTicketBtn.disabled = false;
  if (eliaPerguntaTicket) eliaPerguntaTicket.disabled = false;
  if (eliaPerguntarTicketBtn) eliaPerguntarTicketBtn.disabled = false;
  if (btnRegistrarEvento) btnRegistrarEvento.disabled = false;
}

// ========= MODAL DE EVENTO (AÇÕES) =========

function abrirModalEvento(ticket) {
  ticketEventoAlvo = ticket;
  if (eventoTicketInfo) {
    eventoTicketInfo.textContent = `Ticket ${ticket.numero_protocolo} – ${ticket.titulo}`;
  }
  if (eventoTipoModal) eventoTipoModal.value = "anotacao";
  if (eventoDetalheModal) eventoDetalheModal.value = "";
  if (modalEvento) modalEvento.show();
}

// ========= TICKETS =========

async function atualizarStatus(id, novoStatus) {
  if (!accessToken) {
    mostrarMensagem("danger", "Faça login para atualizar status.");
    return;
  }
  try {
    const resp = await fetch(`${API_BASE}/tickets/${id}/status`, {
      method: "PATCH",
      headers: getAuthJsonHeaders(),
      body: JSON.stringify({ status: novoStatus }),
    });

    if (resp.status === 401) {
      mostrarMensagem("danger", "Não autorizado. Faça login novamente.");
      return;
    }

    if (!resp.ok) {
      const erro = await resp.json().catch(() => ({}));
      console.error(erro);
      mostrarMensagem("danger", "Erro ao atualizar status.");
      return;
    }

    mostrarMensagem("success", "Status atualizado com sucesso.");
    carregarTickets();
    carregarResumoGeral();
    if (!viewDashboard.classList.contains("d-none")) {
      carregarDashboard();
    }
  } catch (err) {
    console.error(err);
    mostrarMensagem(
      "danger",
      "Falha de comunicação com a API ao atualizar status."
    );
  }
}

async function assumirTicket(id) {
  if (!accessToken) {
    mostrarMensagem("danger", "Faça login para assumir tickets.");
    return;
  }
  try {
    const resp = await fetch(`${API_BASE}/tickets/${id}/assumir`, {
      method: "PATCH",
      headers: getAuthHeaders(),
    });

    if (resp.status === 401) {
      mostrarMensagem("danger", "Não autorizado. Faça login novamente.");
      return;
    }

    if (!resp.ok) {
      const erro = await resp.json().catch(() => ({}));
      console.error(erro);
      mostrarMensagem("danger", "Erro ao assumir ticket.");
      return;
    }

    mostrarMensagem("success", "Ticket assumido com sucesso.");
    carregarTickets();
    carregarResumoGeral();
    if (!viewDashboard.classList.contains("d-none")) {
      carregarDashboard();
    }
  } catch (err) {
    console.error(err);
    mostrarMensagem(
      "danger",
      "Falha de comunicação com a API ao assumir o ticket."
    );
  }
}

async function carregarTickets() {
  if (!tabelaBody) return;
  tabelaBody.innerHTML = "<tr><td colspan='11'>Carregando...</td></tr>";

  const params = new URLSearchParams();
  if (filtroStatus.value) params.append("status", filtroStatus.value);
  if (filtroSetor.value) params.append("setor", filtroSetor.value);
  if (filtroPrioridade.value)
    params.append("prioridade", filtroPrioridade.value);
  if (filtroProtocolo?.value)
    params.append("protocolo", filtroProtocolo.value.trim());
  // filtros de data ainda não suportados no backend — quando tiver, basta descomentar:
  // if (filtroDataIni.value) params.append("data_ini", filtroDataIni.value);
  // if (filtroDataFim.value) params.append("data_fim", filtroDataFim.value);
  // if (filtroPrazoIni.value) params.append("prazo_ini", filtroPrazoIni.value);
  // if (filtroPrazoFim.value) params.append("prazo_fim", filtroPrazoFim.value);

  if (mostrarMeus) params.append("meus", "true");

  const queryString = params.toString() ? `?${params.toString()}` : "";

  try {
    const resp = await fetch(`${API_BASE}/tickets${queryString}`, {
      headers: getAuthHeaders(),
    });

    if (resp.status === 401) {
      tabelaBody.innerHTML =
        "<tr><td colspan='11'>Não autorizado. Faça login para visualizar os tickets.</td></tr>";
      return;
    }

    if (!resp.ok) {
      throw new Error("Erro ao buscar tickets");
    }
    const dados = await resp.json();

    if (dados.length === 0) {
      tabelaBody.innerHTML =
        "<tr><td colspan='11'>Nenhum ticket encontrado.</td></tr>";
      return;
    }

    tabelaBody.innerHTML = "";
    dados.forEach((t) => {
      const tr = document.createElement("tr");
      tr.classList.add("table-row-compact");
      tr.innerHTML = `
        <td>${t.id}</td>
        <td>${t.numero_protocolo}</td>
        <td>${t.titulo}</td>
        <td>${t.setor}</td>
        <td>${badgePrioridade(t.prioridade)}</td>
        <td>${t.solicitante_email ?? ""}</td>
        <td>${t.responsavel_email ?? ""}</td>
        <td>${badgeFarol(t.farol)}</td>
        <td>${badgeStatus(t.status)}</td>
        <td>${t.data_abertura}</td>
        <td>
          <div class="d-flex flex-wrap gap-1">
            ${montarSelectStatus(t.status)}
            <button class="btn btn-sm btn-primary btn-atualizar-status" title="Salvar status">
              Salvar
            </button>
            <button class="btn btn-sm btn-outline-success btn-assumir" title="Assumir ticket">
              <i class="bi bi-person-check"></i>
            </button>
            <button class="btn btn-sm btn-outline-secondary btn-historico" title="Ver histórico">
              <i class="bi bi-clock-history"></i>
            </button>
            <button class="btn btn-sm btn-outline-dark btn-ver" title="Visualizar ticket">
              <i class="bi bi-eye"></i>
            </button>
            <button class="btn btn-sm btn-outline-secondary btn-evento" title="Registrar evento">
              <i class="bi bi-journal-plus"></i>
            </button>
          </div>
        </td>
      `;

      tr.addEventListener("click", (e) => {
        if (e.target.closest("button")) return;
        selecionarTicketLista(t, tr);
      });

      const selectStatus = tr.querySelector(".select-status");
      const btnAtualizar = tr.querySelector(".btn-atualizar-status");
      const btnAssumir = tr.querySelector(".btn-assumir");
      const btnHistorico = tr.querySelector(".btn-historico");
      const btnVer = tr.querySelector(".btn-ver");
      const btnEvento = tr.querySelector(".btn-evento");

      btnAtualizar.addEventListener("click", (e) => {
        e.stopPropagation();
        selecionarTicketLista(t, tr);
        const novoStatus = selectStatus.value;
        atualizarStatus(t.id, novoStatus);
      });

      btnAssumir.addEventListener("click", (e) => {
        e.stopPropagation();
        selecionarTicketLista(t, tr);
        assumirTicket(t.id);
      });

      btnHistorico.addEventListener("click", (e) => {
        e.stopPropagation();
        selecionarTicketLista(t, tr);
        abrirHistorico(t);
      });

      btnVer.addEventListener("click", (e) => {
        e.stopPropagation();
        selecionarTicketLista(t, tr);
        abrirVisualizacaoTicket(t);
      });

      btnEvento.addEventListener("click", (e) => {
        e.stopPropagation();
        selecionarTicketLista(t, tr);
        abrirModalEvento(t);
      });

      tabelaBody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
    tabelaBody.innerHTML =
      "<tr><td colspan='11'>Erro ao carregar tickets.</td></tr>";
  }
}

// ===== RESUMOS =====
async function carregarResumoGeral() {
  try {
    const resp = await fetch(`${API_BASE}/reports/summary`, {
      headers: getAuthHeaders(),
    });
    if (!resp.ok) return;
    const dados = await resp.json();
    const byStatus = dados.by_status || {};
    resumoTotal.textContent = dados.total ?? 0;
    resumoAberto.textContent = byStatus.aberto ?? 0;
    resumoEmAtendimento.textContent = byStatus.em_atendimento ?? 0;
    resumoAguardando.textContent = byStatus.aguardando ?? 0;
    resumoConcluido.textContent = byStatus.concluido ?? 0;
    resumoCancelado.textContent = byStatus.cancelado ?? 0;
  } catch (err) {
    console.error(err);
  }
}

async function carregarResumoDashboard(params) {
  try {
    const resp = await fetch(
      `${API_BASE}/reports/summary?${params.toString()}`,
      { headers: getAuthHeaders() }
    );
    if (!resp.ok) return;
    const dados = await resp.json();
    const byStatus = dados.by_status || {};
    dashResumoTotal.textContent = dados.total ?? 0;
    dashResumoAberto.textContent = byStatus.aberto ?? 0;
    dashResumoEmAtendimento.textContent = byStatus.em_atendimento ?? 0;
    dashResumoAguardando.textContent = byStatus.aguardando ?? 0;
    dashResumoConcluido.textContent = byStatus.concluido ?? 0;
  } catch (err) {
    console.error(err);
  }
}

// ===== GRÁFICOS =====
function criarChart(ctx, type, labels, values, titulo, chartRef) {
  if (chartRef) chartRef.destroy();
  return new Chart(ctx, {
    type,
    data: {
      labels,
      datasets: [
        {
          label: titulo,
          data: values,
          backgroundColor: [
            "#3b82f6",
            "#22c55e",
            "#f97316",
            "#eab308",
            "#ef4444",
            "#8b5cf6",
          ],
          borderColor: "#ffffff",
          borderWidth: 1,
          tension: 0.3,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: type !== "bar" } },
      scales:
        type === "bar" || type === "line"
          ? {
              y: {
                beginAtZero: true,
                ticks: { stepSize: 1 },
              },
            }
          : {},
    },
  });
}

async function carregarChartStatus(params) {
  try {
    const resp = await fetch(
      `${API_BASE}/reports/by_status?${params.toString()}`,
      { headers: getAuthHeaders() }
    );
    if (!resp.ok) return;
    const dados = await resp.json();
    const labels = dados.data.map((d) => d.status);
    const values = dados.data.map((d) => d.quantidade);
    const ctx = document.getElementById("chart-status").getContext("2d");
    chartStatus = criarChart(
      ctx,
      "pie",
      labels,
      values,
      "Tickets por status",
      chartStatus
    );
  } catch (err) {
    console.error(err);
  }
}

async function carregarChartSetor(params) {
  try {
    const resp = await fetch(
      `${API_BASE}/reports/by_setor?${params.toString()}`,
      { headers: getAuthHeaders() }
    );
    if (!resp.ok) return;
    const dados = await resp.json();
    const labels = dados.data.map((d) => d.setor);
    const values = dados.data.map((d) => d.quantidade);
    const ctx = document.getElementById("chart-setor").getContext("2d");
    chartSetor = criarChart(
      ctx,
      "bar",
      labels,
      values,
      "Tickets por setor",
      chartSetor
    );
  } catch (err) {
    console.error(err);
  }
}

async function carregarChartResponsavel(params) {
  try {
    const resp = await fetch(
      `${API_BASE}/reports/by_responsavel?${params.toString()}`,
      { headers: getAuthHeaders() }
    );
    if (!resp.ok) return;
    const dados = await resp.json();
    const labels = dados.data.map((d) => d.responsavel_email);
    const values = dados.data.map((d) => d.quantidade);
    const ctx = document.getElementById("chart-responsavel").getContext("2d");
    chartResponsavel = criarChart(
      ctx,
      "line",
      labels,
      values,
      "Tickets por responsável",
      chartResponsavel
    );
  } catch (err) {
    console.error(err);
  }
}

async function exportarCsvDashboard(params) {
  try {
    const resp = await fetch(
      `${API_BASE}/reports/export_tickets_csv?${params.toString()}`,
      { headers: getAuthHeaders() }
    );
    if (!resp.ok) throw new Error("Erro ao exportar CSV");

    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tickets.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error(err);
    mostrarMensagem("danger", "Erro ao exportar CSV.");
  }
}

async function carregarDashboard() {
  const params = getPeriodoDashboard();
  await carregarResumoDashboard(params);
  await carregarChartStatus(params);
  await carregarChartSetor(params);
  await carregarChartResponsavel(params);
}

// ===== ENTIDADES =====
async function carregarSetores() {
  try {
    const resp = await fetch(`${API_BASE}/setores`, {
      headers: getAuthHeaders(),
    });
    if (!resp.ok) return;
    const setores = await resp.json();

    if (!setores.length) {
      selectSetor.innerHTML =
        "<option value=''>Nenhum setor cadastrado</option>";
      return;
    }

    selectSetor.innerHTML = "<option value=''>Selecione...</option>";
    setores.forEach((s) => {
      const opt = document.createElement("option");
      opt.value = s.nome;
      opt.textContent = s.nome;
      selectSetor.appendChild(opt);
    });
  } catch (err) {
    console.error(err);
    selectSetor.innerHTML =
      "<option value=''>Erro ao carregar setores</option>";
  }
}

async function carregarEmpresas() {
  try {
    const resp = await fetch(`${API_BASE}/empresas`, {
      headers: getAuthHeaders(),
    });
    if (!resp.ok) return;
    const empresas = await resp.json();

    if (!empresas.length) {
      selectEmpresa.innerHTML =
        "<option value=''>Nenhuma empresa cadastrada</option>";
      selectEmpresa.disabled = true;
      return;
    }

    selectEmpresa.disabled = false;
    selectEmpresa.innerHTML = "<option value=''>Selecione...</option>";
    empresas.forEach((e) => {
      const opt = document.createElement("option");
      opt.value = e.nome_fantasia;
      opt.textContent = e.nome_fantasia;
      selectEmpresa.appendChild(opt);
    });
  } catch (err) {
    console.error(err);
    selectEmpresa.innerHTML =
      "<option value=''>Erro ao carregar empresas</option>";
    selectEmpresa.disabled = true;
  }
}

async function carregarCategorias(setorNome) {
  categoriasPorNome = {};

  if (!setorNome) {
    selectCategoria.innerHTML =
      "<option value=''>Selecione um setor primeiro...</option>";
    selectCategoria.disabled = true;
    return;
  }

  try {
    const resp = await fetch(
      `${API_BASE}/categorias?setor_nome=${encodeURIComponent(setorNome)}`,
      { headers: getAuthHeaders() }
    );
    if (!resp.ok) return;
    const categorias = await resp.json();

    if (!categorias.length) {
      selectCategoria.innerHTML =
        "<option value=''>Nenhuma categoria cadastrada para este setor</option>";
      selectCategoria.disabled = true;
      return;
    }

    selectCategoria.disabled = false;
    selectCategoria.innerHTML = "<option value=''>Selecione...</option>";
    categorias.forEach((c) => {
      categoriasPorNome[c.nome] = c;
      const opt = document.createElement("option");
      opt.value = c.nome;
      opt.textContent = c.nome;
      selectCategoria.appendChild(opt);
    });
  } catch (err) {
    console.error(err);
    selectCategoria.innerHTML =
      "<option value=''>Erro ao carregar categorias</option>";
    selectCategoria.disabled = true;
  }
}

// ===== HISTÓRICO =====
async function abrirHistorico(ticket) {
  if (!accessToken) {
    mostrarMensagem("danger", "Faça login para ver o histórico.");
    return;
  }

  const tbody = document.getElementById("historico-tbody");
  tbody.innerHTML = "<tr><td colspan='4'>Carregando...</td></tr>";
  document.getElementById(
    "modalHistoricoLabel"
  ).textContent = `Histórico - Ticket ${ticket.numero_protocolo} (#${ticket.id})`;

  if (modalHistorico) modalHistorico.show();

  try {
    const resp = await fetch(`${API_BASE}/tickets/${ticket.id}/eventos`, {
      headers: getAuthHeaders(),
    });
    if (resp.status === 401) {
      tbody.innerHTML =
        "<tr><td colspan='4'>Não autorizado. Faça login.</td></tr>";
      return;
    }
    if (!resp.ok) return;
    const eventos = await resp.json();

    if (!eventos.length) {
      tbody.innerHTML =
        "<tr><td colspan='4'>Nenhum evento encontrado.</td></tr>";
      return;
    }

    tbody.innerHTML = "";
    eventos.forEach((e) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${e.data_evento}</td>
        <td>${e.tipo}</td>
        <td>${e.usuario_email ?? ""}</td>
        <td>${e.detalhe ?? ""}</td>`;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
    tbody.innerHTML =
      "<tr><td colspan='4'>Erro ao carregar histórico.</td></tr>";
  }
}

// ===== VISUALIZAÇÃO DE TICKET =====
function abrirVisualizacaoTicket(t) {
  if (!modalTicketView || !ticketViewBody) return;

  const detalhesHtml = `
    <div class="mb-3">
      <div class="d-flex justify-content-between align-items-center">
        <h5 class="mb-0 text-primary">${t.titulo}</h5>
        <span class="badge bg-light text-muted border">
          Protocolo: ${t.numero_protocolo}
        </span>
      </div>
      <div class="small text-muted">
        Aberto em ${t.data_abertura} • Status: ${t.status}
      </div>
    </div>
    <hr />
    <div class="row mb-2">
      <div class="col-md-6">
        <div class="small text-muted">Empresa</div>
        <div>${t.empresa}</div>
      </div>
      <div class="col-md-3">
        <div class="small text-muted">Setor</div>
        <div>${t.setor}</div>
      </div>
      <div class="col-md-3">
        <div class="small text-muted">Categoria</div>
        <div>${t.categoria_nome || "-"}</div>
      </div>
    </div>
    <div class="row mb-2">
      <div class="col-md-3">
        <div class="small text-muted">Prioridade</div>
        <div>${t.prioridade}</div>
      </div>
      <div class="col-md-3">
        <div class="small text-muted">Prazo ideal</div>
        <div>${t.prazo_ideal}</div>
      </div>
      <div class="col-md-3">
        <div class="small text-muted">Prazo limite</div>
        <div>${t.prazo_limite}</div>
      </div>
    </div>
    <div class="mb-2">
      <div class="small text-muted">Solicitante</div>
      <div>${t.solicitante_email || "-"}</div>
    </div>
    <div class="mb-2">
      <div class="small text-muted">Responsável atual</div>
      <div>${t.responsavel_email || "-"}</div>
    </div>
    <hr />
    <div class="mb-3">
      <div class="small text-muted">Descrição</div>
      <div>${t.descricao}</div>
    </div>
    <hr />
    <h6>Histórico de eventos</h6>
    <div id="ticket-eventos-list">
      <div class="small text-muted">Carregando eventos...</div>
    </div>
  `;

  ticketViewBody.innerHTML = detalhesHtml;
  modalTicketView.show();

  // Carregar eventos do backend
  fetch(`${API_BASE}/tickets/${t.id}/eventos`, { headers: getAuthHeaders() })
    .then((resp) => {
      if (!resp.ok) throw new Error("Erro ao buscar eventos");
      return resp.json();
    })
    .then((eventos) => {
      const container = document.getElementById("ticket-eventos-list");
      if (!container) return;

      if (!eventos.length) {
        container.innerHTML =
          '<div class="small text-muted">Nenhum evento registrado.</div>';
        return;
      }

      const itens = eventos
        .map(
          (e) => `
          <div class="border-start ps-2 mb-2">
            <div class="small text-muted">
              ${e.data_evento} • ${e.usuario_email || "-"} • ${e.tipo}
            </div>
            <div>${e.detalhe || ""}</div>
          </div>
        `
        )
        .join("");

      container.innerHTML = itens;
    })
    .catch((err) => {
      console.error(err);
      const container = document.getElementById("ticket-eventos-list");
      if (container) {
        container.innerHTML =
          '<div class="small text-muted text-danger">Erro ao carregar eventos.</div>';
      }
    });
}

if (btnTicketPrint) {
  btnTicketPrint.addEventListener("click", () => {
    // imprime apenas o conteúdo do modal de visualização
    printElementById("ticket-view-body", "Ticket");
  });
}

// ===== ELIA MELHORIA (ABERTURA) =====
eliaSugerirTextoBtn.addEventListener("click", () => {
  const titulo = document.getElementById("titulo").value.trim();
  const descricao = document.getElementById("descricao").value.trim();

  if (!titulo && !descricao) {
    mostrarMensagem(
      "info",
      "Preencha o título e/ou a descrição para a ELIA sugerir melhorias."
    );
    return;
  }

  const tituloSug = titulo
    ? titulo.charAt(0).toUpperCase() + titulo.slice(1)
    : "";
  let descricaoSug = descricao;
  if (descricao) {
    const trimmed = descricao.trim();
    const temPontuacaoFinal = /[.!?]$/.test(trimmed);
    descricaoSug = temPontuacaoFinal ? trimmed : trimmed + ".";
  }

  eliaTituloSugeridoInput.value = tituloSug || titulo;
  eliaDescricaoSugeridaInput.value = descricaoSug || descricao;
  eliaAplicarTextoBtn.disabled = false;
});

eliaAplicarTextoBtn.addEventListener("click", () => {
  const tituloSug = eliaTituloSugeridoInput.value.trim();
  const descricaoSug = eliaDescricaoSugeridaInput.value.trim();

  if (!tituloSug && !descricaoSug) {
    mostrarMensagem("info", "Nenhuma sugestão para aplicar.");
    return;
  }

  if (tituloSug) document.getElementById("titulo").value = tituloSug;
  if (descricaoSug) document.getElementById("descricao").value = descricaoSug;

  atualizarPreview();
  mostrarMensagem(
    "success",
    "Sugestão aplicada. Revise o texto antes de salvar."
  );
});

// ===== ELIA ANÁLISE LISTA =====
eliaResumirTicketBtn.addEventListener("click", () => {
  if (!ticketSelecionado) {
    mostrarMensagem("danger", "Selecione um ticket na tabela.");
    return;
  }
  const t = ticketSelecionado;
  const resumo = [
    `Resumo do ticket ${t.numero_protocolo} (#${t.id}):`,
    "",
    `Título: ${t.titulo}`,
    `Empresa: ${t.empresa}`,
    `Setor: ${t.setor}`,
    `Categoria: ${t.categoria_nome || "não informada"}`,
    `Prioridade: ${t.prioridade}`,
    `Status atual: ${t.status}`,
    `Solicitante: ${t.solicitante_email || "não informado"}`,
    `Responsável: ${t.responsavel_email || "não definido"}`,
    "",
    "Descrição:",
    t.descricao,
  ].join("\n");

  eliaRespostaTicketDiv.textContent = resumo;
});

eliaPerguntarTicketBtn.addEventListener("click", () => {
  if (!ticketSelecionado) {
    mostrarMensagem("danger", "Selecione um ticket na tabela.");
    return;
  }
  const pergunta = eliaPerguntaTicket.value.trim();
  if (!pergunta) {
    mostrarMensagem("info", "Digite uma pergunta para a ELIA.");
    return;
  }

  const t = ticketSelecionado;
  const resposta = [
    `Pergunta sobre o ticket ${t.numero_protocolo}:`,
    `"${pergunta}"`,
    "",
    "[Resposta simulada da ELIA]",
    "Nesta versão, a resposta é um texto de exemplo.",
    "Na futura integração com o ChatGPT, a ELIA analisará o contexto completo do ticket e responderá de forma mais rica.",
  ].join("\n");

  eliaRespostaTicketDiv.textContent = resposta;
});

// ===== REGISTRO DE EVENTO (CARD) =====
if (btnRegistrarEvento) {
  btnRegistrarEvento.addEventListener("click", async () => {
    if (!ticketSelecionado) {
      mostrarMensagem("danger", "Selecione um ticket na tabela.");
      return;
    }
    if (!accessToken) {
      mostrarMensagem("danger", "Faça login para registrar eventos.");
      return;
    }

    const tipo = eventoTipo.value || "anotacao";
    const detalhe = eventoDetalhe.value.trim();

    if (!detalhe) {
      mostrarMensagem("info", "Digite o detalhe do evento.");
      return;
    }

    try {
      const resp = await fetch(
        `${API_BASE}/tickets/${ticketSelecionado.id}/eventos`,
        {
          method: "POST",
          headers: getAuthJsonHeaders(),
          body: JSON.stringify({ tipo, detalhe }),
        }
      );

      if (resp.status === 401) {
        mostrarMensagem("danger", "Não autorizado. Faça login novamente.");
        return;
      }

      if (!resp.ok) {
        const erro = await resp.json().catch(() => ({}));
        console.error(erro);
        mostrarMensagem("danger", "Erro ao registrar evento.");
        return;
      }

      await resp.json();
      mostrarMensagem("success", "Evento registrado com sucesso.");
      eventoDetalhe.value = "";
    } catch (err) {
      console.error(err);
      mostrarMensagem(
        "danger",
        "Falha de comunicação com a API ao registrar evento."
      );
    }
  });
}

// ===== REGISTRO DE EVENTO (MODAL) =====
if (btnSalvarEventoModal) {
  btnSalvarEventoModal.addEventListener("click", async () => {
    if (!ticketEventoAlvo) {
      mostrarMensagem("danger", "Nenhum ticket selecionado para evento.");
      return;
    }
    if (!accessToken) {
      mostrarMensagem("danger", "Faça login para registrar eventos.");
      return;
    }

    const tipo = eventoTipoModal.value || "anotacao";
    const detalhe = eventoDetalheModal.value.trim();
    if (!detalhe) {
      mostrarMensagem("info", "Digite o detalhe do evento.");
      return;
    }

    try {
      const resp = await fetch(
        `${API_BASE}/tickets/${ticketEventoAlvo.id}/eventos`,
        {
          method: "POST",
          headers: getAuthJsonHeaders(),
          body: JSON.stringify({ tipo, detalhe }),
        }
      );
      if (resp.status === 401) {
        mostrarMensagem("danger", "Não autorizado. Faça login novamente.");
        return;
      }
      if (!resp.ok) {
        const erro = await resp.json().catch(() => ({}));
        console.error(erro);
        mostrarMensagem("danger", "Erro ao registrar evento.");
        return;
      }

      await resp.json();
      mostrarMensagem("success", "Evento registrado com sucesso.");
      eventoDetalheModal.value = "";
      if (modalEvento) modalEvento.hide();
    } catch (err) {
      console.error(err);
      mostrarMensagem(
        "danger",
        "Falha de comunicação com a API ao registrar evento."
      );
    }
  });
}

// ===== HANDLERS UI (TABS) =====
tabAbertura.addEventListener("click", () => {
  tabAbertura.classList.add("active");
  tabLista.classList.remove("active");
  tabDashboard.classList.remove("active");
  viewAbertura.classList.remove("d-none");
  viewLista.classList.add("d-none");
  viewDashboard.classList.add("d-none");
});

tabLista.addEventListener("click", () => {
  tabLista.classList.add("active");
  tabAbertura.classList.remove("active");
  tabDashboard.classList.remove("active");
  viewLista.classList.remove("d-none");
  viewAbertura.classList.add("d-none");
  viewDashboard.classList.add("d-none");
  carregarTickets();
});

tabDashboard.addEventListener("click", () => {
  tabDashboard.classList.add("active");
  tabAbertura.classList.remove("active");
  tabLista.classList.remove("active");
  viewDashboard.classList.remove("d-none");
  viewAbertura.classList.add("d-none");
  viewLista.classList.add("d-none");
  carregarDashboard();
});

// LIMPAR FILTROS DA LISTA
if (btnLimparFiltros) {
  btnLimparFiltros.addEventListener("click", () => {
    filtroStatus.value = "";
    filtroSetor.value = "";
    filtroPrioridade.value = "";
    if (filtroProtocolo) filtroProtocolo.value = "";
    if (filtroDataIni) filtroDataIni.value = "";
    if (filtroDataFim) filtroDataFim.value = "";
    if (filtroPrazoIni) filtroPrazoIni.value = "";
    if (filtroPrazoFim) filtroPrazoFim.value = "";
    mostrarMeus = false;
    carregarTickets();
  });
}

// LOGIN
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("login-email").value;
  const senha = document.getElementById("login-senha").value;

  const body = new URLSearchParams();
  body.append("username", email);
  body.append("password", senha);

  try {
    const resp = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!resp.ok) {
      const erro = await resp.json().catch(() => ({}));
      console.error(erro);
      mostrarMensagem("danger", "E-mail ou senha inválidos.");
      return;
    }

    const data = await resp.json();
    accessToken = data.access_token;
    await carregarUsuarioAtual();
    mostrarMensagem("success", "Login realizado com sucesso.");
    carregarTickets();
    carregarResumoGeral();
    if (!viewDashboard.classList.contains("d-none")) {
      carregarDashboard();
    }
  } catch (err) {
    console.error(err);
    mostrarMensagem("danger", "Falha de comunicação ao fazer login.");
  }
});

btnLogout.addEventListener("click", () => {
  accessToken = null;
  currentUser = null;
  atualizarLoginStatus();
  mostrarMensagem("success", "Logout realizado.");
  tabelaBody.innerHTML =
    "<tr><td colspan='11'>Não autenticado. Faça login para visualizar os tickets.</td></tr>";
});

// FORM / PREVIEW
form.addEventListener("input", atualizarPreview);

// SUBMIT TICKET
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!accessToken) {
    mostrarMensagem("danger", "Faça login para abrir tickets.");
    return;
  }

  const payload = {
    empresa: selectEmpresa.value,
    setor: selectSetor.value,
    categoria_nome: selectCategoria.value || null,
    titulo: document.getElementById("titulo").value,
    descricao: document.getElementById("descricao").value,
    prioridade: document.getElementById("prioridade").value,
    prazo_ideal: document.getElementById("prazo_ideal").value,
    prazo_limite: document.getElementById("prazo_limite").value,
    contato_nome: document.getElementById("contato_nome").value,
    contato_email: document.getElementById("contato_email").value,
    contato_telefone: document.getElementById("contato_telefone").value,
  };

  try {
    const resp = await fetch(`${API_BASE}/tickets`, {
      method: "POST",
      headers: getAuthJsonHeaders(),
      body: JSON.stringify(payload),
    });

    if (resp.status === 401) {
      mostrarMensagem("danger", "Não autorizado. Faça login novamente.");
      return;
    }

    if (!resp.ok) {
      const erro = await resp.json().catch(() => ({}));
      console.error(erro);
      mostrarMensagem("danger", "Erro ao criar ticket. Verifique os campos.");
      return;
    }

    const ticket = await resp.json();
    mostrarMensagem(
      "success",
      `Ticket criado com sucesso! Protocolo: ${ticket.numero_protocolo}`
    );
    form.reset();
    eliaTituloSugeridoInput.value = "";
    eliaDescricaoSugeridaInput.value = "";
    eliaAplicarTextoBtn.disabled = false;
    atualizarPreview();
    carregarTickets();
    carregarResumoGeral();
    if (!viewDashboard.classList.contains("d-none")) {
      carregarDashboard();
    }
  } catch (err) {
    console.error(err);
    mostrarMensagem("danger", "Falha de comunicação com a API.");
  }
});

btnRecarregar.addEventListener("click", () => {
  carregarTickets();
  carregarResumoGeral();
  if (!viewDashboard.classList.contains("d-none")) {
    carregarDashboard();
  }
});

btnAplicarFiltros.addEventListener("click", carregarTickets);

btnMeus.addEventListener("click", () => {
  if (!accessToken) {
    mostrarMensagem("danger", "Faça login para ver seus tickets.");
    return;
  }
  mostrarMeus = true;
  carregarTickets();
});

btnTodos.addEventListener("click", () => {
  mostrarMeus = false;
  carregarTickets();
});

selectSetor.addEventListener("change", () => {
  const setorSelecionado = selectSetor.value;
  selectCategoria.innerHTML =
    "<option value=''>Carregando categorias...</option>";
  document.getElementById("prazo_ideal").value = "";
  document.getElementById("prazo_limite").value = "";
  carregarCategorias(setorSelecionado);
  atualizarPreview();
});

selectCategoria.addEventListener("change", atualizarPreview);

// DASHBOARD
btnDashAplicar.addEventListener("click", () => {
  if (!accessToken) {
    mostrarMensagem("danger", "Faça login para ver o dashboard.");
    return;
  }
  carregarDashboard();
});

// LIMPAR FILTROS DO DASHBOARD
if (btnDashLimpar) {
  btnDashLimpar.addEventListener("click", () => {
    if (dashDataIni) dashDataIni.value = "";
    if (dashDataFim) dashDataFim.value = "";
    if (!accessToken) return;
    carregarDashboard();
  });
}

// EXPORTAR CSV DO DASHBOARD (opcional)
if (btnDashExport) {
  btnDashExport.addEventListener("click", () => {
    if (!accessToken) {
      mostrarMensagem("danger", "Faça login para exportar CSV.");
      return;
    }
    const params = getPeriodoDashboard();
    exportarCsvDashboard(params);
  });
}

// EXPORTAR CSV DA LISTA
if (btnListExport) {
  btnListExport.addEventListener("click", async () => {
    if (!accessToken) {
      mostrarMensagem("danger", "Faça login para exportar CSV.");
      return;
    }

    const params = new URLSearchParams();
    if (filtroStatus.value) params.append("status", filtroStatus.value);
    if (filtroSetor.value) params.append("setor", filtroSetor.value);
    if (filtroPrioridade.value)
      params.append("prioridade", filtroPrioridade.value);

    try {
      const resp = await fetch(
        `${API_BASE}/reports/export_tickets_csv?${params.toString()}`,
        { headers: getAuthHeaders() }
      );
      if (!resp.ok) throw new Error("Erro ao exportar CSV");

      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "tickets.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      mostrarMensagem("danger", "Erro ao exportar CSV.");
    }
  });
}

// IMPRIMIR / PDF DA LISTA – SOMENTE A TABELA
if (btnListPrint) {
  btnListPrint.addEventListener("click", () => {
    printElementById("tabela-tickets", "Lista de tickets");
  });
}

// IMPRIMIR / PDF DO DASHBOARD
if (btnDashPrint) {
  btnDashPrint.addEventListener("click", () => {
    printElementById("view-dashboard", "Dashboard de tickets");
  });
}

// INICIALIZAÇÃO
carregarEmpresas();
carregarSetores();
carregarResumoGeral();
carregarTickets();
atualizarPreview();
