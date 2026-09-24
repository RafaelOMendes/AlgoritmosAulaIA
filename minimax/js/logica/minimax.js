import { avaliarPosicao } from './avaliacao.js';
import { aplicarRodadaPorPapel, jogoTerminou, movimentosPossiveis, oponenteDe } from './jogo.js';

export const VALOR_DE_VITORIA = 1000;
export const VALOR_DE_EMPATE = -VALOR_DE_VITORIA / 2;

export const NO_MAX = 'MAX';
export const NO_MIN = 'MIN';

export const VALOR_EXATO = 'exato';
export const LIMITE_SUPERIOR = 'limiteSuperior';
export const LIMITE_INFERIOR = 'limiteInferior';

export const DESFECHO_VITORIA = 'vitoria';
export const DESFECHO_DERROTA = 'derrota';
export const DESFECHO_EMPATE = 'empate';

function criarNoDaArvore({ tipo, jogadorDaVez, jogadorQueMoveu, movimento, caminho, alfa, beta }) {
  return {
    tipo,
    jogadorDaVez,
    jogadorQueMoveu,
    movimento,
    caminho,
    alfaNaEntrada: alfa,
    betaNaEntrada: beta,
    valor: null,
    tipoDoValor: VALOR_EXATO,
    filhos: [],
    indiceDoMelhorFilho: -1,
    podado: false,
    desfecho: null,
    avaliacao: null,
  };
}

function criarNoFilho(contexto, noPai, tipoDoFilho, movimento, alfa, beta) {
  if (!noPai) {
    return null;
  }
  const jogadorQueMoveu = noPai.jogadorDaVez;
  const noFilho = criarNoDaArvore({
    tipo: tipoDoFilho,
    jogadorDaVez: tipoDoFilho === NO_MAX ? contexto.jogadorMaximizador : contexto.jogadorMinimizador,
    jogadorQueMoveu,
    movimento,
    caminho: [...noPai.caminho, { jogador: jogadorQueMoveu, movimento }],
    alfa,
    beta,
  });
  noPai.filhos.push(noFilho);
  return noFilho;
}

function registrarRamosPodados(contexto, noPai, tipoDosFilhos, movimentosPodados) {
  contexto.ramosPodados += movimentosPodados.length;
  for (const movimento of movimentosPodados) {
    const noPodado = criarNoFilho(contexto, noPai, tipoDosFilhos, movimento, null, null);
    if (noPodado) {
      noPodado.podado = true;
    }
  }
}

function classificarValor(valor, alfaNaEntrada, betaNaEntrada) {
  if (valor <= alfaNaEntrada) {
    return LIMITE_SUPERIOR;
  }
  if (valor >= betaNaEntrada) {
    return LIMITE_INFERIOR;
  }
  return VALOR_EXATO;
}

function concluirNoInterno(noDaArvore, valor, alfaNaEntrada, betaNaEntrada, indiceDoMelhorFilho) {
  if (!noDaArvore) {
    return;
  }
  noDaArvore.valor = valor;
  noDaArvore.tipoDoValor = classificarValor(valor, alfaNaEntrada, betaNaEntrada);
  noDaArvore.indiceDoMelhorFilho = indiceDoMelhorFilho;
}

function avaliarFimDeJogo(contexto, estado, rodadasRestantes) {
  const maximizadorVivo = estado.vivos[contexto.jogadorMaximizador];
  const minimizadorVivo = estado.vivos[contexto.jogadorMinimizador];
  if (maximizadorVivo && !minimizadorVivo) {
    return { valor: VALOR_DE_VITORIA + rodadasRestantes, desfecho: DESFECHO_VITORIA };
  }
  if (!maximizadorVivo && minimizadorVivo) {
    return { valor: -VALOR_DE_VITORIA - rodadasRestantes, desfecho: DESFECHO_DERROTA };
  }
  return { valor: VALOR_DE_EMPATE, desfecho: DESFECHO_EMPATE };
}

function valorNoMaximizador(contexto, estado, rodadasRestantes, alfa, beta, noDaArvore) {
  contexto.nosVisitados += 1;

  if (jogoTerminou(estado)) {
    const { valor, desfecho } = avaliarFimDeJogo(contexto, estado, rodadasRestantes);
    if (noDaArvore) {
      noDaArvore.valor = valor;
      noDaArvore.desfecho = desfecho;
    }
    return { valor, melhorMovimento: null };
  }

  if (rodadasRestantes === 0) {
    const avaliacao = avaliarPosicao(estado, contexto.jogadorMaximizador);
    if (noDaArvore) {
      noDaArvore.valor = avaliacao.valor;
      noDaArvore.avaliacao = avaliacao;
    }
    return { valor: avaliacao.valor, melhorMovimento: null };
  }

  const alfaNaEntrada = alfa;
  const movimentos = movimentosPossiveis(estado, contexto.jogadorMaximizador);
  let melhorValor = -Infinity;
  let melhorMovimento = null;
  let indiceDoMelhorFilho = -1;

  for (let indice = 0; indice < movimentos.length; indice++) {
    const movimento = movimentos[indice];
    const noFilho = criarNoFilho(contexto, noDaArvore, NO_MIN, movimento, alfa, beta);
    const { valor } = valorNoMinimizador(contexto, estado, movimento, rodadasRestantes, alfa, beta, noFilho);

    if (valor > melhorValor) {
      melhorValor = valor;
      melhorMovimento = movimento;
      indiceDoMelhorFilho = indice;
    }

    if (contexto.usarPodaAlfaBeta) {
      alfa = Math.max(alfa, melhorValor);
      if (alfa >= beta) {
        registrarRamosPodados(contexto, noDaArvore, NO_MIN, movimentos.slice(indice + 1));
        break;
      }
    }
  }

  concluirNoInterno(noDaArvore, melhorValor, alfaNaEntrada, beta, indiceDoMelhorFilho);
  return { valor: melhorValor, melhorMovimento };
}

function valorNoMinimizador(contexto, estado, movimentoDoMaximizador, rodadasRestantes, alfa, beta, noDaArvore) {
  contexto.nosVisitados += 1;

  const betaNaEntrada = beta;
  const movimentos = movimentosPossiveis(estado, contexto.jogadorMinimizador);
  let menorValor = Infinity;
  let melhorMovimento = null;
  let indiceDoMelhorFilho = -1;

  for (let indice = 0; indice < movimentos.length; indice++) {
    const movimento = movimentos[indice];
    const proximoEstado = aplicarRodadaPorPapel(estado, contexto.jogadorMaximizador, movimentoDoMaximizador, movimento);
    const noFilho = criarNoFilho(contexto, noDaArvore, NO_MAX, movimento, alfa, beta);
    const { valor } = valorNoMaximizador(contexto, proximoEstado, rodadasRestantes - 1, alfa, beta, noFilho);

    if (valor < menorValor) {
      menorValor = valor;
      melhorMovimento = movimento;
      indiceDoMelhorFilho = indice;
    }

    if (contexto.usarPodaAlfaBeta) {
      beta = Math.min(beta, menorValor);
      if (alfa >= beta) {
        registrarRamosPodados(contexto, noDaArvore, NO_MAX, movimentos.slice(indice + 1));
        break;
      }
    }
  }

  concluirNoInterno(noDaArvore, menorValor, alfa, betaNaEntrada, indiceDoMelhorFilho);
  return { valor: menorValor, melhorMovimento };
}

export function buscarMelhorMovimento(
  estado,
  jogadorMaximizador,
  { profundidadeEmRodadas, usarPodaAlfaBeta = true, registrarArvore = false },
) {
  const contexto = {
    jogadorMaximizador,
    jogadorMinimizador: oponenteDe(jogadorMaximizador),
    usarPodaAlfaBeta,
    nosVisitados: 0,
    ramosPodados: 0,
  };
  const raiz = registrarArvore
    ? criarNoDaArvore({
        tipo: NO_MAX,
        jogadorDaVez: jogadorMaximizador,
        jogadorQueMoveu: null,
        movimento: null,
        caminho: [],
        alfa: -Infinity,
        beta: Infinity,
      })
    : null;

  const inicio = performance.now();
  const { valor, melhorMovimento } = valorNoMaximizador(
    contexto,
    estado,
    profundidadeEmRodadas,
    -Infinity,
    Infinity,
    raiz,
  );
  const tempoEmMilissegundos = performance.now() - inicio;

  return {
    jogadorMaximizador,
    profundidadeEmRodadas,
    usarPodaAlfaBeta,
    movimento: melhorMovimento ?? movimentosPossiveis(estado, jogadorMaximizador)[0],
    valor,
    nosVisitados: contexto.nosVisitados,
    ramosPodados: contexto.ramosPodados,
    tempoEmMilissegundos,
    arvore: raiz,
  };
}

export function obterCaminhoPrincipal(raiz) {
  const caminho = [raiz];
  let noAtual = raiz;
  while (noAtual.indiceDoMelhorFilho >= 0) {
    noAtual = noAtual.filhos[noAtual.indiceDoMelhorFilho];
    caminho.push(noAtual);
  }
  return caminho;
}

export function valorIndicaVitoria(valor) {
  return valor >= VALOR_DE_VITORIA;
}

export function valorIndicaDerrota(valor) {
  return valor <= -VALOR_DE_VITORIA;
}

export function valorIndicaEmpate(valor) {
  return valor === VALOR_DE_EMPATE;
}
