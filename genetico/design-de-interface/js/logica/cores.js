export function converterHslParaRgb(matiz, saturacao, luminosidade) {
  const saturacaoNormalizada = saturacao / 100;
  const luminosidadeNormalizada = luminosidade / 100;
  const croma = (1 - Math.abs(2 * luminosidadeNormalizada - 1)) * saturacaoNormalizada;
  const matizEmSetores = (((matiz % 360) + 360) % 360) / 60;
  const componenteIntermediaria = croma * (1 - Math.abs((matizEmSetores % 2) - 1));
  const setores = [
    [croma, componenteIntermediaria, 0],
    [componenteIntermediaria, croma, 0],
    [0, croma, componenteIntermediaria],
    [0, componenteIntermediaria, croma],
    [componenteIntermediaria, 0, croma],
    [croma, 0, componenteIntermediaria],
  ];
  const [vermelho, verde, azul] = setores[Math.min(5, Math.floor(matizEmSetores))];
  const ajuste = luminosidadeNormalizada - croma / 2;
  return [vermelho + ajuste, verde + ajuste, azul + ajuste].map((componente) => Math.round(componente * 255));
}

function linearizarComponente(componente) {
  const normalizado = componente / 255;
  return normalizado <= 0.03928 ? normalizado / 12.92 : ((normalizado + 0.055) / 1.055) ** 2.4;
}

export function calcularLuminanciaRelativa([vermelho, verde, azul]) {
  return (
    0.2126 * linearizarComponente(vermelho) +
    0.7152 * linearizarComponente(verde) +
    0.0722 * linearizarComponente(azul)
  );
}

export function calcularRazaoDeContraste(corA, corB) {
  const luminanciaA = calcularLuminanciaRelativa(corA);
  const luminanciaB = calcularLuminanciaRelativa(corB);
  const maisClara = Math.max(luminanciaA, luminanciaB);
  const maisEscura = Math.min(luminanciaA, luminanciaB);
  return (maisClara + 0.05) / (maisEscura + 0.05);
}

export function descreverCorCss(matiz, saturacao, luminosidade, opacidade = 1) {
  return `hsl(${Math.round(matiz)} ${Math.round(saturacao)}% ${Math.round(luminosidade)}% / ${opacidade})`;
}
