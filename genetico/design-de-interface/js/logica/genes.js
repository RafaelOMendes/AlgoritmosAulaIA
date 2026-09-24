export const DEFINICAO_DOS_GENES = [
  { nome: 'matizDoFundo', rotulo: 'Matiz do fundo', minimo: 0, maximo: 360, casasDecimais: 0, unidade: '°', circular: true },
  { nome: 'saturacaoDoFundo', rotulo: 'Saturação do fundo', minimo: 0, maximo: 100, casasDecimais: 0, unidade: '%' },
  { nome: 'luminosidadeDoFundo', rotulo: 'Luminosidade do fundo', minimo: 0, maximo: 100, casasDecimais: 0, unidade: '%' },
  { nome: 'matizDoTexto', rotulo: 'Matiz do texto', minimo: 0, maximo: 360, casasDecimais: 0, unidade: '°', circular: true },
  { nome: 'saturacaoDoTexto', rotulo: 'Saturação do texto', minimo: 0, maximo: 100, casasDecimais: 0, unidade: '%' },
  { nome: 'luminosidadeDoTexto', rotulo: 'Luminosidade do texto', minimo: 0, maximo: 100, casasDecimais: 0, unidade: '%' },
  { nome: 'matizDoBotao', rotulo: 'Matiz do botão', minimo: 0, maximo: 360, casasDecimais: 0, unidade: '°', circular: true },
  { nome: 'saturacaoDoBotao', rotulo: 'Saturação do botão', minimo: 0, maximo: 100, casasDecimais: 0, unidade: '%' },
  { nome: 'luminosidadeDoBotao', rotulo: 'Luminosidade do botão', minimo: 0, maximo: 100, casasDecimais: 0, unidade: '%' },
  { nome: 'luminosidadeDoTextoDoBotao', rotulo: 'Luminosidade do texto do botão', minimo: 0, maximo: 100, casasDecimais: 0, unidade: '%' },
  { nome: 'tamanhoDaFonte', rotulo: 'Tamanho da fonte', minimo: 10, maximo: 28, casasDecimais: 0, unidade: 'px' },
  { nome: 'escalaDoTitulo', rotulo: 'Escala do título', minimo: 1, maximo: 3.2, casasDecimais: 2, unidade: '×' },
  { nome: 'alturaDaLinha', rotulo: 'Altura da linha', minimo: 1, maximo: 2.2, casasDecimais: 2, unidade: '×' },
  { nome: 'alturaDoBotao', rotulo: 'Altura do botão', minimo: 24, maximo: 90, casasDecimais: 0, unidade: 'px' },
  { nome: 'margemLateral', rotulo: 'Margem lateral', minimo: 0, maximo: 48, casasDecimais: 0, unidade: 'px' },
  { nome: 'espacamentoEntreBlocos', rotulo: 'Espaçamento entre blocos', minimo: 0, maximo: 56, casasDecimais: 0, unidade: 'px' },
  { nome: 'raioDaBorda', rotulo: 'Arredondamento', minimo: 0, maximo: 28, casasDecimais: 0, unidade: 'px' },
];

export const GENE_POR_NOME = Object.fromEntries(DEFINICAO_DOS_GENES.map((gene) => [gene.nome, gene]));

export function arredondarGene(gene, valor) {
  const fator = 10 ** gene.casasDecimais;
  return Math.round(valor * fator) / fator;
}

export function ajustarAoIntervalo(gene, valor) {
  if (gene.circular) {
    const amplitude = gene.maximo - gene.minimo;
    return arredondarGene(gene, gene.minimo + ((((valor - gene.minimo) % amplitude) + amplitude) % amplitude));
  }
  return arredondarGene(gene, Math.min(gene.maximo, Math.max(gene.minimo, valor)));
}

export function formatarGene(gene, valor) {
  return `${valor.toFixed(gene.casasDecimais).replace('.', ',')}${gene.unidade}`;
}
