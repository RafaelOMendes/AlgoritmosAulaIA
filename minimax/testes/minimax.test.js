import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { criarGeradorAleatorio, sortearElemento } from '../js/logica/aleatorio.js';
import { decidirMovimento } from '../js/logica/estrategias.js';
import { aplicarRodada, criarEstadoInicial, jogoTerminou, movimentosPossiveis, vencedorDoJogo } from '../js/logica/jogo.js';
import { gerarLabirinto } from '../js/logica/labirinto.js';
import {
  VALOR_DE_EMPATE,
  VALOR_DE_VITORIA,
  buscarMelhorMovimento,
  obterCaminhoPrincipal,
  valorIndicaDerrota,
  valorIndicaVitoria,
} from '../js/logica/minimax.js';
import { iniciarPartida, jogarProximaRodada, partidaTerminou } from '../js/logica/partida.js';
import { criarEstadoAPartirDoMapa } from './auxiliares.js';

const MAPA_COM_BECO_SEM_SAIDA = [
  '#########',
  '##A.#####',
  '##.######',
  '##......#',
  '##......#',
  '##......#',
  '##......#',
  '##.....L#',
  '#########',
];

const MAPA_COM_LARANJA_ENCURRALADO = [
  '#########',
  '#L.######',
  '#########',
  '#A......#',
  '#.......#',
  '#.......#',
  '#.......#',
  '#.......#',
  '#########',
];

const MAPA_COM_COLISAO_FRONTAL_INEVITAVEL = [
  '#####',
  '#A.L#',
  '#####',
  '#####',
  '#####',
];

function gerarEstadosDeMeioDeJogo() {
  const estados = [];
  for (const semente of [3, 11, 29]) {
    const geradorAleatorio = criarGeradorAleatorio(semente);
    let estado = criarEstadoInicial(gerarLabirinto(13, semente));
    for (let rodada = 0; rodada < 8 && !jogoTerminou(estado); rodada++) {
      estados.push(estado);
      estado = aplicarRodada(
        estado,
        sortearElemento(geradorAleatorio, movimentosPossiveis(estado, 'azul')),
        sortearElemento(geradorAleatorio, movimentosPossiveis(estado, 'laranja')),
      );
    }
  }
  return estados;
}

function contarNos(no, filtro) {
  return (filtro(no) ? 1 : 0) + no.filhos.reduce((total, filho) => total + contarNos(filho, filtro), 0);
}

describe('Minimax', () => {
  it('evita entrar num beco sem saída', () => {
    const estado = criarEstadoAPartirDoMapa(MAPA_COM_BECO_SEM_SAIDA);
    for (const profundidadeEmRodadas of [1, 2, 3]) {
      const busca = buscarMelhorMovimento(estado, 'azul', { profundidadeEmRodadas });
      assert.equal(busca.movimento, 'baixo');
    }
  });

  it('enxerga a derrota causada pelo beco quando olha duas rodadas à frente', () => {
    const estado = criarEstadoAPartirDoMapa(MAPA_COM_BECO_SEM_SAIDA);
    const busca = buscarMelhorMovimento(estado, 'azul', { profundidadeEmRodadas: 2, registrarArvore: true });
    const ramoDoBeco = busca.arvore.filhos.find((filho) => filho.movimento === 'direita');
    assert.ok(valorIndicaDerrota(ramoDoBeco.valor));
  });

  it('reconhece uma vitória garantida só quando ela está dentro da profundidade', () => {
    const estado = criarEstadoAPartirDoMapa(MAPA_COM_LARANJA_ENCURRALADO);
    const buscaRasa = buscarMelhorMovimento(estado, 'azul', { profundidadeEmRodadas: 1 });
    const buscaFunda = buscarMelhorMovimento(estado, 'azul', { profundidadeEmRodadas: 3 });
    assert.ok(!valorIndicaVitoria(buscaRasa.valor));
    assert.equal(buscaFunda.valor, VALOR_DE_VITORIA + 1);
  });

  it('dá valor de empate quando a colisão frontal é inevitável', () => {
    const estado = criarEstadoAPartirDoMapa(MAPA_COM_COLISAO_FRONTAL_INEVITAVEL);
    const busca = buscarMelhorMovimento(estado, 'azul', { profundidadeEmRodadas: 2 });
    assert.equal(busca.valor, VALOR_DE_EMPATE);
  });

  it('com poda alfa-beta encontra o mesmo valor e a mesma jogada que o Minimax puro', () => {
    let nosSemPoda = 0;
    let nosComPoda = 0;
    for (const estado of gerarEstadosDeMeioDeJogo()) {
      for (const jogador of ['azul', 'laranja']) {
        for (const profundidadeEmRodadas of [1, 2, 3]) {
          const semPoda = buscarMelhorMovimento(estado, jogador, { profundidadeEmRodadas, usarPodaAlfaBeta: false });
          const comPoda = buscarMelhorMovimento(estado, jogador, { profundidadeEmRodadas, usarPodaAlfaBeta: true });
          assert.equal(comPoda.valor, semPoda.valor);
          assert.equal(comPoda.movimento, semPoda.movimento);
          assert.equal(semPoda.ramosPodados, 0);
          nosSemPoda += semPoda.nosVisitados;
          nosComPoda += comPoda.nosVisitados;
        }
      }
    }
    assert.ok(nosComPoda < nosSemPoda / 2, `com poda: ${nosComPoda}, sem poda: ${nosSemPoda}`);
  });

  it('registra uma árvore coerente com as estatísticas da busca', () => {
    const estado = criarEstadoInicial(gerarLabirinto(13, 5));
    for (const usarPodaAlfaBeta of [false, true]) {
      const busca = buscarMelhorMovimento(estado, 'azul', {
        profundidadeEmRodadas: 3,
        usarPodaAlfaBeta,
        registrarArvore: true,
      });
      assert.equal(contarNos(busca.arvore, (no) => !no.podado), busca.nosVisitados);
      assert.equal(contarNos(busca.arvore, (no) => no.podado), busca.ramosPodados);

      const caminhoPrincipal = obterCaminhoPrincipal(busca.arvore);
      assert.equal(caminhoPrincipal[1].movimento, busca.movimento);
      assert.equal(caminhoPrincipal.length, 3 * 2 + 1);
      for (const no of caminhoPrincipal) {
        assert.equal(no.valor, busca.valor);
        assert.equal(no.tipoDoValor, 'exato');
      }
    }
  });

  it('não registra árvore quando ela não é pedida', () => {
    const estado = criarEstadoInicial(gerarLabirinto(13, 5));
    assert.equal(buscarMelhorMovimento(estado, 'azul', { profundidadeEmRodadas: 2 }).arvore, null);
  });
});

describe('Estratégias e partida completa', () => {
  it('a estratégia gulosa foge do beco sem saída', () => {
    const estado = criarEstadoAPartirDoMapa(MAPA_COM_BECO_SEM_SAIDA);
    assert.equal(decidirMovimento(estado, 'azul', { estrategia: 'guloso' }).movimento, 'baixo');
  });

  it('o agente aleatório escolhe apenas movimentos seguros', () => {
    const estado = criarEstadoAPartirDoMapa(MAPA_COM_BECO_SEM_SAIDA);
    const geradorAleatorio = criarGeradorAleatorio(1);
    for (let tentativa = 0; tentativa < 20; tentativa++) {
      const { movimento } = decidirMovimento(estado, 'azul', { estrategia: 'aleatorio' }, geradorAleatorio);
      assert.ok(['direita', 'baixo'].includes(movimento));
    }
  });

  it('uma partida completa sempre termina com um resultado válido', () => {
    const configuracaoDosAgentes = {
      azul: { estrategia: 'minimax', profundidadeEmRodadas: 2, usarPodaAlfaBeta: true },
      laranja: { estrategia: 'guloso', profundidadeEmRodadas: 1, usarPodaAlfaBeta: true },
    };
    for (const semente of [1, 2, 3]) {
      const partida = iniciarPartida(13, semente);
      const quantidadeDeCelulas = 13 * 13;
      while (!partidaTerminou(partida)) {
        jogarProximaRodada(partida, configuracaoDosAgentes);
        assert.ok(partida.historico.length <= quantidadeDeCelulas);
      }
      assert.ok(['azul', 'laranja', 'empate'].includes(vencedorDoJogo(partida.estadoAtual)));
      assert.equal(partida.historico.length, partida.estadoAtual.rodada);
    }
  });

  it('o Minimax mais profundo vence o mais raso na maioria dos labirintos', () => {
    const configuracaoDosAgentes = {
      azul: { estrategia: 'minimax', profundidadeEmRodadas: 3, usarPodaAlfaBeta: true },
      laranja: { estrategia: 'minimax', profundidadeEmRodadas: 1, usarPodaAlfaBeta: true },
    };
    const resultados = { azul: 0, laranja: 0, empate: 0 };
    for (let semente = 1; semente <= 12; semente++) {
      const partida = iniciarPartida(13, semente);
      while (!partidaTerminou(partida)) {
        jogarProximaRodada(partida, configuracaoDosAgentes);
      }
      resultados[vencedorDoJogo(partida.estadoAtual)] += 1;
    }
    assert.ok(resultados.azul > resultados.laranja, JSON.stringify(resultados));
  });
});
