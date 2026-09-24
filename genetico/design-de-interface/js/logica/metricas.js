import { calcularRazaoDeContraste, converterHslParaRgb } from './cores.js';

export const LARGURA_DA_TELA = 360;
export const ALTURA_DA_TELA = 640;
export const ALTURA_DA_BARRA_DE_STATUS = 24;
export const TEXTO_DO_TITULO = 'Minha carteira';
export const TEXTO_DO_PARAGRAFO =
  'Acompanhe seus gastos do mês, confira o saldo disponível e confirme o pagamento das contas que vencem nesta semana. Toque em continuar para revisar cada conta antes de pagar.';
export const ITENS_DA_LISTA = [
  ['Saldo disponível', 'R$ 1.250,00'],
  ['Contas a pagar', 'R$ 380,90'],
  ['Economia do mês', 'R$ 214,30'],
];
export const PROPORCAO_MEDIA_DA_LARGURA_DO_CARACTERE = 0.5;

function limitarEntreZeroEUm(valor) {
  return Math.max(0, Math.min(1, valor));
}

export function notaPorFaixaIdeal(valor, zeroInferior, idealMinimo, idealMaximo, zeroSuperior) {
  if (valor >= idealMinimo && valor <= idealMaximo) {
    return 1;
  }
  if (valor < idealMinimo) {
    return limitarEntreZeroEUm((valor - zeroInferior) / (idealMinimo - zeroInferior));
  }
  return limitarEntreZeroEUm((zeroSuperior - valor) / (zeroSuperior - idealMaximo));
}

function notaDeContraste(razao, razaoIdeal) {
  return limitarEntreZeroEUm((razao - 1) / (razaoIdeal - 1));
}

export function extrairCores(genes) {
  return {
    fundo: converterHslParaRgb(genes.matizDoFundo, genes.saturacaoDoFundo, genes.luminosidadeDoFundo),
    texto: converterHslParaRgb(genes.matizDoTexto, genes.saturacaoDoTexto, genes.luminosidadeDoTexto),
    botao: converterHslParaRgb(genes.matizDoBotao, genes.saturacaoDoBotao, genes.luminosidadeDoBotao),
    textoDoBotao: converterHslParaRgb(0, 0, genes.luminosidadeDoTextoDoBotao),
  };
}

export function calcularCaracteresPorLinha(genes) {
  const larguraUtil = LARGURA_DA_TELA - 2 * genes.margemLateral;
  return larguraUtil / (genes.tamanhoDaFonte * PROPORCAO_MEDIA_DA_LARGURA_DO_CARACTERE);
}

export function estimarAlturaDoConteudo(genes) {
  const caracteresPorLinha = Math.max(1, calcularCaracteresPorLinha(genes));
  const alturaDeUmaLinha = genes.tamanhoDaFonte * genes.alturaDaLinha;
  const tamanhoDoTitulo = genes.tamanhoDaFonte * genes.escalaDoTitulo;
  const linhasDoTitulo = Math.ceil(TEXTO_DO_TITULO.length / (caracteresPorLinha / genes.escalaDoTitulo));
  const linhasDoParagrafo = Math.ceil(TEXTO_DO_PARAGRAFO.length / caracteresPorLinha);
  const alturaDoItemDaLista = alturaDeUmaLinha + genes.espacamentoEntreBlocos / 2;

  const blocos = [
    linhasDoTitulo * tamanhoDoTitulo * 1.2,
    linhasDoParagrafo * alturaDeUmaLinha,
    ITENS_DA_LISTA.length * alturaDoItemDaLista,
    genes.alturaDoBotao,
    alturaDeUmaLinha,
  ];
  const espacosEntreBlocos = (blocos.length + 1) * genes.espacamentoEntreBlocos;
  return ALTURA_DA_BARRA_DE_STATUS + espacosEntreBlocos + blocos.reduce((soma, altura) => soma + altura, 0);
}

const formatarDecimal = (valor, casas = 1) => valor.toFixed(casas).replace('.', ',');

function contarMultiplosDeOito(valores) {
  return valores.filter((valor) => valor % 8 === 0).length;
}

export function calcularMetricas(genes) {
  const cores = extrairCores(genes);
  const contrasteDoTexto = calcularRazaoDeContraste(cores.texto, cores.fundo);
  const contrasteDoBotao = calcularRazaoDeContraste(cores.textoDoBotao, cores.botao);
  const destaqueDoBotao = calcularRazaoDeContraste(cores.botao, cores.fundo);
  const caracteresPorLinha = calcularCaracteresPorLinha(genes);
  const alturaDoConteudo = estimarAlturaDoConteudo(genes);
  const ocupacaoDaTela = alturaDoConteudo / ALTURA_DA_TELA;
  const medidasDaGrade = [genes.margemLateral, genes.espacamentoEntreBlocos, genes.alturaDoBotao];
  const medidasNaGrade = contarMultiplosDeOito(medidasDaGrade);
  const notaDaMargem = notaPorFaixaIdeal(genes.margemLateral, 4, 16, 24, 40);
  const notaDoEspacamento = notaPorFaixaIdeal(genes.espacamentoEntreBlocos, 4, 16, 24, 44);

  return [
    {
      chave: 'contrasteDoTexto',
      nome: 'Contraste do texto',
      peso: 18,
      nota: notaDeContraste(contrasteDoTexto, 7),
      valorMedido: `${formatarDecimal(contrasteDoTexto)}:1`,
      ideal: 'pelo menos 7:1 (WCAG AAA)',
    },
    {
      chave: 'contrasteDoBotao',
      nome: 'Contraste do texto do botão',
      peso: 10,
      nota: notaDeContraste(contrasteDoBotao, 7),
      valorMedido: `${formatarDecimal(contrasteDoBotao)}:1`,
      ideal: 'pelo menos 7:1',
    },
    {
      chave: 'destaqueDoBotao',
      nome: 'Destaque do botão no fundo',
      peso: 6,
      nota: notaDeContraste(destaqueDoBotao, 3),
      valorMedido: `${formatarDecimal(destaqueDoBotao)}:1`,
      ideal: 'pelo menos 3:1 (WCAG 1.4.11)',
    },
    {
      chave: 'fundoConfortavel',
      nome: 'Fundo pouco saturado',
      peso: 6,
      nota: notaPorFaixaIdeal(genes.saturacaoDoFundo, -1, 0, 12, 60),
      valorMedido: `${genes.saturacaoDoFundo}%`,
      ideal: 'saturação até 12% (cansa menos a vista)',
    },
    {
      chave: 'tamanhoDaFonte',
      nome: 'Tamanho da fonte',
      peso: 12,
      nota: notaPorFaixaIdeal(genes.tamanhoDaFonte, 13, 16, 18, 22),
      valorMedido: `${genes.tamanhoDaFonte} px`,
      ideal: 'entre 16 e 18 px',
    },
    {
      chave: 'hierarquiaDoTitulo',
      nome: 'Hierarquia do título',
      peso: 5,
      nota: notaPorFaixaIdeal(genes.escalaDoTitulo, 1.2, 1.75, 2, 2.8),
      valorMedido: `${formatarDecimal(genes.escalaDoTitulo, 2)}× o texto`,
      ideal: 'entre 1,75× e 2× o texto',
    },
    {
      chave: 'alturaDaLinha',
      nome: 'Altura da linha',
      peso: 8,
      nota: notaPorFaixaIdeal(genes.alturaDaLinha, 1.15, 1.45, 1.55, 1.9),
      valorMedido: `${formatarDecimal(genes.alturaDaLinha, 2)}×`,
      ideal: 'entre 1,45× e 1,55× (WCAG 1.4.12)',
    },
    {
      chave: 'areaDeToque',
      nome: 'Área de toque do botão',
      peso: 8,
      nota: notaPorFaixaIdeal(genes.alturaDoBotao, 32, 48, 56, 72),
      valorMedido: `${genes.alturaDoBotao} px`,
      ideal: 'entre 48 e 56 px (Material e Apple)',
    },
    {
      chave: 'gradeDeOito',
      nome: 'Grade de 8 px',
      peso: 7,
      nota: medidasNaGrade / medidasDaGrade.length,
      valorMedido: `${medidasNaGrade} de ${medidasDaGrade.length} medidas`,
      ideal: 'margem, espaço e botão múltiplos de 8',
    },
    {
      chave: 'espacamento',
      nome: 'Margens e espaçamento',
      peso: 6,
      nota: (notaDaMargem + notaDoEspacamento) / 2,
      valorMedido: `${genes.margemLateral} px / ${genes.espacamentoEntreBlocos} px`,
      ideal: 'margem 16–24 px, espaço 16–24 px',
    },
    {
      chave: 'comprimentoDaLinha',
      nome: 'Caracteres por linha',
      peso: 5,
      nota: notaPorFaixaIdeal(caracteresPorLinha, 20, 38, 50, 70),
      valorMedido: `${Math.round(caracteresPorLinha)}`,
      ideal: 'entre 38 e 50',
    },
    {
      chave: 'ocupacaoDaTela',
      nome: 'Ocupação da tela',
      peso: 9,
      nota: notaPorFaixaIdeal(ocupacaoDaTela, 0.45, 0.8, 0.95, 1.3),
      valorMedido: `${Math.round(ocupacaoDaTela * 100)}% (${Math.round(alturaDoConteudo)} px)`,
      ideal: 'entre 80% e 95% da tela, sem transbordar',
    },
  ];
}

export function calcularAptidao(genes) {
  const metricas = calcularMetricas(genes);
  const aptidao = metricas.reduce((soma, metrica) => soma + metrica.peso * metrica.nota, 0);
  return { aptidao, metricas };
}
