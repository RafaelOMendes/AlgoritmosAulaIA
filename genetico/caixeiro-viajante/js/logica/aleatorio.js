export function criarGeradorAleatorio(semente) {
  let estadoInterno = semente >>> 0;
  return function proximoNumeroAleatorio() {
    estadoInterno = (estadoInterno + 0x6d2b79f5) >>> 0;
    let mistura = estadoInterno;
    mistura = Math.imul(mistura ^ (mistura >>> 15), mistura | 1);
    mistura ^= mistura + Math.imul(mistura ^ (mistura >>> 7), mistura | 61);
    return ((mistura ^ (mistura >>> 14)) >>> 0) / 4294967296;
  };
}

export function sortearInteiro(geradorAleatorio, minimo, maximo) {
  return minimo + Math.floor(geradorAleatorio() * (maximo - minimo + 1));
}

export function embaralhar(lista, geradorAleatorio) {
  const copia = [...lista];
  for (let indice = copia.length - 1; indice > 0; indice--) {
    const outroIndice = sortearInteiro(geradorAleatorio, 0, indice);
    [copia[indice], copia[outroIndice]] = [copia[outroIndice], copia[indice]];
  }
  return copia;
}

export function gerarSementeAleatoria() {
  return Math.floor(Math.random() * 1_000_000);
}
