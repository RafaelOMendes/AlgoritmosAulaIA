import { SETA_DE_CADA_DIRECAO } from './tabuleiro.js';

const formatadorDeNumeros = new Intl.NumberFormat('pt-BR');
const constantesDoJogo = { valorDeVitoria: 1000, valorDeEmpate: -500 };

export function definirConstantesDoJogo({ valorDeVitoria, valorDeEmpate }) {
  constantesDoJogo.valorDeVitoria = valorDeVitoria;
  constantesDoJogo.valorDeEmpate = valorDeEmpate;
}

export function obterConstantesDoJogo() {
  return { ...constantesDoJogo };
}

export function valorIndicaVitoria(valor) {
  return valor >= constantesDoJogo.valorDeVitoria;
}

export function valorIndicaDerrota(valor) {
  return valor <= -constantesDoJogo.valorDeVitoria;
}

export function valorIndicaEmpate(valor) {
  return valor === constantesDoJogo.valorDeEmpate;
}

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

export function formatarAlfa(valor) {
  return valor === null || valor === undefined ? '−∞' : formatarComSinal(valor);
}

export function formatarBeta(valor) {
  return valor === null || valor === undefined ? '+∞' : formatarComSinal(valor);
}

export function formatarMilissegundos(milissegundos) {
  if (milissegundos < 10) {
    return `${milissegundos.toFixed(1).replace('.', ',')} ms`;
  }
  return `${formatarNumero(Math.round(milissegundos))} ms`;
}

export function setaDoMovimento(nomeDoMovimento) {
  return SETA_DE_CADA_DIRECAO[nomeDoMovimento];
}

export function descreverMovimento(nomeDoMovimento) {
  return `${setaDoMovimento(nomeDoMovimento)} ${nomeDoMovimento}`;
}

export function descreverProfundidade(profundidadeEmRodadas) {
  const rodadas = profundidadeEmRodadas === 1 ? 'rodada' : 'rodadas';
  return `${profundidadeEmRodadas} ${rodadas} (${profundidadeEmRodadas * 2} níveis)`;
}
