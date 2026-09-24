import {
  CELULA_LIVRE,
  CELULA_PAREDE,
  CELULA_RASTRO_AZUL,
  CELULA_RASTRO_LARANJA,
  DIRECOES,
  FORA_DO_TABULEIRO,
  vizinhoNaDirecao,
} from './tabuleiro.js';

export const JOGADORES = ['azul', 'laranja'];

export const NOME_DE_EXIBICAO = { azul: 'Azul', laranja: 'Laranja' };

export const CELULA_DE_RASTRO_DO_JOGADOR = { azul: CELULA_RASTRO_AZUL, laranja: CELULA_RASTRO_LARANJA };

export function oponenteDe(jogador) {
  return jogador === 'azul' ? 'laranja' : 'azul';
}

export function criarEstadoInicial(labirinto) {
  const celulas = Uint8Array.from(labirinto.celulas);
  celulas[labirinto.posicoesIniciais.azul] = CELULA_RASTRO_AZUL;
  celulas[labirinto.posicoesIniciais.laranja] = CELULA_RASTRO_LARANJA;
  return {
    tamanho: labirinto.tamanho,
    celulas,
    posicoes: { ...labirinto.posicoesIniciais },
    trilhas: {
      azul: { indice: labirinto.posicoesIniciais.azul, anterior: null },
      laranja: { indice: labirinto.posicoesIniciais.laranja, anterior: null },
    },
    vivos: { azul: true, laranja: true },
    rodada: 0,
    ultimosMovimentos: { azul: null, laranja: null },
    pontosDeColisao: { azul: null, laranja: null },
  };
}

export function celulaEstaLivre(estado, indice) {
  return indice !== FORA_DO_TABULEIRO && estado.celulas[indice] === CELULA_LIVRE;
}

export function movimentosSeguros(estado, jogador) {
  return DIRECOES.map((direcao) => direcao.nome).filter((nomeDaDirecao) =>
    celulaEstaLivre(estado, vizinhoNaDirecao(estado.tamanho, estado.posicoes[jogador], nomeDaDirecao)),
  );
}

export function movimentosPossiveis(estado, jogador) {
  const seguros = movimentosSeguros(estado, jogador);
  if (seguros.length > 0) {
    return seguros;
  }
  return [estado.ultimosMovimentos[jogador] ?? DIRECOES[0].nome];
}

export function listarTrilha(estado, jogador) {
  const indicesDoFimParaOInicio = [];
  for (let passo = estado.trilhas[jogador]; passo !== null; passo = passo.anterior) {
    indicesDoFimParaOInicio.push(passo.indice);
  }
  return indicesDoFimParaOInicio.reverse();
}

export function jogoTerminou(estado) {
  return !estado.vivos.azul || !estado.vivos.laranja;
}

export function vencedorDoJogo(estado) {
  if (!jogoTerminou(estado)) {
    return null;
  }
  if (estado.vivos.azul) {
    return 'azul';
  }
  if (estado.vivos.laranja) {
    return 'laranja';
  }
  return 'empate';
}

export function aplicarRodada(estado, movimentoDoAzul, movimentoDoLaranja) {
  const destinoDoAzul = vizinhoNaDirecao(estado.tamanho, estado.posicoes.azul, movimentoDoAzul);
  const destinoDoLaranja = vizinhoNaDirecao(estado.tamanho, estado.posicoes.laranja, movimentoDoLaranja);
  const houveColisaoFrontal = destinoDoAzul === destinoDoLaranja;

  const azulSobrevive = celulaEstaLivre(estado, destinoDoAzul) && !houveColisaoFrontal;
  const laranjaSobrevive = celulaEstaLivre(estado, destinoDoLaranja) && !houveColisaoFrontal;

  const celulas = Uint8Array.from(estado.celulas);
  if (azulSobrevive) {
    celulas[destinoDoAzul] = CELULA_RASTRO_AZUL;
  }
  if (laranjaSobrevive) {
    celulas[destinoDoLaranja] = CELULA_RASTRO_LARANJA;
  }

  return {
    tamanho: estado.tamanho,
    celulas,
    posicoes: {
      azul: azulSobrevive ? destinoDoAzul : estado.posicoes.azul,
      laranja: laranjaSobrevive ? destinoDoLaranja : estado.posicoes.laranja,
    },
    trilhas: {
      azul: azulSobrevive ? { indice: destinoDoAzul, anterior: estado.trilhas.azul } : estado.trilhas.azul,
      laranja: laranjaSobrevive ? { indice: destinoDoLaranja, anterior: estado.trilhas.laranja } : estado.trilhas.laranja,
    },
    vivos: { azul: azulSobrevive, laranja: laranjaSobrevive },
    rodada: estado.rodada + 1,
    ultimosMovimentos: { azul: movimentoDoAzul, laranja: movimentoDoLaranja },
    pontosDeColisao: {
      azul: azulSobrevive ? null : destinoDoAzul,
      laranja: laranjaSobrevive ? null : destinoDoLaranja,
    },
  };
}

export function aplicarRodadaPorPapel(estado, jogadorMaximizador, movimentoDoMaximizador, movimentoDoMinimizador) {
  if (jogadorMaximizador === 'azul') {
    return aplicarRodada(estado, movimentoDoMaximizador, movimentoDoMinimizador);
  }
  return aplicarRodada(estado, movimentoDoMinimizador, movimentoDoMaximizador);
}

export function descreverCausaDaColisao(estadoAntes, estadoDepois, jogador) {
  if (estadoDepois.vivos[jogador]) {
    return null;
  }
  const pontoDeColisao = estadoDepois.pontosDeColisao[jogador];
  const pontoDeColisaoDoOponente = estadoDepois.pontosDeColisao[oponenteDe(jogador)];
  if (pontoDeColisao === FORA_DO_TABULEIRO) {
    return 'saiu do tabuleiro';
  }
  if (pontoDeColisao === pontoDeColisaoDoOponente && estadoAntes.celulas[pontoDeColisao] === CELULA_LIVRE) {
    return 'colisão frontal com o oponente';
  }
  const celulaAtingida = estadoAntes.celulas[pontoDeColisao];
  if (celulaAtingida === CELULA_PAREDE) {
    return 'bateu em uma parede';
  }
  if (celulaAtingida === CELULA_DE_RASTRO_DO_JOGADOR[jogador]) {
    return 'bateu no próprio rastro';
  }
  return 'bateu no rastro do oponente';
}
