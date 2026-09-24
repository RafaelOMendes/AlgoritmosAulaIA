import { sortearElemento } from './aleatorio.js';
import { contarEspacoAlcancavel } from './avaliacao.js';
import { movimentosPossiveis } from './jogo.js';
import { buscarMelhorMovimento } from './minimax.js';
import { vizinhoNaDirecao } from './tabuleiro.js';

function decidirComMinimax(estado, jogador, configuracaoDoAgente) {
  const resultadoDaBusca = buscarMelhorMovimento(estado, jogador, {
    profundidadeEmRodadas: configuracaoDoAgente.profundidadeEmRodadas,
    usarPodaAlfaBeta: configuracaoDoAgente.usarPodaAlfaBeta,
  });
  return {
    movimento: resultadoDaBusca.movimento,
    valor: resultadoDaBusca.valor,
    nosVisitados: resultadoDaBusca.nosVisitados,
    ramosPodados: resultadoDaBusca.ramosPodados,
    tempoEmMilissegundos: resultadoDaBusca.tempoEmMilissegundos,
  };
}

function decidirComEstrategiaGulosa(estado, jogador) {
  const movimentos = movimentosPossiveis(estado, jogador);
  const espacoApos = (movimento) => {
    const destino = vizinhoNaDirecao(estado.tamanho, estado.posicoes[jogador], movimento);
    return contarEspacoAlcancavel(estado, destino);
  };
  const movimentoComMaisEspaco = movimentos.reduce((melhor, movimento) =>
    espacoApos(movimento) > espacoApos(melhor) ? movimento : melhor,
  );
  return { movimento: movimentoComMaisEspaco, valor: espacoApos(movimentoComMaisEspaco) };
}

function decidirAleatoriamente(estado, jogador, configuracaoDoAgente, geradorAleatorio) {
  return { movimento: sortearElemento(geradorAleatorio, movimentosPossiveis(estado, jogador)) };
}

export const ESTRATEGIAS = {
  minimax: {
    nome: 'Minimax',
    usaProfundidade: true,
    decidir: decidirComMinimax,
  },
  guloso: {
    nome: 'Guloso (maior espaço imediato)',
    usaProfundidade: false,
    decidir: decidirComEstrategiaGulosa,
  },
  aleatorio: {
    nome: 'Aleatório',
    usaProfundidade: false,
    decidir: decidirAleatoriamente,
  },
};

export function decidirMovimento(estado, jogador, configuracaoDoAgente, geradorAleatorio) {
  const estrategia = ESTRATEGIAS[configuracaoDoAgente.estrategia];
  return {
    estrategia: configuracaoDoAgente.estrategia,
    ...estrategia.decidir(estado, jogador, configuracaoDoAgente, geradorAleatorio),
  };
}
