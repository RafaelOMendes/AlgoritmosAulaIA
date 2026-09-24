import { chamarApi } from './api.js';
import { criarVisualizadorDeArvore } from './arvore-de-decisao.js';
import { desenharTabuleiro } from './desenho-do-tabuleiro.js';
import {
  classeDoValorMinimax,
  definirConstantesDoJogo,
  descreverProfundidade,
  formatarMilissegundos,
  formatarNumero,
  formatarValorMinimax,
  setaDoMovimento,
} from './formatacao.js';
import { JOGADORES, NOME_DE_EXIBICAO } from './tabuleiro.js';

const PASSOS_POR_SEGUNDO = [0.5, 1, 2, 3, 5, 8, 12, 20, 30];

const elementos = {
  tabuleiro: document.getElementById('tabuleiro'),
  avisoDeErro: document.getElementById('aviso-de-erro'),
  rotuloSemente: document.getElementById('rotulo-semente'),
  placarRodada: document.getElementById('placar-rodada'),
  placarTerritorioAzul: document.getElementById('placar-territorio-azul'),
  placarTerritorioLaranja: document.getElementById('placar-territorio-laranja'),
  barraTerritorioAzul: document.getElementById('barra-territorio-azul'),
  barraTerritorioLaranja: document.getElementById('barra-territorio-laranja'),
  resultadoDaPartida: document.getElementById('resultado-da-partida'),
  tituloDoResultado: document.getElementById('titulo-do-resultado'),
  detalheDoResultado: document.getElementById('detalhe-do-resultado'),
  botaoResolver: document.getElementById('botao-resolver'),
  botaoPasso: document.getElementById('botao-passo'),
  botaoReiniciar: document.getElementById('botao-reiniciar'),
  botaoNovoLabirinto: document.getElementById('botao-novo-labirinto'),
  botaoMaisDevagar: document.getElementById('botao-mais-devagar'),
  botaoMaisRapido: document.getElementById('botao-mais-rapido'),
  controleVelocidade: document.getElementById('controle-velocidade'),
  rotuloVelocidade: document.getElementById('rotulo-velocidade'),
  selecaoTamanho: document.getElementById('selecao-tamanho'),
  profundidadeAzul: document.getElementById('profundidade-azul'),
  rotuloProfundidadeAzul: document.getElementById('rotulo-profundidade-azul'),
  estrategiaLaranja: document.getElementById('estrategia-laranja'),
  profundidadeLaranja: document.getElementById('profundidade-laranja'),
  rotuloProfundidadeLaranja: document.getElementById('rotulo-profundidade-laranja'),
  usarPoda: document.getElementById('usar-poda'),
  usarTurbo: document.getElementById('usar-turbo'),
  campoTurbo: document.getElementById('campo-turbo'),
  descricaoTurbo: document.getElementById('descricao-turbo'),
  mostrarTerritorio: document.getElementById('mostrar-territorio'),
  corpoUltimaDecisao: document.getElementById('corpo-ultima-decisao'),
  botaoVerArvore: document.getElementById('botao-ver-arvore'),
  listaHistorico: document.getElementById('lista-historico'),
  historicoVazio: document.getElementById('historico-vazio'),
};

const aplicacao = {
  estrategias: {},
  partida: null,
  emReproducao: false,
  identificadorDaReproducao: 0,
  aguardandoServidor: false,
};

const visualizadorDeArvore = criarVisualizadorDeArvore();

function esperar(milissegundos) {
  return new Promise((resolver) => setTimeout(resolver, milissegundos));
}

function mostrarErro(mensagem) {
  elementos.avisoDeErro.textContent = mensagem;
  elementos.avisoDeErro.hidden = !mensagem;
}

function passosPorSegundoAtuais() {
  return PASSOS_POR_SEGUNDO[Number(elementos.controleVelocidade.value)];
}

function lerConfiguracaoDosAgentes() {
  const usarPodaAlfaBeta = elementos.usarPoda.checked;
  const usarTurbo = elementos.usarTurbo.checked && !elementos.usarTurbo.disabled;
  return {
    azul: {
      estrategia: 'minimax',
      profundidadeEmRodadas: Number(elementos.profundidadeAzul.value),
      usarPodaAlfaBeta,
      usarTurbo,
    },
    laranja: {
      estrategia: elementos.estrategiaLaranja.value,
      profundidadeEmRodadas: Number(elementos.profundidadeLaranja.value),
      usarPodaAlfaBeta,
      usarTurbo,
    },
  };
}

function atualizarDescricaoDoTurbo() {
  if (elementos.usarTurbo.disabled) {
    return;
  }
  elementos.descricaoTurbo.textContent = elementos.usarTurbo.checked
    ? 'Ligado: Minimax em C++, com threads'
    : 'Desligado: Minimax em Python';
}

function configurarTurbo(turboDisponivel, motivoDoTurboIndisponivel) {
  elementos.usarTurbo.disabled = !turboDisponivel;
  if (!turboDisponivel) {
    elementos.usarTurbo.checked = false;
    elementos.descricaoTurbo.textContent = 'Indisponível: a versão em C++ não está compilada';
    elementos.campoTurbo.title = motivoDoTurboIndisponivel;
    return;
  }
  atualizarDescricaoDoTurbo();
}

function partidaTerminou() {
  return Boolean(aplicacao.partida?.vencedor);
}

function desenharEstadoAtual() {
  if (!aplicacao.partida) {
    return;
  }
  desenharTabuleiro(elementos.tabuleiro, aplicacao.partida.estadoAtual, {
    territorios: aplicacao.partida.territorios,
    mostrarTerritorio: elementos.mostrarTerritorio.checked,
  });
}

function atualizarPlacar() {
  const { estadoAtual, territorios } = aplicacao.partida;
  const totalDisputado = Math.max(1, territorios.azul + territorios.laranja);
  elementos.placarRodada.textContent = estadoAtual.rodada;
  elementos.placarTerritorioAzul.textContent = formatarNumero(territorios.azul);
  elementos.placarTerritorioLaranja.textContent = formatarNumero(territorios.laranja);
  elementos.barraTerritorioAzul.style.width = `${(territorios.azul / totalDisputado) * 100}%`;
  elementos.barraTerritorioLaranja.style.width = `${(territorios.laranja / totalDisputado) * 100}%`;
}

function descreverFimDaPartida() {
  const ultimoRegistro = aplicacao.partida.historico.at(-1);
  const { vencedor } = aplicacao.partida;
  const descricaoDasCausas = JOGADORES.filter((jogador) => ultimoRegistro.causasDasColisoes[jogador])
    .map((jogador) => `${NOME_DE_EXIBICAO[jogador]} ${ultimoRegistro.causasDasColisoes[jogador]}`)
    .join(' e ');
  const titulo = vencedor === 'empate' ? 'Empate!' : `${NOME_DE_EXIBICAO[vencedor]} venceu!`;
  return { vencedor, titulo, detalhe: `${descricaoDasCausas} na rodada ${ultimoRegistro.numeroDaRodada}.` };
}

function atualizarResultado() {
  if (!partidaTerminou()) {
    elementos.resultadoDaPartida.hidden = true;
    return;
  }
  const { vencedor, titulo, detalhe } = descreverFimDaPartida();
  elementos.resultadoDaPartida.className = `resultado-da-partida resultado-vitoria-${vencedor}`;
  elementos.tituloDoResultado.textContent = titulo;
  elementos.detalheDoResultado.textContent = detalhe;
  elementos.resultadoDaPartida.hidden = false;
}

function criarLinhaDaDecisao(jogador, decisao) {
  const linha = document.createElement('tr');
  const usaMinimax = decisao?.estrategia === 'minimax';
  const celulas = [
    `<span class="texto-${jogador}">${NOME_DE_EXIBICAO[jogador]}</span>`,
    decisao ? setaDoMovimento(decisao.movimento) : '—',
    usaMinimax ? `<span class="${classeDoValorMinimax(decisao.valor)}">${formatarValorMinimax(decisao.valor)}</span>` : '—',
    usaMinimax ? formatarNumero(decisao.nosVisitados) : '—',
    usaMinimax ? formatarNumero(decisao.ramosPodados) : '—',
    usaMinimax ? `${formatarMilissegundos(decisao.tempoEmMilissegundos)}${decisao.motor === 'cpp' ? ' <span class="selo-motor" title="Calculado em C++ (turbo)">C++</span>' : ''}` : '—',
  ];
  linha.innerHTML = celulas.map((conteudo) => `<td>${conteudo}</td>`).join('');
  if (decisao && !usaMinimax) {
    linha.title = `Estratégia: ${aplicacao.estrategias[decisao.estrategia]?.nome ?? decisao.estrategia}`;
  }
  return linha;
}

function atualizarUltimaDecisao() {
  const ultimoRegistro = aplicacao.partida.historico.at(-1);
  elementos.corpoUltimaDecisao.replaceChildren(
    ...JOGADORES.map((jogador) => criarLinhaDaDecisao(jogador, ultimoRegistro?.decisoes[jogador])),
  );
}

function atualizarBotoes() {
  const semPartida = !aplicacao.partida;
  const terminou = partidaTerminou();
  elementos.botaoResolver.textContent = aplicacao.emReproducao ? '⏸ Pausar' : '▶ Resolver';
  elementos.botaoResolver.classList.toggle('em-reproducao', aplicacao.emReproducao);
  elementos.botaoResolver.disabled = semPartida || terminou;
  elementos.botaoPasso.disabled = semPartida || terminou || aplicacao.emReproducao || aplicacao.aguardandoServidor;
  elementos.botaoReiniciar.disabled = semPartida;
  elementos.botaoVerArvore.disabled = semPartida;
  elementos.botaoMaisDevagar.disabled = Number(elementos.controleVelocidade.value) === 0;
  elementos.botaoMaisRapido.disabled = Number(elementos.controleVelocidade.value) === PASSOS_POR_SEGUNDO.length - 1;
}

function atualizarRotulos() {
  const passos = passosPorSegundoAtuais();
  elementos.rotuloVelocidade.textContent = `${String(passos).replace('.', ',')} ${passos === 1 ? 'passo' : 'passos'}/s`;
  elementos.rotuloProfundidadeAzul.textContent = descreverProfundidade(Number(elementos.profundidadeAzul.value));
  const laranjaUsaProfundidade = aplicacao.estrategias[elementos.estrategiaLaranja.value]?.usaProfundidade ?? true;
  elementos.profundidadeLaranja.disabled = !laranjaUsaProfundidade;
  elementos.rotuloProfundidadeLaranja.textContent = laranjaUsaProfundidade
    ? descreverProfundidade(Number(elementos.profundidadeLaranja.value))
    : 'não se aplica';
  elementos.rotuloSemente.textContent = aplicacao.partida?.semente ?? '-';
}

function atualizarTela() {
  atualizarBotoes();
  atualizarRotulos();
  if (!aplicacao.partida) {
    return;
  }
  desenharEstadoAtual();
  atualizarPlacar();
  atualizarResultado();
  atualizarUltimaDecisao();
}

function criarItemDoHistorico(registro) {
  const item = document.createElement('li');
  item.className = 'item-historico';
  const descreverJogada = (jogador) => {
    const decisao = registro.decisoes[jogador];
    const bateu = !registro.estadoDepois.vivos[jogador];
    const valor = decisao.estrategia === 'minimax' ? ` <small>(${formatarValorMinimax(decisao.valor)})</small>` : '';
    const marcaDeColisao = bateu ? ' <span class="marca-colisao" title="bateu">✕</span>' : '';
    return `<span class="jogada-${jogador}">${NOME_DE_EXIBICAO[jogador]} ${setaDoMovimento(decisao.movimento)}${valor}${marcaDeColisao}</span>`;
  };
  item.innerHTML = `
    <span class="numero-da-rodada">R${registro.numeroDaRodada}</span>
    <span class="jogadas-da-rodada">${descreverJogada('azul')}${descreverJogada('laranja')}</span>
  `;
  const botaoDaArvore = document.createElement('button');
  botaoDaArvore.type = 'button';
  botaoDaArvore.className = 'botao botao-pequeno';
  botaoDaArvore.textContent = 'Árvore';
  botaoDaArvore.title = `Ver a árvore de decisão da rodada ${registro.numeroDaRodada}`;
  botaoDaArvore.addEventListener('click', () => abrirArvoreDaRodada(registro));
  item.append(botaoDaArvore);
  return item;
}

function limparHistorico() {
  elementos.listaHistorico.replaceChildren();
  elementos.historicoVazio.hidden = false;
}

async function executarUmPasso() {
  const partida = aplicacao.partida;
  if (!partida || partidaTerminou() || aplicacao.aguardandoServidor) {
    return;
  }
  const configuracaoDosAgentes = lerConfiguracaoDosAgentes();
  aplicacao.aguardandoServidor = true;
  atualizarBotoes();
  try {
    const resposta = await chamarApi('/api/jogar-rodada', {
      estado: partida.estadoAtual,
      configuracaoDosAgentes,
      semente: partida.semente,
    });
    if (aplicacao.partida !== partida) {
      return;
    }
    const registro = {
      numeroDaRodada: resposta.numeroDaRodada,
      estadoAntes: partida.estadoAtual,
      estadoDepois: resposta.estadoDepois,
      decisoes: resposta.decisoes,
      causasDasColisoes: resposta.causasDasColisoes,
      configuracaoDosAgentes,
    };
    partida.historico.push(registro);
    partida.estadoAtual = resposta.estadoDepois;
    partida.territorios = resposta.territorios;
    partida.vencedor = resposta.vencedor;
    elementos.historicoVazio.hidden = true;
    elementos.listaHistorico.prepend(criarItemDoHistorico(registro));
    mostrarErro('');
  } catch (erro) {
    mostrarErro(erro.message);
    interromperReproducao();
  } finally {
    aplicacao.aguardandoServidor = false;
  }
  if (partidaTerminou()) {
    interromperReproducao();
  }
  atualizarTela();
}

async function reproduzirContinuamente(identificadorDaReproducao) {
  while (aplicacao.emReproducao && aplicacao.identificadorDaReproducao === identificadorDaReproducao && !partidaTerminou()) {
    const inicio = performance.now();
    await executarUmPasso();
    const tempoRestante = 1000 / passosPorSegundoAtuais() - (performance.now() - inicio);
    if (tempoRestante > 0) {
      await esperar(tempoRestante);
    }
  }
}

function resolver() {
  if (!aplicacao.partida || partidaTerminou()) {
    return;
  }
  aplicacao.emReproducao = true;
  aplicacao.identificadorDaReproducao += 1;
  atualizarBotoes();
  reproduzirContinuamente(aplicacao.identificadorDaReproducao);
}

function interromperReproducao() {
  aplicacao.emReproducao = false;
  aplicacao.identificadorDaReproducao += 1;
}

function pausar() {
  interromperReproducao();
  atualizarBotoes();
}

function alternarReproducao() {
  if (aplicacao.emReproducao) {
    pausar();
  } else {
    resolver();
  }
}

async function carregarPartida(pedido) {
  interromperReproducao();
  try {
    const resposta = await chamarApi('/api/nova-partida', pedido);
    aplicacao.partida = {
      semente: resposta.semente,
      tamanho: pedido.tamanho,
      estadoAtual: resposta.estado,
      territorios: resposta.territorios,
      vencedor: null,
      historico: [],
    };
    mostrarErro('');
  } catch (erro) {
    mostrarErro(erro.message);
  }
  limparHistorico();
  atualizarTela();
}

function comecarComNovoLabirinto() {
  return carregarPartida({ tamanho: Number(elementos.selecaoTamanho.value) });
}

function reiniciarNoMesmoLabirinto() {
  if (!aplicacao.partida) {
    return comecarComNovoLabirinto();
  }
  return carregarPartida({ tamanho: aplicacao.partida.tamanho, semente: aplicacao.partida.semente });
}

function mudarVelocidade(variacao) {
  const novoValor = Number(elementos.controleVelocidade.value) + variacao;
  elementos.controleVelocidade.value = Math.min(PASSOS_POR_SEGUNDO.length - 1, Math.max(0, novoValor));
  atualizarRotulos();
  atualizarBotoes();
}

function abrirArvoreDaRodada(registro) {
  pausar();
  visualizadorDeArvore.abrir({
    estadoRaiz: registro.estadoAntes,
    configuracaoDosAgentes: registro.configuracaoDosAgentes,
    descricaoDaRodada: `Decisão da rodada ${registro.numeroDaRodada}`,
  });
}

function abrirArvoreMaisRecente() {
  if (!aplicacao.partida) {
    return;
  }
  const ultimoRegistro = aplicacao.partida.historico.at(-1);
  if (partidaTerminou() || (ultimoRegistro && aplicacao.emReproducao)) {
    abrirArvoreDaRodada(ultimoRegistro);
    return;
  }
  pausar();
  visualizadorDeArvore.abrir({
    estadoRaiz: aplicacao.partida.estadoAtual,
    configuracaoDosAgentes: lerConfiguracaoDosAgentes(),
    descricaoDaRodada: `Próxima jogada (rodada ${aplicacao.partida.estadoAtual.rodada + 1})`,
  });
}

function preencherEstrategiasDoLaranja(estrategias) {
  for (const estrategia of estrategias) {
    aplicacao.estrategias[estrategia.chave] = estrategia;
    const opcao = document.createElement('option');
    opcao.value = estrategia.chave;
    opcao.textContent = estrategia.nome;
    elementos.estrategiaLaranja.append(opcao);
  }
  elementos.estrategiaLaranja.value = 'minimax';
}

function ajustarLimitesDeProfundidade(profundidadeMinima, profundidadeMaxima) {
  for (const controle of [elementos.profundidadeAzul, elementos.profundidadeLaranja]) {
    controle.min = String(profundidadeMinima);
    controle.max = String(profundidadeMaxima);
  }
}

function campoDeTextoEmFoco() {
  const elementoEmFoco = document.activeElement;
  return elementoEmFoco && ['INPUT', 'SELECT', 'TEXTAREA'].includes(elementoEmFoco.tagName) && elementoEmFoco.type !== 'range' && elementoEmFoco.type !== 'checkbox';
}

function tratarAtalhosDoTeclado(evento) {
  if (visualizadorDeArvore.estaAberto() || campoDeTextoEmFoco() || evento.ctrlKey || evento.metaKey || evento.altKey) {
    return;
  }
  if (evento.key === ' ' && document.activeElement?.tagName !== 'BUTTON') {
    evento.preventDefault();
    alternarReproducao();
  } else if (evento.key === 'ArrowRight' && document.activeElement?.type !== 'range') {
    evento.preventDefault();
    if (!aplicacao.emReproducao) {
      executarUmPasso();
    }
  } else if (evento.key.toLowerCase() === 'a') {
    abrirArvoreMaisRecente();
  }
}

function registrarEventos() {
  elementos.botaoResolver.addEventListener('click', alternarReproducao);
  elementos.botaoPasso.addEventListener('click', executarUmPasso);
  elementos.botaoReiniciar.addEventListener('click', reiniciarNoMesmoLabirinto);
  elementos.botaoNovoLabirinto.addEventListener('click', comecarComNovoLabirinto);
  elementos.botaoMaisDevagar.addEventListener('click', () => mudarVelocidade(-1));
  elementos.botaoMaisRapido.addEventListener('click', () => mudarVelocidade(1));
  elementos.controleVelocidade.addEventListener('input', () => mudarVelocidade(0));
  elementos.selecaoTamanho.addEventListener('change', comecarComNovoLabirinto);
  elementos.profundidadeAzul.addEventListener('input', atualizarRotulos);
  elementos.profundidadeLaranja.addEventListener('input', atualizarRotulos);
  elementos.estrategiaLaranja.addEventListener('change', atualizarRotulos);
  elementos.mostrarTerritorio.addEventListener('change', desenharEstadoAtual);
  elementos.usarTurbo.addEventListener('change', atualizarDescricaoDoTurbo);
  elementos.botaoVerArvore.addEventListener('click', abrirArvoreMaisRecente);
  document.addEventListener('keydown', tratarAtalhosDoTeclado);
  window.addEventListener('resize', desenharEstadoAtual);
}

async function iniciarAplicacao() {
  registrarEventos();
  atualizarTela();
  try {
    const configuracao = await chamarApi('/api/configuracao');
    definirConstantesDoJogo(configuracao);
    preencherEstrategiasDoLaranja(configuracao.estrategias);
    ajustarLimitesDeProfundidade(configuracao.profundidadeMinima, configuracao.profundidadeMaxima);
    configurarTurbo(configuracao.turboDisponivel, configuracao.motivoDoTurboIndisponivel);
  } catch (erro) {
    mostrarErro(erro.message);
    return;
  }
  await comecarComNovoLabirinto();
}

iniciarAplicacao();
