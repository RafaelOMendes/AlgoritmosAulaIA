import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { encontrarCelulasAlcancaveis, gerarLabirinto } from '../js/logica/labirinto.js';
import { CELULA_LIVRE, CELULA_PAREDE, indiceEspelhado } from '../js/logica/tabuleiro.js';

const TAMANHOS_TESTADOS = [9, 13, 17, 21];
const SEMENTES_TESTADAS = [1, 2, 3, 42, 777, 123456];

describe('Geração do labirinto', () => {
  it('gera sempre o mesmo labirinto para a mesma semente', () => {
    const primeiro = gerarLabirinto(17, 2024);
    const segundo = gerarLabirinto(17, 2024);
    assert.deepEqual(primeiro.celulas, segundo.celulas);
  });

  it('gera labirintos diferentes para sementes diferentes', () => {
    const labirintos = SEMENTES_TESTADAS.map((semente) => gerarLabirinto(17, semente).celulas.join(''));
    assert.equal(new Set(labirintos).size, SEMENTES_TESTADAS.length);
  });

  it('é simétrico em rotação de 180 graus, para ser justo com os dois jogadores', () => {
    for (const tamanho of TAMANHOS_TESTADOS) {
      for (const semente of SEMENTES_TESTADAS) {
        const { celulas, posicoesIniciais } = gerarLabirinto(tamanho, semente);
        celulas.forEach((celula, indice) => {
          assert.equal(celula, celulas[indiceEspelhado(tamanho, indice)]);
        });
        assert.equal(posicoesIniciais.laranja, indiceEspelhado(tamanho, posicoesIniciais.azul));
      }
    }
  });

  it('deixa todas as células livres conectadas e as posições iniciais livres', () => {
    for (const tamanho of TAMANHOS_TESTADOS) {
      for (const semente of SEMENTES_TESTADAS) {
        const { celulas, posicoesIniciais } = gerarLabirinto(tamanho, semente);
        assert.equal(celulas[posicoesIniciais.azul], CELULA_LIVRE);
        assert.equal(celulas[posicoesIniciais.laranja], CELULA_LIVRE);
        const alcancaveis = encontrarCelulasAlcancaveis(tamanho, celulas, posicoesIniciais.azul);
        celulas.forEach((celula, indice) => {
          if (celula === CELULA_LIVRE) {
            assert.equal(alcancaveis[indice], 1, `célula ${indice} isolada (tamanho ${tamanho}, semente ${semente})`);
          }
        });
      }
    }
  });

  it('coloca paredes no labirinto', () => {
    const { celulas } = gerarLabirinto(17, 99);
    const quantidadeDeParedes = celulas.filter((celula) => celula === CELULA_PAREDE).length;
    assert.ok(quantidadeDeParedes > 17 * 17 * 0.1);
  });

  it('recusa labirintos pequenos demais', () => {
    assert.throws(() => gerarLabirinto(5, 1));
  });
});
