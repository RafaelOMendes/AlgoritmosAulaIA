import { criarGeradorAleatorio, sortearElemento, sortearInteiro } from './aleatorio.js';
import {
  CELULA_LIVRE,
  CELULA_PAREDE,
  colunaDoIndice,
  indiceDaCelula,
  indiceEspelhado,
  linhaDoIndice,
  posicaoEstaDentroDoTabuleiro,
  vizinhosDentroDoTabuleiro,
} from './tabuleiro.js';

export const TAMANHO_MINIMO_DO_LABIRINTO = 9;
export const DENSIDADE_DE_PAREDES = 0.2;
export const DISTANCIA_LIVRE_AO_REDOR_DOS_JOGADORES = 2;
export const COMPRIMENTO_MINIMO_DE_PAREDE = 2;
export const COMPRIMENTO_MAXIMO_DE_PAREDE = 5;
export const LIMITE_DE_TENTATIVAS_DE_GERACAO = 50;

export function calcularPosicoesIniciais(tamanho) {
  const linhaDoMeio = Math.floor(tamanho / 2);
  const indiceDoAzul = indiceDaCelula(tamanho, linhaDoMeio, 2);
  return {
    azul: indiceDoAzul,
    laranja: indiceEspelhado(tamanho, indiceDoAzul),
  };
}

function distanciaDeManhattan(tamanho, indiceA, indiceB) {
  return (
    Math.abs(linhaDoIndice(tamanho, indiceA) - linhaDoIndice(tamanho, indiceB)) +
    Math.abs(colunaDoIndice(tamanho, indiceA) - colunaDoIndice(tamanho, indiceB))
  );
}

function celulaEstaProtegida(tamanho, indice, posicoesIniciais) {
  return Object.values(posicoesIniciais).some(
    (posicaoInicial) =>
      distanciaDeManhattan(tamanho, indice, posicaoInicial) <= DISTANCIA_LIVRE_AO_REDOR_DOS_JOGADORES,
  );
}

function contarParedes(celulas) {
  return celulas.reduce((total, celula) => total + (celula === CELULA_PAREDE ? 1 : 0), 0);
}

function sortearParedesSimetricas(tamanho, posicoesIniciais, geradorAleatorio) {
  const celulas = new Uint8Array(tamanho * tamanho);
  const quantidadeDeParedesDesejada = Math.floor(tamanho * tamanho * DENSIDADE_DE_PAREDES);
  const limiteDeSorteios = tamanho * tamanho * 4;

  for (let sorteio = 0; sorteio < limiteDeSorteios && contarParedes(celulas) < quantidadeDeParedesDesejada; sorteio++) {
    const linhaInicial = sortearInteiro(geradorAleatorio, 0, tamanho - 1);
    const colunaInicial = sortearInteiro(geradorAleatorio, 0, tamanho - 1);
    const paredeHorizontal = sortearElemento(geradorAleatorio, [true, false]);
    const comprimento = sortearInteiro(geradorAleatorio, COMPRIMENTO_MINIMO_DE_PAREDE, COMPRIMENTO_MAXIMO_DE_PAREDE);

    for (let passo = 0; passo < comprimento; passo++) {
      const linha = paredeHorizontal ? linhaInicial : linhaInicial + passo;
      const coluna = paredeHorizontal ? colunaInicial + passo : colunaInicial;
      if (!posicaoEstaDentroDoTabuleiro(tamanho, linha, coluna)) {
        break;
      }
      const indice = indiceDaCelula(tamanho, linha, coluna);
      if (celulaEstaProtegida(tamanho, indice, posicoesIniciais)) {
        continue;
      }
      celulas[indice] = CELULA_PAREDE;
      celulas[indiceEspelhado(tamanho, indice)] = CELULA_PAREDE;
    }
  }
  return celulas;
}

export function encontrarCelulasAlcancaveis(tamanho, celulas, origem) {
  const alcancaveis = new Uint8Array(tamanho * tamanho);
  const fila = [origem];
  alcancaveis[origem] = 1;
  for (let posicaoNaFila = 0; posicaoNaFila < fila.length; posicaoNaFila++) {
    for (const vizinho of vizinhosDentroDoTabuleiro(tamanho, fila[posicaoNaFila])) {
      if (!alcancaveis[vizinho] && celulas[vizinho] === CELULA_LIVRE) {
        alcancaveis[vizinho] = 1;
        fila.push(vizinho);
      }
    }
  }
  return alcancaveis;
}

function fecharBolsoesIsolados(tamanho, celulas, posicoesIniciais) {
  const alcancaveisPeloAzul = encontrarCelulasAlcancaveis(tamanho, celulas, posicoesIniciais.azul);
  if (!alcancaveisPeloAzul[posicoesIniciais.laranja]) {
    return false;
  }
  for (let indice = 0; indice < celulas.length; indice++) {
    if (celulas[indice] === CELULA_LIVRE && !alcancaveisPeloAzul[indice]) {
      celulas[indice] = CELULA_PAREDE;
    }
  }
  return true;
}

export function gerarLabirinto(tamanho, semente) {
  if (tamanho < TAMANHO_MINIMO_DO_LABIRINTO) {
    throw new Error(`O labirinto precisa ter pelo menos ${TAMANHO_MINIMO_DO_LABIRINTO} células de lado.`);
  }
  const geradorAleatorio = criarGeradorAleatorio(semente);
  const posicoesIniciais = calcularPosicoesIniciais(tamanho);

  for (let tentativa = 0; tentativa < LIMITE_DE_TENTATIVAS_DE_GERACAO; tentativa++) {
    const celulas = sortearParedesSimetricas(tamanho, posicoesIniciais, geradorAleatorio);
    if (fecharBolsoesIsolados(tamanho, celulas, posicoesIniciais)) {
      return { tamanho, semente, celulas, posicoesIniciais };
    }
  }
  throw new Error('Não foi possível gerar um labirinto conectado. Tente outra semente.');
}
