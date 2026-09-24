export const RAIO_DA_TERRA_EM_KM = 6371;

function converterParaRadianos(graus) {
  return (graus * Math.PI) / 180;
}

export function calcularDistanciaEmKm(pontoA, pontoB) {
  const diferencaDeLatitude = converterParaRadianos(pontoB.latitude - pontoA.latitude);
  const diferencaDeLongitude = converterParaRadianos(pontoB.longitude - pontoA.longitude);
  const termoDeHaversine =
    Math.sin(diferencaDeLatitude / 2) ** 2 +
    Math.cos(converterParaRadianos(pontoA.latitude)) *
      Math.cos(converterParaRadianos(pontoB.latitude)) *
      Math.sin(diferencaDeLongitude / 2) ** 2;
  return 2 * RAIO_DA_TERRA_EM_KM * Math.asin(Math.sqrt(termoDeHaversine));
}

export function criarMatrizDeDistancias(pontos) {
  const quantidade = pontos.length;
  const valores = new Float64Array(quantidade * quantidade);
  for (let origem = 0; origem < quantidade; origem++) {
    for (let destino = origem + 1; destino < quantidade; destino++) {
      const distancia = calcularDistanciaEmKm(pontos[origem], pontos[destino]);
      valores[origem * quantidade + destino] = distancia;
      valores[destino * quantidade + origem] = distancia;
    }
  }
  return { quantidade, valores };
}

export function distanciaEntre(matrizDeDistancias, origem, destino) {
  return matrizDeDistancias.valores[origem * matrizDeDistancias.quantidade + destino];
}

export function comprimentoDaRota(rota, matrizDeDistancias) {
  let comprimentoTotal = 0;
  for (let posicao = 0; posicao < rota.length; posicao++) {
    const proximaPosicao = (posicao + 1) % rota.length;
    comprimentoTotal += distanciaEntre(matrizDeDistancias, rota[posicao], rota[proximaPosicao]);
  }
  return comprimentoTotal;
}
