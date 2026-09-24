import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { calcularTerritorios, avaliarPosicao } from '../js/logica/avaliacao.js';
import {
  aplicarRodada,
  descreverCausaDaColisao,
  listarTrilha,
  movimentosSeguros,
  vencedorDoJogo,
} from '../js/logica/jogo.js';
import { criarEstadoAPartirDoMapa } from './auxiliares.js';

describe('Regras do jogo', () => {
  it('só considera seguros os movimentos para células livres dentro do tabuleiro', () => {
    const estado = criarEstadoAPartirDoMapa([
      'A.#..',
      'a....',
      '.....',
      '.....',
      '....L',
    ]);
    assert.deepEqual(movimentosSeguros(estado, 'azul'), ['direita']);
    assert.deepEqual(movimentosSeguros(estado, 'laranja').sort(), ['cima', 'esquerda']);
  });

  it('elimina os dois jogadores numa colisão frontal e declara empate', () => {
    const estado = criarEstadoAPartirDoMapa([
      '#####',
      '#A.L#',
      '#####',
      '#####',
      '#####',
    ]);
    const depois = aplicarRodada(estado, 'direita', 'esquerda');
    assert.equal(vencedorDoJogo(depois), 'empate');
    assert.equal(descreverCausaDaColisao(estado, depois, 'azul'), 'colisão frontal com o oponente');
  });

  it('identifica a causa de cada batida', () => {
    const estado = criarEstadoAPartirDoMapa([
      'A#...',
      '.....',
      '.....',
      'l....',
      'L....',
    ]);
    const bateuNaParede = aplicarRodada(estado, 'direita', 'direita');
    assert.equal(vencedorDoJogo(bateuNaParede), 'laranja');
    assert.equal(descreverCausaDaColisao(estado, bateuNaParede, 'azul'), 'bateu em uma parede');

    const saiuDoTabuleiro = aplicarRodada(estado, 'cima', 'direita');
    assert.equal(descreverCausaDaColisao(estado, saiuDoTabuleiro, 'azul'), 'saiu do tabuleiro');

    const bateuNoProprioRastro = aplicarRodada(estado, 'baixo', 'cima');
    assert.equal(descreverCausaDaColisao(estado, bateuNoProprioRastro, 'laranja'), 'bateu no próprio rastro');
  });

  it('não altera o estado anterior ao aplicar uma rodada', () => {
    const estado = criarEstadoAPartirDoMapa([
      'A....',
      '.....',
      '.....',
      '.....',
      '....L',
    ]);
    const celulasAntes = Uint8Array.from(estado.celulas);
    const depois = aplicarRodada(estado, 'direita', 'esquerda');
    assert.deepEqual(estado.celulas, celulasAntes);
    assert.notEqual(depois.posicoes.azul, estado.posicoes.azul);
    assert.equal(depois.rodada, 1);
  });

  it('guarda a trilha de cada jogador na ordem em que foi percorrida', () => {
    let estado = criarEstadoAPartirDoMapa([
      'A....',
      '.....',
      '.....',
      '.....',
      '....L',
    ]);
    estado = aplicarRodada(estado, 'direita', 'cima');
    estado = aplicarRodada(estado, 'baixo', 'cima');
    assert.deepEqual(listarTrilha(estado, 'azul'), [0, 1, 6]);
    assert.deepEqual(listarTrilha(estado, 'laranja'), [24, 19, 14]);
  });
});

describe('Função de avaliação (território)', () => {
  it('dá cada célula a quem chega primeiro e marca empates como disputados', () => {
    const estado = criarEstadoAPartirDoMapa([
      'A...L',
      '#####',
      '#####',
      '#####',
      '#####',
    ]);
    const territorios = calcularTerritorios(estado);
    assert.equal(territorios.azul, 1);
    assert.equal(territorios.laranja, 1);
    assert.equal(territorios.disputadas, 1);
  });

  it('conta o espaço isolado de cada jogador e muda de sinal conforme o ponto de vista', () => {
    const estado = criarEstadoAPartirDoMapa([
      'A..#L',
      '...#.',
      '...#.',
      '#####',
      '#####',
    ]);
    assert.equal(avaliarPosicao(estado, 'azul').valor, 8 - 2);
    assert.equal(avaliarPosicao(estado, 'laranja').valor, 2 - 8);
  });
});
