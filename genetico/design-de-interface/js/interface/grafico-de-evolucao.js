const MARGEM_ESQUERDA = 64;
const MARGEM_DIREITA = 12;
const MARGEM_SUPERIOR = 10;
const MARGEM_INFERIOR = 26;
const QUANTIDADE_DE_LINHAS_DE_GRADE = 4;

function lerCor(nomeDaVariavel) {
  return getComputedStyle(document.documentElement).getPropertyValue(nomeDaVariavel).trim();
}

function ajustarResolucao(canvas) {
  const densidadeDePixels = window.devicePixelRatio || 1;
  const largura = canvas.clientWidth;
  const altura = canvas.clientHeight;
  if (canvas.width !== Math.round(largura * densidadeDePixels) || canvas.height !== Math.round(altura * densidadeDePixels)) {
    canvas.width = Math.round(largura * densidadeDePixels);
    canvas.height = Math.round(altura * densidadeDePixels);
  }
  const contexto = canvas.getContext('2d');
  contexto.setTransform(densidadeDePixels, 0, 0, densidadeDePixels, 0, 0);
  return { contexto, largura, altura };
}

function amostrarHistorico(historico, quantidadeMaximaDePontos) {
  if (historico.length <= quantidadeMaximaDePontos) {
    return historico;
  }
  const passo = historico.length / quantidadeMaximaDePontos;
  const amostra = [];
  for (let posicao = 0; posicao < historico.length; posicao += passo) {
    amostra.push(historico[Math.floor(posicao)]);
  }
  amostra.push(historico.at(-1));
  return amostra;
}

export function desenharGraficoDeEvolucao(canvas, historico, { series, formatarValor }) {
  const { contexto, largura, altura } = ajustarResolucao(canvas);
  if (largura === 0) {
    return;
  }
  contexto.clearRect(0, 0, largura, altura);
  if (historico.length === 0) {
    return;
  }

  const larguraUtil = largura - MARGEM_ESQUERDA - MARGEM_DIREITA;
  const alturaUtil = altura - MARGEM_SUPERIOR - MARGEM_INFERIOR;
  const pontosDoGrafico = amostrarHistorico(historico, Math.max(2, Math.floor(larguraUtil)));
  const todosOsValores = pontosDoGrafico.flatMap((registro) => series.map((serie) => registro[serie.chave]));
  let valorMinimo = Math.min(...todosOsValores);
  let valorMaximo = Math.max(...todosOsValores);
  if (valorMaximo - valorMinimo < 1e-9) {
    valorMaximo += 1;
    valorMinimo -= 1;
  }
  const folga = (valorMaximo - valorMinimo) * 0.06;
  valorMinimo -= folga;
  valorMaximo += folga;

  const primeiraGeracao = historico[0].geracao;
  const ultimaGeracao = Math.max(historico.at(-1).geracao, primeiraGeracao + 1);
  const posicaoX = (geracao) => MARGEM_ESQUERDA + ((geracao - primeiraGeracao) / (ultimaGeracao - primeiraGeracao)) * larguraUtil;
  const posicaoY = (valor) => MARGEM_SUPERIOR + (1 - (valor - valorMinimo) / (valorMaximo - valorMinimo)) * alturaUtil;

  contexto.font = '11px Segoe UI, system-ui, sans-serif';
  contexto.fillStyle = lerCor('--texto-apagado');
  contexto.strokeStyle = lerCor('--borda');
  contexto.lineWidth = 1;
  contexto.textAlign = 'right';
  contexto.textBaseline = 'middle';
  for (let linha = 0; linha <= QUANTIDADE_DE_LINHAS_DE_GRADE; linha++) {
    const valor = valorMinimo + ((valorMaximo - valorMinimo) * linha) / QUANTIDADE_DE_LINHAS_DE_GRADE;
    const y = Math.round(posicaoY(valor)) + 0.5;
    contexto.beginPath();
    contexto.moveTo(MARGEM_ESQUERDA, y);
    contexto.lineTo(largura - MARGEM_DIREITA, y);
    contexto.stroke();
    contexto.fillText(formatarValor(valor), MARGEM_ESQUERDA - 8, y);
  }
  contexto.textBaseline = 'top';
  contexto.textAlign = 'left';
  contexto.fillText(`geração ${primeiraGeracao}`, MARGEM_ESQUERDA, altura - MARGEM_INFERIOR + 8);
  contexto.textAlign = 'right';
  contexto.fillText(`geração ${historico.at(-1).geracao}`, largura - MARGEM_DIREITA, altura - MARGEM_INFERIOR + 8);

  for (const serie of series) {
    contexto.strokeStyle = lerCor(serie.variavelDeCor);
    contexto.lineWidth = serie.espessura ?? 2;
    contexto.lineJoin = 'round';
    contexto.beginPath();
    pontosDoGrafico.forEach((registro, indice) => {
      const x = posicaoX(registro.geracao);
      const y = posicaoY(registro[serie.chave]);
      if (indice === 0) {
        contexto.moveTo(x, y);
      } else {
        contexto.lineTo(x, y);
      }
    });
    contexto.stroke();
  }
}
