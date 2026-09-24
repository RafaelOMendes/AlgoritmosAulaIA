import { criarGeradorAleatorio } from './aleatorio.js';
import { decidirMovimento } from './estrategias.js';
import { aplicarRodada, criarEstadoInicial, jogoTerminou } from './jogo.js';
import { gerarLabirinto } from './labirinto.js';
import { buscarMelhorMovimento } from './minimax.js';

export function iniciarPartida(tamanho, semente) {
  const labirinto = gerarLabirinto(tamanho, semente);
  return {
    labirinto,
    estadoAtual: criarEstadoInicial(labirinto),
    historico: [],
    geradorAleatorioDosAgentes: criarGeradorAleatorio(semente + 1),
  };
}

export function reiniciarPartidaNoMesmoLabirinto(partida) {
  return {
    labirinto: partida.labirinto,
    estadoAtual: criarEstadoInicial(partida.labirinto),
    historico: [],
    geradorAleatorioDosAgentes: criarGeradorAleatorio(partida.labirinto.semente + 1),
  };
}

export function partidaTerminou(partida) {
  return jogoTerminou(partida.estadoAtual);
}

export function jogarProximaRodada(partida, configuracaoDosAgentes) {
  const estadoAntes = partida.estadoAtual;
  const decisaoDoAzul = decidirMovimento(
    estadoAntes,
    'azul',
    configuracaoDosAgentes.azul,
    partida.geradorAleatorioDosAgentes,
  );
  const decisaoDoLaranja = decidirMovimento(
    estadoAntes,
    'laranja',
    configuracaoDosAgentes.laranja,
    partida.geradorAleatorioDosAgentes,
  );
  const estadoDepois = aplicarRodada(estadoAntes, decisaoDoAzul.movimento, decisaoDoLaranja.movimento);

  const registroDaRodada = {
    numeroDaRodada: estadoDepois.rodada,
    estadoAntes,
    estadoDepois,
    decisoes: { azul: decisaoDoAzul, laranja: decisaoDoLaranja },
    configuracaoDosAgentes: structuredClone(configuracaoDosAgentes),
  };
  partida.historico.push(registroDaRodada);
  partida.estadoAtual = estadoDepois;
  return registroDaRodada;
}

export function reconstruirArvoreDeDecisao(estado, jogador, configuracaoDoAgente) {
  return buscarMelhorMovimento(estado, jogador, {
    profundidadeEmRodadas: configuracaoDoAgente.profundidadeEmRodadas,
    usarPodaAlfaBeta: configuracaoDoAgente.usarPodaAlfaBeta,
    registrarArvore: true,
  });
}
