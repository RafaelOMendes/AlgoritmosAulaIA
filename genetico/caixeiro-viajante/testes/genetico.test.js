import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { criarGeradorAleatorio } from '../js/logica/aleatorio.js';
import { listarCapitais, sortearCidades, CIDADES_DO_BRASIL } from '../js/logica/cidades.js';
import { calcularDistanciaEmKm, comprimentoDaRota, criarMatrizDeDistancias } from '../js/logica/distancias.js';
import {
  CONFIGURACAO_PADRAO,
  algoritmoConvergiu,
  criarAlgoritmoGenetico,
  cruzarComOrderCrossover,
  evoluirUmaGeracao,
  mutarPorInversao,
  selecionarPorTorneio,
} from '../js/logica/genetico.js';

function ehPermutacaoValida(rota, quantidade) {
  return rota.length === quantidade && new Set(rota).size === quantidade && rota.every((ponto) => ponto >= 0 && ponto < quantidade);
}

describe('Distâncias', () => {
  it('calcula a distância real em linha reta entre São Paulo e Rio de Janeiro', () => {
    const saoPaulo = { latitude: -23.5505, longitude: -46.6333 };
    const rioDeJaneiro = { latitude: -22.9068, longitude: -43.1729 };
    const distancia = calcularDistanciaEmKm(saoPaulo, rioDeJaneiro);
    assert.ok(distancia > 350 && distancia < 365, `distância calculada: ${distancia}`);
  });

  it('mede a rota fechada, incluindo a volta ao ponto de partida', () => {
    const pontos = [
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: 1 },
      { latitude: 1, longitude: 1 },
      { latitude: 1, longitude: 0 },
    ];
    const matriz = criarMatrizDeDistancias(pontos);
    const quadrado = comprimentoDaRota([0, 1, 2, 3], matriz);
    const cruzada = comprimentoDaRota([0, 2, 1, 3], matriz);
    assert.ok(quadrado < cruzada);
    assert.ok(Math.abs(quadrado - 4 * calcularDistanciaEmKm(pontos[0], pontos[1])) < 1);
  });
});

describe('Cidades', () => {
  it('tem as 27 capitais e sorteia cidades sem repetir', () => {
    assert.equal(listarCapitais().length, 27);
    const sorteadas = sortearCidades(30, criarGeradorAleatorio(5));
    assert.equal(new Set(sorteadas.map((cidade) => cidade.nome)).size, 30);
    assert.ok(sorteadas.every((cidade) => CIDADES_DO_BRASIL.some((original) => original.nome === cidade.nome)));
  });
});

describe('Operadores genéticos', () => {
  it('o cruzamento OX sempre gera uma rota válida e preserva o trecho do pai A', () => {
    const geradorAleatorio = criarGeradorAleatorio(7);
    const paiA = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    const paiB = [9, 3, 7, 1, 8, 0, 2, 6, 4, 5];
    for (let tentativa = 0; tentativa < 200; tentativa++) {
      const { rota, inicioDoTrecho, fimDoTrecho } = cruzarComOrderCrossover(paiA, paiB, geradorAleatorio);
      assert.ok(ehPermutacaoValida(rota, 10));
      for (let posicao = inicioDoTrecho; posicao <= fimDoTrecho; posicao++) {
        assert.equal(rota[posicao], paiA[posicao]);
      }
    }
  });

  it('a mutação por inversão mantém uma rota válida e inverte só o trecho sorteado', () => {
    const geradorAleatorio = criarGeradorAleatorio(3);
    const rotaOriginal = [0, 1, 2, 3, 4, 5, 6, 7];
    for (let tentativa = 0; tentativa < 100; tentativa++) {
      const { rota, inicioDoTrecho, fimDoTrecho } = mutarPorInversao(rotaOriginal, geradorAleatorio);
      assert.ok(ehPermutacaoValida(rota, 8));
      assert.deepEqual(rota.slice(inicioDoTrecho, fimDoTrecho + 1), rotaOriginal.slice(inicioDoTrecho, fimDoTrecho + 1).reverse());
    }
  });

  it('o torneio escolhe o participante com a menor distância', () => {
    const populacao = [{ distancia: 50 }, { distancia: 10 }, { distancia: 30 }];
    const { participantes, vencedor } = selecionarPorTorneio(populacao, 5, criarGeradorAleatorio(1));
    assert.equal(vencedor.distancia, Math.min(...participantes.map((participante) => participante.distancia)));
  });
});

describe('Algoritmo genético', () => {
  it('nunca piora a melhor rota graças ao elitismo e melhora bastante em relação ao início', () => {
    const algoritmo = criarAlgoritmoGenetico(listarCapitais(), CONFIGURACAO_PADRAO, 11);
    const melhorInicial = algoritmo.populacao[0].distancia;
    let melhorAnterior = melhorInicial;
    for (let geracao = 0; geracao < 300; geracao++) {
      evoluirUmaGeracao(algoritmo, CONFIGURACAO_PADRAO);
      assert.ok(algoritmo.populacao[0].distancia <= melhorAnterior + 1e-9);
      melhorAnterior = algoritmo.populacao[0].distancia;
      assert.ok(ehPermutacaoValida(algoritmo.populacao[0].rota, 27));
    }
    assert.ok(melhorAnterior < melhorInicial * 0.5, `início ${melhorInicial}, fim ${melhorAnterior}`);
  });

  it('mantém o tamanho da população e registra o histórico de cada geração', () => {
    const configuracao = { ...CONFIGURACAO_PADRAO, tamanhoDaPopulacao: 40 };
    const algoritmo = criarAlgoritmoGenetico(listarCapitais(), configuracao, 2);
    for (let geracao = 0; geracao < 10; geracao++) {
      evoluirUmaGeracao(algoritmo, configuracao);
      assert.equal(algoritmo.populacao.length, 40);
    }
    assert.equal(algoritmo.historico.length, 11);
    assert.ok(algoritmo.historico.every((registro) => registro.melhor <= registro.media && registro.media <= registro.pior));
  });

  it('para quando passa muitas gerações sem melhorar', () => {
    const configuracao = { ...CONFIGURACAO_PADRAO, geracoesSemMelhoraParaParar: 50 };
    const algoritmo = criarAlgoritmoGenetico(sortearCidades(8, criarGeradorAleatorio(4)), configuracao, 4);
    while (!algoritmoConvergiu(algoritmo, configuracao) && algoritmo.geracao < 5000) {
      evoluirUmaGeracao(algoritmo, configuracao);
    }
    assert.ok(algoritmoConvergiu(algoritmo, configuracao));
  });

  it('exige pelo menos 4 pontos', () => {
    assert.throws(() => criarAlgoritmoGenetico(listarCapitais().slice(0, 3), CONFIGURACAO_PADRAO, 1));
  });
});
