import {
  CELULA_LIVRE,
  CELULA_PAREDE,
  CELULA_RASTRO_AZUL,
  CELULA_RASTRO_LARANJA,
  indiceDaCelula,
} from '../js/logica/tabuleiro.js';

const CELULA_POR_SIMBOLO = {
  '.': CELULA_LIVRE,
  '#': CELULA_PAREDE,
  A: CELULA_RASTRO_AZUL,
  a: CELULA_RASTRO_AZUL,
  L: CELULA_RASTRO_LARANJA,
  l: CELULA_RASTRO_LARANJA,
};

export function criarEstadoAPartirDoMapa(linhasDoMapa) {
  const tamanho = linhasDoMapa.length;
  const celulas = new Uint8Array(tamanho * tamanho);
  const posicoes = {};

  linhasDoMapa.forEach((linhaDoMapa, linha) => {
    if (linhaDoMapa.length !== tamanho) {
      throw new Error('O mapa de teste precisa ser quadrado.');
    }
    [...linhaDoMapa].forEach((simbolo, coluna) => {
      const indice = indiceDaCelula(tamanho, linha, coluna);
      celulas[indice] = CELULA_POR_SIMBOLO[simbolo];
      if (simbolo === 'A') {
        posicoes.azul = indice;
      }
      if (simbolo === 'L') {
        posicoes.laranja = indice;
      }
    });
  });

  return {
    tamanho,
    celulas,
    posicoes,
    trilhas: {
      azul: { indice: posicoes.azul, anterior: null },
      laranja: { indice: posicoes.laranja, anterior: null },
    },
    vivos: { azul: true, laranja: true },
    rodada: 0,
    ultimosMovimentos: { azul: null, laranja: null },
    pontosDeColisao: { azul: null, laranja: null },
  };
}
