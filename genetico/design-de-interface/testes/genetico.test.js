import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { criarGeradorAleatorio } from '../js/logica/aleatorio.js';
import { calcularRazaoDeContraste, converterHslParaRgb } from '../js/logica/cores.js';
import { DEFINICAO_DOS_GENES, GENE_POR_NOME, ajustarAoIntervalo } from '../js/logica/genes.js';
import { calcularAptidao, notaPorFaixaIdeal } from '../js/logica/metricas.js';
import {
  CONFIGURACAO_PADRAO,
  algoritmoConvergiu,
  criarAlgoritmoGenetico,
  cruzarUniformemente,
  evoluirUmaGeracao,
  mutarComRuidoGaussiano,
  sortearGenes,
} from '../js/logica/genetico.js';

const INTERFACE_BEM_PROJETADA = {
  matizDoFundo: 220,
  saturacaoDoFundo: 10,
  luminosidadeDoFundo: 98,
  matizDoTexto: 220,
  saturacaoDoTexto: 20,
  luminosidadeDoTexto: 10,
  matizDoBotao: 250,
  saturacaoDoBotao: 70,
  luminosidadeDoBotao: 30,
  luminosidadeDoTextoDoBotao: 100,
  tamanhoDaFonte: 17,
  escalaDoTitulo: 1.9,
  alturaDaLinha: 1.5,
  alturaDoBotao: 48,
  margemLateral: 16,
  espacamentoEntreBlocos: 24,
  raioDaBorda: 12,
};

function genesDentroDosLimites(genes) {
  return DEFINICAO_DOS_GENES.every((gene) => genes[gene.nome] >= gene.minimo && genes[gene.nome] <= gene.maximo);
}

describe('Cores e contraste (WCAG)', () => {
  it('converte HSL para RGB', () => {
    assert.deepEqual(converterHslParaRgb(0, 100, 50), [255, 0, 0]);
    assert.deepEqual(converterHslParaRgb(0, 0, 100), [255, 255, 255]);
    assert.deepEqual(converterHslParaRgb(240, 100, 50), [0, 0, 255]);
  });

  it('calcula 21:1 para preto no branco e 1:1 para cores iguais', () => {
    assert.ok(Math.abs(calcularRazaoDeContraste([0, 0, 0], [255, 255, 255]) - 21) < 0.01);
    assert.equal(calcularRazaoDeContraste([120, 40, 200], [120, 40, 200]), 1);
  });
});

describe('Métricas de legibilidade', () => {
  it('a nota por faixa vale 1 dentro do ideal e cai até 0 nas pontas', () => {
    assert.equal(notaPorFaixaIdeal(17, 13, 16, 18, 22), 1);
    assert.equal(notaPorFaixaIdeal(13, 13, 16, 18, 22), 0);
    assert.equal(notaPorFaixaIdeal(20, 13, 16, 18, 22), 0.5);
  });

  it('dá nota máxima para uma interface bem projetada', () => {
    const { aptidao, metricas } = calcularAptidao(INTERFACE_BEM_PROJETADA);
    const metricasAbaixoDoIdeal = metricas.filter((metrica) => metrica.nota < 1).map((metrica) => metrica.chave);
    assert.deepEqual(metricasAbaixoDoIdeal, []);
    assert.ok(Math.abs(aptidao - 100) < 1e-9);
  });

  it('pune texto sem contraste e fonte pequena', () => {
    const ilegivel = { ...INTERFACE_BEM_PROJETADA, luminosidadeDoTexto: 92, tamanhoDaFonte: 11 };
    const { aptidao, metricas } = calcularAptidao(ilegivel);
    assert.ok(aptidao < 75);
    assert.ok(metricas.find((metrica) => metrica.chave === 'contrasteDoTexto').nota < 0.1);
    assert.equal(metricas.find((metrica) => metrica.chave === 'tamanhoDaFonte').nota, 0);
  });

  it('os pesos das métricas somam 100', () => {
    const { metricas } = calcularAptidao(INTERFACE_BEM_PROJETADA);
    assert.equal(metricas.reduce((soma, metrica) => soma + metrica.peso, 0), 100);
  });
});

describe('Operadores genéticos', () => {
  it('o cruzamento uniforme copia cada gene de um dos pais', () => {
    const geradorAleatorio = criarGeradorAleatorio(9);
    const paiA = sortearGenes(geradorAleatorio);
    const paiB = sortearGenes(geradorAleatorio);
    const { genes, origemDeCadaGene } = cruzarUniformemente(paiA, paiB, geradorAleatorio);
    for (const gene of DEFINICAO_DOS_GENES) {
      const paiDeOrigem = origemDeCadaGene[gene.nome] === 'A' ? paiA : paiB;
      assert.equal(genes[gene.nome], paiDeOrigem[gene.nome]);
    }
  });

  it('a mutação mantém os genes dentro dos limites e dá a volta na matiz', () => {
    const geradorAleatorio = criarGeradorAleatorio(4);
    let genes = sortearGenes(geradorAleatorio);
    for (let tentativa = 0; tentativa < 300; tentativa++) {
      genes = mutarComRuidoGaussiano(genes, 0.8, 0.5, geradorAleatorio).genes;
      assert.ok(genesDentroDosLimites(genes));
    }
    assert.equal(ajustarAoIntervalo(GENE_POR_NOME.matizDoFundo, 370), 10);
    assert.equal(ajustarAoIntervalo(GENE_POR_NOME.tamanhoDaFonte, 99), 28);
  });

  it('sem chance de mutação, nenhum gene muda', () => {
    const geradorAleatorio = criarGeradorAleatorio(4);
    const genes = sortearGenes(geradorAleatorio);
    const resultado = mutarComRuidoGaussiano(genes, 0, 0.5, geradorAleatorio);
    assert.deepEqual(resultado.genes, genes);
    assert.deepEqual(resultado.nomesDosGenesMutados, []);
  });
});

describe('Algoritmo genético', () => {
  it('nunca piora o melhor indivíduo e chega a uma interface muito boa', () => {
    const algoritmo = criarAlgoritmoGenetico(CONFIGURACAO_PADRAO, 21);
    let melhorAnterior = algoritmo.populacao[0].aptidao;
    const melhorInicial = melhorAnterior;
    while (!algoritmoConvergiu(algoritmo, CONFIGURACAO_PADRAO) && algoritmo.geracao < 1000) {
      evoluirUmaGeracao(algoritmo, CONFIGURACAO_PADRAO);
      assert.ok(algoritmo.populacao[0].aptidao >= melhorAnterior - 1e-9);
      melhorAnterior = algoritmo.populacao[0].aptidao;
    }
    assert.ok(melhorAnterior > melhorInicial);
    assert.ok(melhorAnterior > 95, `nota final ${melhorAnterior}`);
  });

  it('mantém o tamanho da população e todos os genes válidos', () => {
    const configuracao = { ...CONFIGURACAO_PADRAO, tamanhoDaPopulacao: 24 };
    const algoritmo = criarAlgoritmoGenetico(configuracao, 5);
    for (let geracao = 0; geracao < 15; geracao++) {
      evoluirUmaGeracao(algoritmo, configuracao);
      assert.equal(algoritmo.populacao.length, 24);
      assert.ok(algoritmo.populacao.every((individuo) => genesDentroDosLimites(individuo.genes)));
    }
    assert.equal(algoritmo.historico.length, 16);
  });
});
