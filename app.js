const CHAVE_FILMES = "malu:filmes:v1";
const CHAVE_CONFIGURACOES = "malu:configuracoes:v2";

const configuracoesPadrao = {
  nomeUm: "Maria Bonita",
  nomeDois: "Lampião",
  dataInicio: "2026-08-29T20:59"
};

const elementos = {
  formularioFilme: document.querySelector("#form-filme"),
  titulo: document.querySelector("#titulo"),
  sugeridoPor: document.querySelector("#sugerido-por"),
  lista: document.querySelector("#lista-filmes"),
  estadoVazio: document.querySelector("#estado-vazio"),
  busca: document.querySelector("#busca"),
  abas: [...document.querySelectorAll(".aba")],
  pendentes: document.querySelector("#total-pendentes"),
  assistidos: document.querySelector("#total-assistidos"),
  sorteioPessoa: document.querySelector("#sorteio-pessoa"),
  botaoSortear: document.querySelector("#sortear"),
  resultadoSorteio: document.querySelector("#resultado-sorteio"),
  resultadoTitulo: document.querySelector("#resultado-titulo"),
  resultadoDetalhes: document.querySelector("#resultado-detalhes"),
  marcarSorteado: document.querySelector("#marcar-sorteado"),
  tempo: document.querySelector("#tempo-juntos"),
  proximoAniversario: document.querySelector("#proximo-aniversario"),
  configurarData: document.querySelector("#configurar-data"),
  dialogo: document.querySelector("#configuracoes"),
  abrirConfiguracoes: document.querySelector("#abrir-configuracoes"),
  fecharConfiguracoes: document.querySelector("#fechar-configuracoes"),
  formularioConfiguracoes: document.querySelector("#form-configuracoes"),
  nomeUm: document.querySelector("#nome-um"),
  nomeDois: document.querySelector("#nome-dois"),
  dataInicio: document.querySelector("#data-inicio"),
  exportar: document.querySelector("#exportar"),
  arquivoBackup: document.querySelector("#arquivo-backup"),
  notificacao: document.querySelector("#notificacao")
};

function lerJSON(chave, valorPadrao) {
  try {
    const salvo = localStorage.getItem(chave);
    return salvo ? JSON.parse(salvo) : valorPadrao;
  } catch {
    return valorPadrao;
  }
}

let filmes = lerJSON(CHAVE_FILMES, []);
let configuracoes = { ...configuracoesPadrao, ...lerJSON(CHAVE_CONFIGURACOES, {}) };
let filtroAtual = "todos";
let filmeSorteadoId = null;
let temporizadorNotificacao;

function criarId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function salvarDados() {
  try {
    localStorage.setItem(CHAVE_FILMES, JSON.stringify(filmes));
    localStorage.setItem(CHAVE_CONFIGURACOES, JSON.stringify(configuracoes));
  } catch {
    notificar("Não foi possível salvar. Verifique o espaço do navegador.");
  }
}

function notificar(mensagem) {
  clearTimeout(temporizadorNotificacao);
  elementos.notificacao.textContent = mensagem;
  elementos.notificacao.classList.add("visivel");
  temporizadorNotificacao = setTimeout(() => elementos.notificacao.classList.remove("visivel"), 2800);
}

function normalizarTexto(texto) {
  return String(texto || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function formatarData(data) {
  if (!data) return "";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(data));
}

function opcoesPessoas() {
  return [configuracoes.nomeUm, configuracoes.nomeDois].filter((nome, indice, todos) => nome && todos.indexOf(nome) === indice);
}

function preencherSelect(select, opcoes, rotuloInicial, valorAnterior = "") {
  select.replaceChildren();
  if (rotuloInicial !== null) {
    const inicial = document.createElement("option");
    inicial.value = "";
    inicial.textContent = rotuloInicial;
    select.append(inicial);
  }
  opcoes.forEach(valor => {
    const option = document.createElement("option");
    option.value = valor;
    option.textContent = valor;
    select.append(option);
  });
  if ([...select.options].some(option => option.value === valorAnterior)) select.value = valorAnterior;
}

function atualizarSelects() {
  const pessoaFormulario = elementos.sugeridoPor.value;
  const pessoaSorteio = elementos.sorteioPessoa.value;
  const pessoas = opcoesPessoas();

  preencherSelect(elementos.sugeridoPor, pessoas, null, pessoaFormulario);
  preencherSelect(elementos.sorteioPessoa, pessoas, "De qualquer pessoa", pessoaSorteio);
}

function criarItemFilme(filme) {
  const item = document.createElement("li");
  item.className = `filme${filme.assistido ? " assistido" : ""}`;

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "filme-check";
  checkbox.checked = filme.assistido;
  checkbox.setAttribute("aria-label", `${filme.assistido ? "Marcar como não assistido" : "Marcar como assistido"}: ${filme.titulo}`);
  checkbox.addEventListener("change", () => atualizarStatusFilme(filme.id, checkbox.checked));

  const conteudo = document.createElement("div");
  conteudo.className = "filme-conteudo";
  const titulo = document.createElement("strong");
  titulo.className = "filme-titulo";
  titulo.textContent = filme.titulo;
  const meta = document.createElement("div");
  meta.className = "filme-meta";
  const detalhes = [filme.sugeridoPor ? `indicação de ${filme.sugeridoPor}` : ""].filter(Boolean);
  if (filme.assistidoEm) detalhes.push(`assistido em ${formatarData(filme.assistidoEm)}`);
  detalhes.forEach((detalhe, indice) => {
    const parte = document.createElement("span");
    parte.textContent = indice ? `• ${detalhe}` : detalhe;
    meta.append(parte);
  });
  conteudo.append(titulo, meta);

  const remover = document.createElement("button");
  remover.type = "button";
  remover.className = "botao-icone remover";
  remover.textContent = "×";
  remover.setAttribute("aria-label", `Remover ${filme.titulo}`);
  remover.title = "Remover filme";
  remover.addEventListener("click", () => removerFilme(filme.id));

  item.append(checkbox, conteudo, remover);
  return item;
}

function filmesVisiveis() {
  const termo = normalizarTexto(elementos.busca.value);
  return filmes
    .filter(filme => filtroAtual === "todos" || (filtroAtual === "assistidos" ? filme.assistido : !filme.assistido))
    .filter(filme => normalizarTexto(`${filme.titulo} ${filme.sugeridoPor || ""}`).includes(termo))
    .sort((a, b) => new Date(b.criadoEm || 0) - new Date(a.criadoEm || 0));
}

function renderizarLista() {
  const visiveis = filmesVisiveis();
  elementos.lista.replaceChildren(...visiveis.map(criarItemFilme));
  elementos.estadoVazio.hidden = visiveis.length > 0;

  const tituloVazio = elementos.estadoVazio.querySelector("h3");
  const textoVazio = elementos.estadoVazio.querySelector("p");
  if (filmes.length === 0) {
    tituloVazio.textContent = "Sua primeira sessão começa aqui";
    textoVazio.textContent = "Adicione um filme acima e ele aparecerá nesta lista.";
  } else {
    tituloVazio.textContent = "Nenhum filme encontrado";
    textoVazio.textContent = "Tente mudar a busca ou o filtro selecionado.";
  }
}

function renderizar() {
  elementos.pendentes.textContent = filmes.filter(filme => !filme.assistido).length;
  elementos.assistidos.textContent = filmes.filter(filme => filme.assistido).length;
  atualizarSelects();
  renderizarLista();
}

function adicionarFilme(evento) {
  evento.preventDefault();
  const dados = new FormData(elementos.formularioFilme);
  const titulo = String(dados.get("titulo") || "").trim();
  if (!titulo) return;

  filmes.push({
    id: criarId(),
    titulo,
    sugeridoPor: String(dados.get("sugeridoPor") || "").trim(),
    assistido: false,
    assistidoEm: null,
    criadoEm: new Date().toISOString()
  });

  salvarDados();
  elementos.formularioFilme.reset();
  renderizar();
  elementos.titulo.focus();
  notificar("Filme adicionado à lista.");
}

function atualizarStatusFilme(id, assistido) {
  filmes = filmes.map(filme => filme.id === id ? { ...filme, assistido, assistidoEm: assistido ? new Date().toISOString() : null } : filme);
  salvarDados();
  renderizar();
  notificar(assistido ? "Filme marcado como assistido." : "Filme devolvido à fila.");
}

function removerFilme(id) {
  const filme = filmes.find(item => item.id === id);
  if (!filme || !confirm(`Remover “${filme.titulo}” da lista?`)) return;
  filmes = filmes.filter(item => item.id !== id);
  if (filmeSorteadoId === id) esconderSorteio();
  salvarDados();
  renderizar();
  notificar("Filme removido.");
}

function sortearFilme() {
  let candidatos = filmes.filter(filme => !filme.assistido);
  if (elementos.sorteioPessoa.value) candidatos = candidatos.filter(filme => filme.sugeridoPor === elementos.sorteioPessoa.value);

  if (!candidatos.length) {
    esconderSorteio();
    notificar("Nenhum filme na fila corresponde a esses filtros.");
    return;
  }

  if (candidatos.length > 1) candidatos = candidatos.filter(filme => filme.id !== filmeSorteadoId);
  const escolhido = candidatos[Math.floor(Math.random() * candidatos.length)];
  filmeSorteadoId = escolhido.id;
  elementos.resultadoTitulo.textContent = escolhido.titulo;
  elementos.resultadoDetalhes.textContent = escolhido.sugeridoPor ? `indicação de ${escolhido.sugeridoPor}` : "";
  elementos.resultadoSorteio.hidden = false;
}

function esconderSorteio() {
  filmeSorteadoId = null;
  elementos.resultadoSorteio.hidden = true;
}

function abrirConfiguracoes() {
  elementos.nomeUm.value = configuracoes.nomeUm;
  elementos.nomeDois.value = configuracoes.nomeDois;
  elementos.dataInicio.value = configuracoes.dataInicio;
  elementos.dialogo.showModal();
}

function salvarConfiguracoes(evento) {
  evento.preventDefault();
  if (elementos.dataInicio.value && new Date(elementos.dataInicio.value) > new Date()) {
    elementos.dataInicio.setCustomValidity("A data do primeiro oi não pode estar no futuro.");
    elementos.dataInicio.reportValidity();
    elementos.dataInicio.setCustomValidity("");
    return;
  }
  configuracoes = {
    nomeUm: elementos.nomeUm.value.trim() || configuracoesPadrao.nomeUm,
    nomeDois: elementos.nomeDois.value.trim() || configuracoesPadrao.nomeDois,
    dataInicio: elementos.dataInicio.value
  };
  salvarDados();
  renderizar();
  atualizarTempo();
  elementos.dialogo.close();
  notificar("Configurações salvas.");
}

function diferencaCalendario(inicio, fim) {
  let anos = fim.getFullYear() - inicio.getFullYear();
  let cursor = new Date(inicio);
  cursor.setFullYear(inicio.getFullYear() + anos);
  if (cursor > fim) {
    anos -= 1;
    cursor = new Date(inicio);
    cursor.setFullYear(inicio.getFullYear() + anos);
  }

  let meses = (fim.getFullYear() - cursor.getFullYear()) * 12 + fim.getMonth() - cursor.getMonth();
  let candidato = new Date(cursor);
  candidato.setMonth(cursor.getMonth() + meses);
  if (candidato > fim) meses -= 1;
  cursor.setMonth(cursor.getMonth() + meses);

  const restante = Math.max(0, fim - cursor);
  const dias = Math.floor(restante / 86400000);
  const horas = Math.floor(restante / 3600000) % 24;
  const minutos = Math.floor(restante / 60000) % 60;
  const segundos = Math.floor(restante / 1000) % 60;
  return { anos, meses, dias, horas, minutos, segundos };
}

function unidade(valor, singular, plural) {
  return `${valor} ${valor === 1 ? singular : plural}`;
}

function atualizarTempo() {
  if (!configuracoes.dataInicio) {
    elementos.tempo.innerHTML = "";
    const botao = document.createElement("button");
    botao.className = "link-botao";
    botao.type = "button";
    botao.textContent = "Defina a data do primeiro oi";
    botao.addEventListener("click", abrirConfiguracoes);
    elementos.tempo.append(botao);
    elementos.proximoAniversario.textContent = "";
    return;
  }

  const inicio = new Date(configuracoes.dataInicio);
  const agora = new Date();
  const partes = diferencaCalendario(inicio, agora);
  const rotulos = [["ano", "anos"], ["mês", "meses"], ["dia", "dias"], ["hora", "horas"], ["minuto", "minutos"], ["segundo", "segundos"]];
  elementos.tempo.replaceChildren(...Object.values(partes).map((valor, indice) => {
    const parte = document.createElement("div");
    parte.className = "tempo-parte";
    const numero = document.createElement("strong");
    numero.textContent = valor;
    const rotulo = document.createElement("span");
    rotulo.textContent = valor === 1 ? rotulos[indice][0] : rotulos[indice][1];
    parte.append(numero, rotulo);
    return parte;
  }));

  const aniversario = new Date(agora.getFullYear(), inicio.getMonth(), inicio.getDate(), inicio.getHours(), inicio.getMinutes());
  if (aniversario <= agora) aniversario.setFullYear(aniversario.getFullYear() + 1);
  const diasAte = Math.ceil((aniversario - agora) / 86400000);
  elementos.proximoAniversario.textContent = `Próximo aniversário em ${unidade(diasAte, "dia", "dias")}.`;
}

function exportarBackup() {
  const backup = { versao: 1, exportadoEm: new Date().toISOString(), configuracoes, filmes };
  const arquivo = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(arquivo);
  const link = document.createElement("a");
  link.href = url;
  link.download = `malu-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
  notificar("Backup baixado.");
}

function filmeValido(filme) {
  return filme && typeof filme === "object" && typeof filme.titulo === "string" && filme.titulo.trim();
}

function normalizarFilme(filme) {
  return {
    id: String(filme.id || criarId()),
    titulo: filme.titulo.trim().slice(0, 100),
    sugeridoPor: String(filme.sugeridoPor || "").slice(0, 30),
    assistido: Boolean(filme.assistido),
    assistidoEm: filme.assistidoEm || null,
    criadoEm: filme.criadoEm || new Date().toISOString()
  };
}

async function restaurarBackup(evento) {
  const arquivo = evento.target.files[0];
  evento.target.value = "";
  if (!arquivo) return;
  try {
    const backup = JSON.parse(await arquivo.text());
    if (!Array.isArray(backup.filmes) || !backup.filmes.every(filmeValido)) throw new Error("formato inválido");
    if (!confirm("Substituir a lista atual pelos dados deste backup?")) return;
    filmes = backup.filmes.map(normalizarFilme);
    if (backup.configuracoes && typeof backup.configuracoes === "object") {
      configuracoes = { ...configuracoesPadrao, ...backup.configuracoes };
    }
    salvarDados();
    renderizar();
    atualizarTempo();
    elementos.dialogo.close();
    notificar("Backup restaurado.");
  } catch {
    notificar("Esse arquivo não é um backup válido do Malu.");
  }
}

elementos.formularioFilme.addEventListener("submit", adicionarFilme);
elementos.busca.addEventListener("input", renderizarLista);
elementos.abas.forEach(aba => aba.addEventListener("click", () => {
  filtroAtual = aba.dataset.filtro;
  elementos.abas.forEach(item => {
    const ativa = item === aba;
    item.classList.toggle("ativa", ativa);
    item.setAttribute("aria-pressed", String(ativa));
  });
  renderizarLista();
}));
elementos.botaoSortear.addEventListener("click", sortearFilme);
elementos.marcarSorteado.addEventListener("click", () => {
  if (filmeSorteadoId) atualizarStatusFilme(filmeSorteadoId, true);
  esconderSorteio();
});
elementos.abrirConfiguracoes.addEventListener("click", abrirConfiguracoes);
elementos.fecharConfiguracoes.addEventListener("click", () => elementos.dialogo.close());
elementos.configurarData?.addEventListener("click", abrirConfiguracoes);
elementos.formularioConfiguracoes.addEventListener("submit", salvarConfiguracoes);
elementos.exportar.addEventListener("click", exportarBackup);
elementos.arquivoBackup.addEventListener("change", restaurarBackup);
elementos.dialogo.addEventListener("click", evento => {
  if (evento.target === elementos.dialogo) elementos.dialogo.close();
});

renderizar();
atualizarTempo();
setInterval(atualizarTempo, 1000);
