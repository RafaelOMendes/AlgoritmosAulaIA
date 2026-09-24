import { criarGeradorAleatorio, embaralhar, sortearInteiro } from './aleatorio.js';
import { comprimentoDaRota, criarMatrizDeDistancias } from './distancias.js';

export const QUANTIDADE_MINIMA_DE_PONTOS = 4;

export const CONFIGURACAO_PADRAO = {
  tamanhoDaPopulacao: 120,
  taxaDeCruzamento: 0.9,
  taxaDeMutacao: 0.5,
  quantidadeDeElite: 2,
  tamanhoDoTorneio: 3,
  geracoesSemMelhoraParaParar: 800,
};

export function criarIndividuo(rota, matrizDeDistancias) {
  const distancia = comprimentoDaRota(rota, matrizDeDistancias);
  return { rota, distancia, aptidao: 1 / distancia };
}

function ordenarPorDistancia(populacao) {
  return populacao.sort((individuoA, individuoB) => individuoA.distancia - individuoB.distancia);
}

export function criarPopulacaoInicial(quantidadeDePontos, tamanhoDaPopulacao, matrizDeDistancias, geradorAleatorio) {
  const rotaBase = Array.from({ length: quantidadeDePontos }, (_, indice) => indice);
  const populacao = Array.from({ length: tamanhoDaPopulacao }, () =>
    criarIndividuo(embaralhar(rotaBase, geradorAleatorio), matrizDeDistancias),
  );
  return ordenarPorDistancia(populacao);
}

export function selecionarPorTorneio(populacao, tamanhoDoTorneio, geradorAleatorio) {
  const participantes = Array.from(
    { length: tamanhoDoTorneio },
    () => populacao[sortearInteiro(geradorAleatorio, 0, populacao.length - 1)],
  );
  const vencedor = participantes.reduce((melhor, participante) =>
    participante.distancia < melhor.distancia ? participante : melhor,
  );
  return { participantes, vencedor };
}

function sortearTrecho(tamanho, geradorAleatorio) {
  const primeiro = sortearInteiro(geradorAleatorio, 0, tamanho - 1);
  const segundo = sortearInteiro(geradorAleatorio, 0, tamanho - 1);
  return { inicio: Math.min(primeiro, segundo), fim: Math.max(primeiro, segundo) };
}

export function cruzarComOrderCrossover(rotaDoPaiA, rotaDoPaiB, geradorAleatorio) {
  const tamanho = rotaDoPaiA.length;
  const { inicio, fim } = sortearTrecho(tamanho, geradorAleatorio);
  const rotaDoFilho = new Array(tamanho).fill(-1);
  const pontosHerdadosDoPaiA = new Set();

  for (let posicao = inicio; posicao <= fim; posicao++) {
    rotaDoFilho[posicao] = rotaDoPaiA[posicao];
    pontosHerdadosDoPaiA.add(rotaDoPaiA[posicao]);
  }

  let posicaoParaPreencher = (fim + 1) % tamanho;
  for (let deslocamento = 0; deslocamento < tamanho; deslocamento++) {
    const pontoDoPaiB = rotaDoPaiB[(fim + 1 + deslocamento) % tamanho];
    if (!pontosHerdadosDoPaiA.has(pontoDoPaiB)) {
      rotaDoFilho[posicaoParaPreencher] = pontoDoPaiB;
      posicaoParaPreencher = (posicaoParaPreencher + 1) % tamanho;
    }
  }
  return { rota: rotaDoFilho, inicioDoTrecho: inicio, fimDoTrecho: fim };
}

export function mutarPorInversao(rota, geradorAleatorio) {
  const { inicio, fim } = sortearTrecho(rota.length, geradorAleatorio);
  const rotaMutada = [...rota.slice(0, inicio), ...rota.slice(inicio, fim + 1).reverse(), ...rota.slice(fim + 1)];
  return { rota: rotaMutada, inicioDoTrecho: inicio, fimDoTrecho: fim };
}

function calcularEstatisticas(geracao, populacao) {
  const somaDasDistancias = populacao.reduce((soma, individuo) => soma + individuo.distancia, 0);
  return {
    geracao,
    melhor: populacao[0].distancia,
    media: somaDasDistancias / populacao.length,
    pior: populacao.at(-1).distancia,
  };
}

export function criarAlgoritmoGenetico(pontos, configuracao, semente) {
  if (pontos.length < QUANTIDADE_MINIMA_DE_PONTOS) {
    throw new Error(`São necessários pelo menos ${QUANTIDADE_MINIMA_DE_PONTOS} pontos.`);
  }
  const geradorAleatorio = criarGeradorAleatorio(semente);
  const matrizDeDistancias = criarMatrizDeDistancias(pontos);
  const populacao = criarPopulacaoInicial(
    pontos.length,
    configuracao.tamanhoDaPopulacao,
    matrizDeDistancias,
    geradorAleatorio,
  );
  const estatisticasIniciais = calcularEstatisticas(0, populacao);
  return {
    pontos,
    matrizDeDistancias,
    geradorAleatorio,
    populacao,
    geracao: 0,
    historico: [estatisticasIniciais],
    geracaoDaUltimaMelhora: 0,
    individuosAvaliados: populacao.length,
    exemploDeReproducao: null,
  };
}

function gerarFilho(algoritmo, configuracao) {
  const { populacao, geradorAleatorio, matrizDeDistancias } = algoritmo;
  const torneioDoPaiA = selecionarPorTorneio(populacao, configuracao.tamanhoDoTorneio, geradorAleatorio);
  const torneioDoPaiB = selecionarPorTorneio(populacao, configuracao.tamanhoDoTorneio, geradorAleatorio);

  const cruzamento =
    geradorAleatorio() < configuracao.taxaDeCruzamento
      ? cruzarComOrderCrossover(torneioDoPaiA.vencedor.rota, torneioDoPaiB.vencedor.rota, geradorAleatorio)
      : null;
  const rotaAntesDaMutacao = cruzamento ? cruzamento.rota : [...torneioDoPaiA.vencedor.rota];

  const mutacao = geradorAleatorio() < configuracao.taxaDeMutacao ? mutarPorInversao(rotaAntesDaMutacao, geradorAleatorio) : null;
  const filho = criarIndividuo(mutacao ? mutacao.rota : rotaAntesDaMutacao, matrizDeDistancias);

  return { filho, exemplo: { torneioDoPaiA, torneioDoPaiB, cruzamento, rotaAntesDaMutacao, mutacao, filho } };
}

export function evoluirUmaGeracao(algoritmo, configuracao) {
  const quantidadeDeElite = Math.min(configuracao.quantidadeDeElite, configuracao.tamanhoDaPopulacao);
  const novaPopulacao = algoritmo.populacao.slice(0, quantidadeDeElite);
  let exemploDeReproducao = null;

  while (novaPopulacao.length < configuracao.tamanhoDaPopulacao) {
    const { filho, exemplo } = gerarFilho(algoritmo, configuracao);
    exemploDeReproducao ??= exemplo;
    novaPopulacao.push(filho);
  }

  const melhorDistanciaAnterior = algoritmo.populacao[0].distancia;
  algoritmo.populacao = ordenarPorDistancia(novaPopulacao);
  algoritmo.geracao += 1;
  algoritmo.individuosAvaliados += configuracao.tamanhoDaPopulacao - quantidadeDeElite;
  algoritmo.exemploDeReproducao = exemploDeReproducao;
  algoritmo.historico.push(calcularEstatisticas(algoritmo.geracao, algoritmo.populacao));
  if (algoritmo.populacao[0].distancia < melhorDistanciaAnterior - 1e-9) {
    algoritmo.geracaoDaUltimaMelhora = algoritmo.geracao;
  }
  return algoritmo;
}

export function algoritmoConvergiu(algoritmo, configuracao) {
  return algoritmo.geracao - algoritmo.geracaoDaUltimaMelhora >= configuracao.geracoesSemMelhoraParaParar;
}

export function melhorIndividuo(algoritmo) {
  return algoritmo.populacao[0];
}

export function contarRotasDistintas(populacao) {
  return new Set(populacao.map((individuo) => individuo.rota.join(','))).size;
}
