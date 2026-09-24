import { criarGeradorAleatorio, sortearInteiro, sortearNumeroNormal } from './aleatorio.js';
import { DEFINICAO_DOS_GENES, ajustarAoIntervalo, arredondarGene } from './genes.js';
import { calcularAptidao } from './metricas.js';

export const CONFIGURACAO_PADRAO = {
  tamanhoDaPopulacao: 40,
  taxaDeCruzamento: 0.9,
  taxaDeMutacaoPorGene: 0.15,
  intensidadeDaMutacao: 0.1,
  quantidadeDeElite: 2,
  tamanhoDoTorneio: 3,
  geracoesSemMelhoraParaParar: 150,
};

export function criarIndividuo(genes) {
  const { aptidao, metricas } = calcularAptidao(genes);
  return { genes, aptidao, metricas };
}

export function sortearGenes(geradorAleatorio) {
  return Object.fromEntries(
    DEFINICAO_DOS_GENES.map((gene) => [
      gene.nome,
      arredondarGene(gene, gene.minimo + geradorAleatorio() * (gene.maximo - gene.minimo)),
    ]),
  );
}

function ordenarPorAptidao(populacao) {
  return populacao.sort((individuoA, individuoB) => individuoB.aptidao - individuoA.aptidao);
}

export function selecionarPorTorneio(populacao, tamanhoDoTorneio, geradorAleatorio) {
  const participantes = Array.from(
    { length: tamanhoDoTorneio },
    () => populacao[sortearInteiro(geradorAleatorio, 0, populacao.length - 1)],
  );
  const vencedor = participantes.reduce((melhor, participante) =>
    participante.aptidao > melhor.aptidao ? participante : melhor,
  );
  return { participantes, vencedor };
}

export function cruzarUniformemente(genesDoPaiA, genesDoPaiB, geradorAleatorio) {
  const genes = {};
  const origemDeCadaGene = {};
  for (const gene of DEFINICAO_DOS_GENES) {
    const vemDoPaiA = geradorAleatorio() < 0.5;
    genes[gene.nome] = vemDoPaiA ? genesDoPaiA[gene.nome] : genesDoPaiB[gene.nome];
    origemDeCadaGene[gene.nome] = vemDoPaiA ? 'A' : 'B';
  }
  return { genes, origemDeCadaGene };
}

export function mutarComRuidoGaussiano(genes, taxaDeMutacaoPorGene, intensidadeDaMutacao, geradorAleatorio) {
  const genesMutados = { ...genes };
  const nomesDosGenesMutados = [];
  for (const gene of DEFINICAO_DOS_GENES) {
    if (geradorAleatorio() < taxaDeMutacaoPorGene) {
      const desvio = sortearNumeroNormal(geradorAleatorio) * intensidadeDaMutacao * (gene.maximo - gene.minimo);
      genesMutados[gene.nome] = ajustarAoIntervalo(gene, genes[gene.nome] + desvio);
      nomesDosGenesMutados.push(gene.nome);
    }
  }
  return { genes: genesMutados, nomesDosGenesMutados };
}

function calcularEstatisticas(geracao, populacao) {
  const somaDasAptidoes = populacao.reduce((soma, individuo) => soma + individuo.aptidao, 0);
  return {
    geracao,
    melhor: populacao[0].aptidao,
    media: somaDasAptidoes / populacao.length,
    pior: populacao.at(-1).aptidao,
  };
}

export function criarAlgoritmoGenetico(configuracao, semente) {
  const geradorAleatorio = criarGeradorAleatorio(semente);
  const populacao = ordenarPorAptidao(
    Array.from({ length: configuracao.tamanhoDaPopulacao }, () => criarIndividuo(sortearGenes(geradorAleatorio))),
  );
  return {
    semente,
    geradorAleatorio,
    populacao,
    geracao: 0,
    historico: [calcularEstatisticas(0, populacao)],
    geracaoDaUltimaMelhora: 0,
    variacoesAvaliadas: populacao.length,
    exemploDeReproducao: null,
  };
}

function gerarFilho(algoritmo, configuracao) {
  const { populacao, geradorAleatorio } = algoritmo;
  const torneioDoPaiA = selecionarPorTorneio(populacao, configuracao.tamanhoDoTorneio, geradorAleatorio);
  const torneioDoPaiB = selecionarPorTorneio(populacao, configuracao.tamanhoDoTorneio, geradorAleatorio);

  const cruzamento =
    geradorAleatorio() < configuracao.taxaDeCruzamento
      ? cruzarUniformemente(torneioDoPaiA.vencedor.genes, torneioDoPaiB.vencedor.genes, geradorAleatorio)
      : null;
  const genesAntesDaMutacao = cruzamento ? cruzamento.genes : { ...torneioDoPaiA.vencedor.genes };
  const mutacao = mutarComRuidoGaussiano(
    genesAntesDaMutacao,
    configuracao.taxaDeMutacaoPorGene,
    configuracao.intensidadeDaMutacao,
    geradorAleatorio,
  );
  const filho = criarIndividuo(mutacao.genes);
  return { filho, exemplo: { torneioDoPaiA, torneioDoPaiB, cruzamento, genesAntesDaMutacao, mutacao, filho } };
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

  const melhorAptidaoAnterior = algoritmo.populacao[0].aptidao;
  algoritmo.populacao = ordenarPorAptidao(novaPopulacao);
  algoritmo.geracao += 1;
  algoritmo.variacoesAvaliadas += configuracao.tamanhoDaPopulacao - quantidadeDeElite;
  algoritmo.exemploDeReproducao = exemploDeReproducao;
  algoritmo.historico.push(calcularEstatisticas(algoritmo.geracao, algoritmo.populacao));
  if (algoritmo.populacao[0].aptidao > melhorAptidaoAnterior + 1e-9) {
    algoritmo.geracaoDaUltimaMelhora = algoritmo.geracao;
  }
  return algoritmo;
}

export const APTIDAO_MAXIMA = 100;

export function atingiuAptidaoMaxima(algoritmo) {
  return algoritmo.populacao[0].aptidao >= APTIDAO_MAXIMA - 1e-9;
}

export function algoritmoConvergiu(algoritmo, configuracao) {
  return (
    atingiuAptidaoMaxima(algoritmo) ||
    algoritmo.geracao - algoritmo.geracaoDaUltimaMelhora >= configuracao.geracoesSemMelhoraParaParar
  );
}

export function melhorIndividuo(algoritmo) {
  return algoritmo.populacao[0];
}
