export const CELULA_PAREDE = 1;
export const CELULA_RASTRO_AZUL = 2;
export const CELULA_RASTRO_LARANJA = 3;
export const FORA_DO_TABULEIRO = -1;

export const CELULA_DO_AZUL = 1;
export const CELULA_DO_LARANJA = 2;
export const CELULA_DISPUTADA = 3;

export const JOGADORES = ['azul', 'laranja'];
export const NOME_DE_EXIBICAO = { azul: 'Azul', laranja: 'Laranja' };
export const SETA_DE_CADA_DIRECAO = { cima: '↑', direita: '→', baixo: '↓', esquerda: '←' };

export function oponenteDe(jogador) {
  return jogador === 'azul' ? 'laranja' : 'azul';
}

export function linhaDoIndice(tamanho, indice) {
  return Math.floor(indice / tamanho);
}

export function colunaDoIndice(tamanho, indice) {
  return indice % tamanho;
}
