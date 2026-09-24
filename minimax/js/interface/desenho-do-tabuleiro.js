import {
  CELULA_DISPUTADA,
  CELULA_DO_AZUL,
  CELULA_DO_LARANJA,
  CELULA_PAREDE,
  CELULA_RASTRO_AZUL,
  CELULA_RASTRO_LARANJA,
  FORA_DO_TABULEIRO,
  JOGADORES,
  colunaDoIndice,
  linhaDoIndice,
} from './tabuleiro.js';

const OPACIDADE_DO_TERRITORIO = 0.16;
const OPACIDADE_DAS_CELULAS_DO_RASTRO = 0.2;
const ESPESSURA_DA_TRILHA = 0.42;

function lerCoresDoTema() {
  const estilo = getComputedStyle(document.documentElement);
  const lerCor = (nomeDaVariavel) => estilo.getPropertyValue(nomeDaVariavel).trim();
  return {
    fundo: lerCor('--tabuleiro-fundo'),
    grade: lerCor('--tabuleiro-grade'),
    parede: lerCor('--tabuleiro-parede'),
    brilhoDaParede: lerCor('--tabuleiro-parede-brilho'),
    colisao: lerCor('--derrota'),
    texto: lerCor('--texto'),
    azul: lerCor('--azul'),
    laranja: lerCor('--laranja'),
  };
}

function ajustarResolucaoDoCanvas(canvas) {
  const densidadeDePixels = window.devicePixelRatio || 1;
  const larguraVisivel = canvas.clientWidth;
  const larguraReal = Math.round(larguraVisivel * densidadeDePixels);
  if (canvas.width !== larguraReal || canvas.height !== larguraReal) {
    canvas.width = larguraReal;
    canvas.height = larguraReal;
  }
  const contexto = canvas.getContext('2d');
  contexto.setTransform(densidadeDePixels, 0, 0, densidadeDePixels, 0, 0);
  return { contexto, larguraVisivel };
}

function criarGeometria(tamanhoDoTabuleiro, larguraVisivel) {
  const tamanhoDaCelula = larguraVisivel / tamanhoDoTabuleiro;
  return {
    tamanhoDaCelula,
    cantoDaCelula(indice) {
      return {
        x: colunaDoIndice(tamanhoDoTabuleiro, indice) * tamanhoDaCelula,
        y: linhaDoIndice(tamanhoDoTabuleiro, indice) * tamanhoDaCelula,
      };
    },
    centroDaCelula(indice) {
      return {
        x: (colunaDoIndice(tamanhoDoTabuleiro, indice) + 0.5) * tamanhoDaCelula,
        y: (linhaDoIndice(tamanhoDoTabuleiro, indice) + 0.5) * tamanhoDaCelula,
      };
    },
  };
}

function desenharTerritorios(contexto, territorios, geometria, cores) {
  const corDoDono = { [CELULA_DO_AZUL]: cores.azul, [CELULA_DO_LARANJA]: cores.laranja };
  territorios.donoDeCadaCelula.forEach((dono, indice) => {
    const canto = geometria.cantoDaCelula(indice);
    if (corDoDono[dono]) {
      contexto.globalAlpha = OPACIDADE_DO_TERRITORIO;
      contexto.fillStyle = corDoDono[dono];
      contexto.fillRect(canto.x, canto.y, geometria.tamanhoDaCelula, geometria.tamanhoDaCelula);
    } else if (dono === CELULA_DISPUTADA) {
      const centro = geometria.centroDaCelula(indice);
      contexto.globalAlpha = 0.45;
      contexto.fillStyle = cores.texto;
      contexto.beginPath();
      contexto.arc(centro.x, centro.y, geometria.tamanhoDaCelula * 0.08, 0, Math.PI * 2);
      contexto.fill();
    }
  });
  contexto.globalAlpha = 1;
}

function desenharGrade(contexto, tamanhoDoTabuleiro, geometria, larguraVisivel, cores) {
  contexto.strokeStyle = cores.grade;
  contexto.lineWidth = 1;
  contexto.beginPath();
  for (let linha = 1; linha < tamanhoDoTabuleiro; linha++) {
    const posicao = Math.round(linha * geometria.tamanhoDaCelula) + 0.5;
    contexto.moveTo(0, posicao);
    contexto.lineTo(larguraVisivel, posicao);
    contexto.moveTo(posicao, 0);
    contexto.lineTo(posicao, larguraVisivel);
  }
  contexto.stroke();
}

function desenharParedes(contexto, estado, geometria, cores) {
  const recuo = Math.max(1, geometria.tamanhoDaCelula * 0.06);
  estado.celulas.forEach((celula, indice) => {
    if (celula !== CELULA_PAREDE) {
      return;
    }
    const canto = geometria.cantoDaCelula(indice);
    const lado = geometria.tamanhoDaCelula - recuo * 2;
    contexto.fillStyle = cores.parede;
    contexto.fillRect(canto.x + recuo, canto.y + recuo, lado, lado);
    contexto.fillStyle = cores.brilhoDaParede;
    contexto.fillRect(canto.x + recuo, canto.y + recuo, lado, Math.max(1, lado * 0.14));
  });
}

function desenharCelulasDoRastro(contexto, estado, geometria, cores) {
  const corDoRastro = { [CELULA_RASTRO_AZUL]: cores.azul, [CELULA_RASTRO_LARANJA]: cores.laranja };
  contexto.globalAlpha = OPACIDADE_DAS_CELULAS_DO_RASTRO;
  estado.celulas.forEach((celula, indice) => {
    const cor = corDoRastro[celula];
    if (!cor) {
      return;
    }
    const canto = geometria.cantoDaCelula(indice);
    contexto.fillStyle = cor;
    contexto.fillRect(canto.x, canto.y, geometria.tamanhoDaCelula, geometria.tamanhoDaCelula);
  });
  contexto.globalAlpha = 1;
}

function desenharTrilha(contexto, trilha, geometria, cor) {
  const centros = trilha.map((indice) => geometria.centroDaCelula(indice));
  if (centros.length < 2) {
    return;
  }
  contexto.save();
  contexto.strokeStyle = cor;
  contexto.lineWidth = geometria.tamanhoDaCelula * ESPESSURA_DA_TRILHA;
  contexto.lineJoin = 'round';
  contexto.lineCap = 'round';
  contexto.shadowColor = cor;
  contexto.shadowBlur = geometria.tamanhoDaCelula * 0.5;
  contexto.beginPath();
  contexto.moveTo(centros[0].x, centros[0].y);
  for (const centro of centros.slice(1)) {
    contexto.lineTo(centro.x, centro.y);
  }
  contexto.stroke();
  contexto.restore();
}

function desenharCabeca(contexto, centro, raio, cor) {
  contexto.save();
  contexto.shadowColor = cor;
  contexto.shadowBlur = raio * 1.6;
  contexto.fillStyle = cor;
  contexto.beginPath();
  contexto.arc(centro.x, centro.y, raio, 0, Math.PI * 2);
  contexto.fill();
  contexto.restore();
  contexto.fillStyle = '#ffffff';
  contexto.beginPath();
  contexto.arc(centro.x, centro.y, raio * 0.4, 0, Math.PI * 2);
  contexto.fill();
}

function desenharColisao(contexto, estado, jogador, geometria, cores) {
  const pontoDeColisao = estado.pontosDeColisao[jogador];
  const centro =
    pontoDeColisao === FORA_DO_TABULEIRO || pontoDeColisao === null
      ? geometria.centroDaCelula(estado.posicoes[jogador])
      : geometria.centroDaCelula(pontoDeColisao);
  const tamanho = geometria.tamanhoDaCelula * 0.34;
  contexto.save();
  contexto.strokeStyle = cores.colisao;
  contexto.shadowColor = cores.colisao;
  contexto.shadowBlur = tamanho;
  contexto.lineWidth = Math.max(2, geometria.tamanhoDaCelula * 0.12);
  contexto.lineCap = 'round';
  contexto.beginPath();
  contexto.moveTo(centro.x - tamanho, centro.y - tamanho);
  contexto.lineTo(centro.x + tamanho, centro.y + tamanho);
  contexto.moveTo(centro.x + tamanho, centro.y - tamanho);
  contexto.lineTo(centro.x - tamanho, centro.y + tamanho);
  contexto.stroke();
  contexto.restore();
}

function desenharMovimentoPendente(contexto, estado, movimentoPendente, geometria, cores) {
  const { jogador, destino } = movimentoPendente;
  const origem = geometria.centroDaCelula(estado.posicoes[jogador]);
  const alvo = destino === FORA_DO_TABULEIRO ? origem : geometria.centroDaCelula(destino);
  contexto.save();
  contexto.strokeStyle = cores[jogador];
  contexto.lineWidth = Math.max(2, geometria.tamanhoDaCelula * 0.12);
  contexto.setLineDash([geometria.tamanhoDaCelula * 0.18, geometria.tamanhoDaCelula * 0.12]);
  contexto.beginPath();
  contexto.moveTo(origem.x, origem.y);
  contexto.lineTo(alvo.x, alvo.y);
  contexto.stroke();
  contexto.setLineDash([]);
  contexto.beginPath();
  contexto.arc(alvo.x, alvo.y, geometria.tamanhoDaCelula * 0.32, 0, Math.PI * 2);
  contexto.stroke();
  contexto.restore();
}

export function desenharTabuleiro(
  canvas,
  estado,
  { territorios = null, mostrarTerritorio = false, movimentoPendente = null } = {},
) {
  const { contexto, larguraVisivel } = ajustarResolucaoDoCanvas(canvas);
  if (larguraVisivel === 0) {
    return;
  }
  const cores = lerCoresDoTema();
  const geometria = criarGeometria(estado.tamanho, larguraVisivel);

  contexto.fillStyle = cores.fundo;
  contexto.fillRect(0, 0, larguraVisivel, larguraVisivel);

  if (mostrarTerritorio && territorios) {
    desenharTerritorios(contexto, territorios, geometria, cores);
  }
  desenharGrade(contexto, estado.tamanho, geometria, larguraVisivel, cores);
  desenharParedes(contexto, estado, geometria, cores);
  desenharCelulasDoRastro(contexto, estado, geometria, cores);

  for (const jogador of JOGADORES) {
    desenharTrilha(contexto, estado.trilhas[jogador], geometria, cores[jogador]);
  }
  for (const jogador of JOGADORES) {
    desenharCabeca(contexto, geometria.centroDaCelula(estado.posicoes[jogador]), geometria.tamanhoDaCelula * 0.36, cores[jogador]);
  }
  if (movimentoPendente) {
    desenharMovimentoPendente(contexto, estado, movimentoPendente, geometria, cores);
  }
  for (const jogador of JOGADORES) {
    if (!estado.vivos[jogador]) {
      desenharColisao(contexto, estado, jogador, geometria, cores);
    }
  }
}
