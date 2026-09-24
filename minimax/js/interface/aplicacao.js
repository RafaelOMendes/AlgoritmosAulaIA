import { gerarSementeAleatoria } from '../logica/aleatorio.js';
import { calcularTerritorios } from '../logica/avaliacao.js';
import { ESTRATEGIAS } from '../logica/estrategias.js';
import { JOGADORES, NOME_DE_EXIBICAO, descreverCausaDaColisao, vencedorDoJogo } from '../logica/jogo.js';
import {
  iniciarPartida,
  jogarProximaRodada,
  partidaTerminou,
  reiniciarPartidaNoMesmoLabirinto,
} from '../logica/partida.js';
import { criarVisualizadorDeArvore } from './arvore-de-decisao.js';
import { desenharTabuleiro } from './desenho-do-tabuleiro.js';
import {
  classeDoValorMinimax,
  descreverProfundidade,
  formatarMilissegundos,
  formatarNumero,
  formatarValorMinimax,
  setaDoMovimento,
} from './formatacao.js';

const PASSOS_POR_SEGUNDO = [0.5, 1, 2, 3, 5, 8, 12, 20, 30];

const elementos = {
  tabuleiro: document.getElementById('tabuleiro'),
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
  mostrarTerritorio: document.getElementById('mostrar-territorio'),
  corpoUltimaDecisao: document.getElementById('corpo-ultima-decisao'),
  botaoVerArvore: document.getElementById('botao-ver-arvore'),
  listaHistorico: document.getElementById('lista-historico'),
  historicoVazio: document.getElementById('historico-vazio'),
};

const aplicacao = {
  partida: null,
  emReproducao: false,
  temporizadorDoProximoPasso: null,
};

const visualizadorDeArvore = criarVisualizadorDeArvore();

function passosPorSegundoAtuais() {
  return PASSOS_POR_SEGUNDO[Number(elementos.controleVelocidade.value)];
}

function lerConfiguracaoDosAgentes() {
  const usarPodaAlfaBeta = elementos.usarPoda.checked;
  return {
    azul: {
      estrategia: 'minimax',
      profundidadeEmRodadas: Number(elementos.profundidadeAzul.value),
      usarPodaAlfaBeta,
    },
    laranja: {
      estrategia: elementos.estrategiaLaranja.value,
      profundidadeEmRodadas: Number(elementos.profundidadeLaranja.value),
      usarPodaAlfaBeta,
    },
  };
}

function desenharEstadoAtual() {
  desenharTabuleiro(elementos.tabuleiro, aplicacao.partida.estadoAtual, {
    mostrarTerritorio: elementos.mostrarTerritorio.checked,
  });
}

function atualizarPlacar() {
  const estado = aplicacao.partida.estadoAtual;
  const territorios = calcularTerritorios(estado);
  const totalDisputado = Math.max(1, territorios.azul + territorios.laranja);
  elementos.placarRodada.textContent = estado.rodada;
  elementos.placarTerritorioAzul.textContent = formatarNumero(territorios.azul);
  elementos.placarTerritorioLaranja.textContent = formatarNumero(territorios.laranja);
  elementos.barraTerritorioAzul.style.width = `${(territorios.azul / totalDisputado) * 100}%`;
  elementos.barraTerritorioLaranja.style.width = `${(territorios.laranja / totalDisputado) * 100}%`;
}

function descreverFimDaPartida() {
  const ultimoRegistro = aplicacao.partida.historico.at(-1);
  const vencedor = vencedorDoJogo(ultimoRegistro.estadoDepois);
  const causas = JOGADORES.map((jogador) => ({
    jogador,
    causa: descreverCausaDaColisao(ultimoRegistro.estadoAntes, ultimoRegistro.estadoDepois, jogador),
  })).filter(({ causa }) => causa !== null);
  const descricaoDasCausas = causas.map(({ jogador, causa }) => `${NOME_DE_EXIBICAO[jogador]} ${causa}`).join(' e ');
  const titulo = vencedor === 'empate' ? 'Empate!' : `${NOME_DE_EXIBICAO[vencedor]} venceu!`;
  return { vencedor, titulo, detalhe: `${descricaoDasCausas} na rodada ${ultimoRegistro.numeroDaRodada}.` };
}

function atualizarResultado() {
  if (!partidaTerminou(aplicacao.partida)) {
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
    usaMinimax ? formatarMilissegundos(decisao.tempoEmMilissegundos) : '—',
  ];
  linha.innerHTML = celulas.map((conteudo) => `<td>${conteudo}</td>`).join('');
  if (decisao && !usaMinimax) {
    linha.title = `Estratégia: ${ESTRATEGIAS[decisao.estrategia].nome}`;
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
  const terminou = partidaTerminou(aplicacao.partida);
  elementos.botaoResolver.textContent = aplicacao.emReproducao ? '⏸ Pausar' : '▶ Resolver';
  elementos.botaoResolver.classList.toggle('em-reproducao', aplicacao.emReproducao);
  elementos.botaoResolver.disabled = terminou;
  elementos.botaoPasso.disabled = terminou || aplicacao.emReproducao;
  elementos.botaoMaisDevagar.disabled = Number(elementos.controleVelocidade.value) === 0;
  elementos.botaoMaisRapido.disabled = Number(elementos.controleVelocidade.value) === PASSOS_POR_SEGUNDO.length - 1;
}

function atualizarRotulos() {
  const passos = passosPorSegundoAtuais();
  elementos.rotuloVelocidade.textContent = `${String(passos).replace('.', ',')} ${passos === 1 ? 'passo' : 'passos'}/s`;
  elementos.rotuloProfundidadeAzul.textContent = descreverProfundidade(Number(elementos.profundidadeAzul.value));
  const laranjaUsaMinimax = elementos.estrategiaLaranja.value === 'minimax';
  elementos.profundidadeLaranja.disabled = !laranjaUsaMinimax;
  elementos.rotuloProfundidadeLaranja.textContent = laranjaUsaMinimax
    ? descreverProfundidade(Number(elementos.profundidadeLaranja.value))
    : 'não se aplica';
  elementos.rotuloSemente.textContent = aplicacao.partida.labirinto.semente;
}

function atualizarTela() {
  desenharEstadoAtual();
  atualizarPlacar();
  atualizarResultado();
  atualizarUltimaDecisao();
  atualizarBotoes();
  atualizarRotulos();
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

function executarUmPasso() {
  if (partidaTerminou(aplicacao.partida)) {
    pausar();
    return;
  }
  const registro = jogarProximaRodada(aplicacao.partida, lerConfiguracaoDosAgentes());
  elementos.historicoVazio.hidden = true;
  elementos.listaHistorico.prepend(criarItemDoHistorico(registro));
  if (partidaTerminou(aplicacao.partida)) {
    pausar();
  }
  atualizarTela();
}

function agendarProximoPasso() {
  aplicacao.temporizadorDoProximoPasso = setTimeout(() => {
    executarUmPasso();
    if (aplicacao.emReproducao) {
      agendarProximoPasso();
    }
  }, 1000 / passosPorSegundoAtuais());
}

function resolver() {
  if (partidaTerminou(aplicacao.partida)) {
    return;
  }
  aplicacao.emReproducao = true;
  executarUmPasso();
  if (aplicacao.emReproducao) {
    agendarProximoPasso();
  }
  atualizarBotoes();
}

function interromperReproducao() {
  aplicacao.emReproducao = false;
  clearTimeout(aplicacao.temporizadorDoProximoPasso);
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

function comecarComNovoLabirinto() {
  interromperReproducao();
  aplicacao.partida = iniciarPartida(Number(elementos.selecaoTamanho.value), gerarSementeAleatoria());
  limparHistorico();
  atualizarTela();
}

function reiniciarNoMesmoLabirinto() {
  interromperReproducao();
  aplicacao.partida = reiniciarPartidaNoMesmoLabirinto(aplicacao.partida);
  limparHistorico();
  atualizarTela();
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
  const ultimoRegistro = aplicacao.partida.historico.at(-1);
  if (partidaTerminou(aplicacao.partida) || (ultimoRegistro && aplicacao.emReproducao)) {
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

function preencherEstrategiasDoLaranja() {
  for (const [chave, estrategia] of Object.entries(ESTRATEGIAS)) {
    const opcao = document.createElement('option');
    opcao.value = chave;
    opcao.textContent = estrategia.nome;
    elementos.estrategiaLaranja.append(opcao);
  }
  elementos.estrategiaLaranja.value = 'minimax';
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
  elementos.botaoVerArvore.addEventListener('click', abrirArvoreMaisRecente);
  document.addEventListener('keydown', tratarAtalhosDoTeclado);
  window.addEventListener('resize', desenharEstadoAtual);
}

preencherEstrategiasDoLaranja();
registrarEventos();
comecarComNovoLabirinto();
