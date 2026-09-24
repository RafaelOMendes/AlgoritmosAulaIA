import { CELULA_LIVRE, vizinhosDentroDoTabuleiro } from './tabuleiro.js';

export const CELULA_SEM_DONO = 0;
export const CELULA_DO_AZUL = 1;
export const CELULA_DO_LARANJA = 2;
export const CELULA_DISPUTADA = 3;

export const DISTANCIA_INALCANCAVEL = -1;

export function calcularDistanciasAPartirDe(estado, origem) {
  const distancias = new Int32Array(estado.tamanho * estado.tamanho).fill(DISTANCIA_INALCANCAVEL);
  const fila = [origem];
  distancias[origem] = 0;
  for (let posicaoNaFila = 0; posicaoNaFila < fila.length; posicaoNaFila++) {
    const celulaAtual = fila[posicaoNaFila];
    for (const vizinho of vizinhosDentroDoTabuleiro(estado.tamanho, celulaAtual)) {
      if (distancias[vizinho] === DISTANCIA_INALCANCAVEL && estado.celulas[vizinho] === CELULA_LIVRE) {
        distancias[vizinho] = distancias[celulaAtual] + 1;
        fila.push(vizinho);
      }
    }
  }
  return distancias;
}

function definirDonoDaCelula(distanciaDoAzul, distanciaDoLaranja) {
  const azulAlcanca = distanciaDoAzul !== DISTANCIA_INALCANCAVEL;
  const laranjaAlcanca = distanciaDoLaranja !== DISTANCIA_INALCANCAVEL;
  if (!azulAlcanca && !laranjaAlcanca) {
    return CELULA_SEM_DONO;
  }
  if (azulAlcanca && (!laranjaAlcanca || distanciaDoAzul < distanciaDoLaranja)) {
    return CELULA_DO_AZUL;
  }
  if (laranjaAlcanca && (!azulAlcanca || distanciaDoLaranja < distanciaDoAzul)) {
    return CELULA_DO_LARANJA;
  }
  return CELULA_DISPUTADA;
}

export function calcularTerritorios(estado) {
  const distanciasDoAzul = calcularDistanciasAPartirDe(estado, estado.posicoes.azul);
  const distanciasDoLaranja = calcularDistanciasAPartirDe(estado, estado.posicoes.laranja);
  const donoDeCadaCelula = new Uint8Array(estado.tamanho * estado.tamanho);
  const territorio = { azul: 0, laranja: 0, disputadas: 0 };

  for (let indice = 0; indice < donoDeCadaCelula.length; indice++) {
    if (estado.celulas[indice] !== CELULA_LIVRE) {
      continue;
    }
    const dono = definirDonoDaCelula(distanciasDoAzul[indice], distanciasDoLaranja[indice]);
    donoDeCadaCelula[indice] = dono;
    if (dono === CELULA_DO_AZUL) {
      territorio.azul += 1;
    } else if (dono === CELULA_DO_LARANJA) {
      territorio.laranja += 1;
    } else if (dono === CELULA_DISPUTADA) {
      territorio.disputadas += 1;
    }
  }
  return { ...territorio, donoDeCadaCelula };
}

export function avaliarPosicao(estado, jogadorMaximizador) {
  const territorios = calcularTerritorios(estado);
  const jogadorMinimizador = jogadorMaximizador === 'azul' ? 'laranja' : 'azul';
  return {
    valor: territorios[jogadorMaximizador] - territorios[jogadorMinimizador],
    territorioDoMaximizador: territorios[jogadorMaximizador],
    territorioDoMinimizador: territorios[jogadorMinimizador],
  };
}

export function contarEspacoAlcancavel(estado, origem) {
  const distancias = calcularDistanciasAPartirDe(estado, origem);
  return distancias.reduce(
    (total, distancia) => total + (distancia !== DISTANCIA_INALCANCAVEL && distancia > 0 ? 1 : 0),
    0,
  );
}
