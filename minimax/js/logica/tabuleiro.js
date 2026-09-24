export const CELULA_LIVRE = 0;
export const CELULA_PAREDE = 1;
export const CELULA_RASTRO_AZUL = 2;
export const CELULA_RASTRO_LARANJA = 3;

export const FORA_DO_TABULEIRO = -1;

export const DIRECOES = [
  { nome: 'cima', seta: '↑', deltaLinha: -1, deltaColuna: 0 },
  { nome: 'direita', seta: '→', deltaLinha: 0, deltaColuna: 1 },
  { nome: 'baixo', seta: '↓', deltaLinha: 1, deltaColuna: 0 },
  { nome: 'esquerda', seta: '←', deltaLinha: 0, deltaColuna: -1 },
];

export const DIRECAO_POR_NOME = Object.fromEntries(DIRECOES.map((direcao) => [direcao.nome, direcao]));

export function indiceDaCelula(tamanho, linha, coluna) {
  return linha * tamanho + coluna;
}

export function linhaDoIndice(tamanho, indice) {
  return Math.floor(indice / tamanho);
}

export function colunaDoIndice(tamanho, indice) {
  return indice % tamanho;
}

export function posicaoEstaDentroDoTabuleiro(tamanho, linha, coluna) {
  return linha >= 0 && linha < tamanho && coluna >= 0 && coluna < tamanho;
}

export function vizinhoNaDirecao(tamanho, indice, nomeDaDirecao) {
  const direcao = DIRECAO_POR_NOME[nomeDaDirecao];
  const linhaVizinha = linhaDoIndice(tamanho, indice) + direcao.deltaLinha;
  const colunaVizinha = colunaDoIndice(tamanho, indice) + direcao.deltaColuna;
  if (!posicaoEstaDentroDoTabuleiro(tamanho, linhaVizinha, colunaVizinha)) {
    return FORA_DO_TABULEIRO;
  }
  return indiceDaCelula(tamanho, linhaVizinha, colunaVizinha);
}

export function vizinhosDentroDoTabuleiro(tamanho, indice) {
  return DIRECOES.map((direcao) => vizinhoNaDirecao(tamanho, indice, direcao.nome)).filter(
    (vizinho) => vizinho !== FORA_DO_TABULEIRO,
  );
}

export function indiceEspelhado(tamanho, indice) {
  return tamanho * tamanho - 1 - indice;
}
