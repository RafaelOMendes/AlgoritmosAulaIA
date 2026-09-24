import { valorIndicaDerrota, valorIndicaEmpate, valorIndicaVitoria } from '../logica/minimax.js';
import { DIRECAO_POR_NOME } from '../logica/tabuleiro.js';

const formatadorDeNumeros = new Intl.NumberFormat('pt-BR');

export function formatarNumero(numero) {
  return formatadorDeNumeros.format(numero);
}

export function formatarComSinal(numero) {
  if (numero > 0) {
    return `+${formatarNumero(numero)}`;
  }
  if (numero < 0) {
    return `−${formatarNumero(Math.abs(numero))}`;
  }
  return '0';
}

export function formatarValorMinimax(valor) {
  if (valor === null || valor === undefined) {
    return '—';
  }
  if (valorIndicaVitoria(valor)) {
    return 'vitória';
  }
  if (valorIndicaDerrota(valor)) {
    return 'derrota';
  }
  if (valorIndicaEmpate(valor)) {
    return 'empate';
  }
  return formatarComSinal(valor);
}

export function classeDoValorMinimax(valor) {
  if (valor === null || valor === undefined) {
    return '';
  }
  if (valorIndicaVitoria(valor)) {
    return 'valor-vitoria';
  }
  if (valorIndicaDerrota(valor)) {
    return 'valor-derrota';
  }
  if (valorIndicaEmpate(valor)) {
    return 'valor-empate';
  }
  return '';
}

export function formatarLimiteAlfaBeta(valor) {
  if (valor === Infinity) {
    return '+∞';
  }
  if (valor === -Infinity) {
    return '−∞';
  }
  return formatarComSinal(valor);
}

export function formatarMilissegundos(milissegundos) {
  if (milissegundos < 10) {
    return `${milissegundos.toFixed(1).replace('.', ',')} ms`;
  }
  return `${formatarNumero(Math.round(milissegundos))} ms`;
}

export function setaDoMovimento(nomeDoMovimento) {
  return DIRECAO_POR_NOME[nomeDoMovimento].seta;
}

export function descreverMovimento(nomeDoMovimento) {
  return `${setaDoMovimento(nomeDoMovimento)} ${nomeDoMovimento}`;
}

export function descreverProfundidade(profundidadeEmRodadas) {
  const rodadas = profundidadeEmRodadas === 1 ? 'rodada' : 'rodadas';
  return `${profundidadeEmRodadas} ${rodadas} (${profundidadeEmRodadas * 2} níveis)`;
}
