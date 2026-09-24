import { chamarApi } from './api.js';
import { desenharTabuleiro } from './desenho-do-tabuleiro.js';
import {
  classeDoValorMinimax,
  descreverMovimento,
  descreverProfundidade,
  formatarAlfa,
  formatarBeta,
  formatarComSinal,
  formatarMilissegundos,
  formatarNumero,
  formatarValorMinimax,
  obterConstantesDoJogo,
  setaDoMovimento,
} from './formatacao.js';
import { NOME_DE_EXIBICAO, oponenteDe } from './tabuleiro.js';

const NO_MAX = 'MAX';
const NO_MIN = 'MIN';
const LIMITE_SUPERIOR = 'limiteSuperior';
const LIMITE_INFERIOR = 'limiteInferior';
const DESFECHO_VITORIA = 'vitoria';
const DESFECHO_DERROTA = 'derrota';
const DESFECHO_EMPATE = 'empate';

const NAMESPACE_SVG = 'http://www.w3.org/2000/svg';
const LARGURA_DO_NO = 88;
const ALTURA_DO_NO = 48;
const LARGURA_DA_COLUNA = 100;
const ALTURA_DO_NIVEL = 100;
const MARGEM_DA_ARVORE = 30;
const LIMITE_DE_NOS_VISIVEIS = 800;
const NIVEIS_DE_ZOOM = [0.4, 0.55, 0.7, 0.85, 1, 1.2, 1.45];
const INDICE_DO_ZOOM_PADRAO = 4;

const TEXTO_DO_DESFECHO = {
  [DESFECHO_VITORIA]: 'vitória',
  [DESFECHO_DERROTA]: 'derrota',
  [DESFECHO_EMPATE]: 'empate',
};

function criarElementoSvg(nomeDaTag, atributos = {}, texto = null) {
  const elemento = document.createElementNS(NAMESPACE_SVG, nomeDaTag);
  for (const [nome, valor] of Object.entries(atributos)) {
    elemento.setAttribute(nome, valor);
  }
  if (texto !== null) {
    elemento.textContent = texto;
  }
  return elemento;
}

function noEhFolha(no) {
  return !no.podado && no.filhos.length === 0;
}

function calcularLayout(raiz, nosExpandidos) {
  const nosPosicionados = [];
  const posicaoPorNo = new Map();
  let proximaColunaLivre = 0;
  let profundidadeMaxima = 0;

  function posicionar(no, profundidade) {
    profundidadeMaxima = Math.max(profundidadeMaxima, profundidade);
    const filhosVisiveis = nosExpandidos.has(no) ? no.filhos : [];
    const filhosPosicionados = filhosVisiveis.map((filho) => posicionar(filho, profundidade + 1));
    const coluna =
      filhosPosicionados.length === 0
        ? proximaColunaLivre++
        : (filhosPosicionados[0].coluna + filhosPosicionados.at(-1).coluna) / 2;
    const posicionado = { no, coluna, profundidade, filhos: filhosPosicionados };
    nosPosicionados.push(posicionado);
    posicaoPorNo.set(no, posicionado);
    return posicionado;
  }

  posicionar(raiz, 0);
  return { nosPosicionados, posicaoPorNo, quantidadeDeColunas: proximaColunaLivre, profundidadeMaxima };
}

function centroDoNo(posicionado) {
  return {
    x: MARGEM_DA_ARVORE + posicionado.coluna * LARGURA_DA_COLUNA + LARGURA_DO_NO / 2,
    y: MARGEM_DA_ARVORE + posicionado.profundidade * ALTURA_DO_NIVEL + ALTURA_DO_NO / 2,
  };
}

function contarNosVisiveis(no, nosExpandidos) {
  if (!nosExpandidos.has(no)) {
    return 1;
  }
  return 1 + no.filhos.reduce((total, filho) => total + contarNosVisiveis(filho, nosExpandidos), 0);
}

function listarNosVisiveis(no, nosExpandidos, lista = []) {
  lista.push(no);
  if (nosExpandidos.has(no)) {
    for (const filho of no.filhos) {
      listarNosVisiveis(filho, nosExpandidos, lista);
    }
  }
  return lista;
}

function prepararArvore(no, caminhoAteAqui = []) {
  no.caminho = caminhoAteAqui;
  for (const filho of no.filhos) {
    prepararArvore(filho, [...caminhoAteAqui, { jogador: filho.jogadorQueMoveu, movimento: filho.movimento }]);
  }
  return no;
}

function obterCaminhoPrincipal(raiz) {
  const caminho = [raiz];
  let noAtual = raiz;
  while (noAtual.indiceDoMelhorFilho >= 0) {
    noAtual = noAtual.filhos[noAtual.indiceDoMelhorFilho];
    caminho.push(noAtual);
  }
  return caminho;
}

function textoDoRotulo(no) {
  if (!no.jogadorQueMoveu) {
    return 'Início';
  }
  return `${NOME_DE_EXIBICAO[no.jogadorQueMoveu]} ${setaDoMovimento(no.movimento)}`;
}

function textoDoValor(no) {
  if (no.podado) {
    return '✂ podado';
  }
  if (no.desfecho) {
    return TEXTO_DO_DESFECHO[no.desfecho];
  }
  const valorFormatado = formatarValorMinimax(no.valor);
  if (no.tipoDoValor === LIMITE_SUPERIOR) {
    return `≤ ${valorFormatado}`;
  }
  if (no.tipoDoValor === LIMITE_INFERIOR) {
    return `≥ ${valorFormatado}`;
  }
  return valorFormatado;
}

function textoDoTipo(no) {
  if (no.podado) {
    return '';
  }
  if (no.desfecho) {
    return 'FIM';
  }
  if (noEhFolha(no)) {
    return 'FOLHA';
  }
  return no.tipo;
}

function descreverCaminho(no) {
  if (no.caminho.length === 0) {
    return '<p>Posição atual do jogo, antes de qualquer simulação.</p>';
  }
  const passos = no.caminho
    .map((passo, indice) => {
      const numeroDaRodadaSimulada = Math.floor(indice / 2) + 1;
      const classe = passo.jogador === 'azul' ? 'jogada-azul' : 'jogada-laranja';
      return `<li><span class="${classe}">R+${numeroDaRodadaSimulada} ${NOME_DE_EXIBICAO[passo.jogador]} ${setaDoMovimento(passo.movimento)}</span></li>`;
    })
    .join('');
  return `<ol class="caminho-do-no">${passos}</ol>`;
}

function descreverTituloDoNo(no, nomeDoMaximizador, nomeDoMinimizador) {
  if (no.caminho.length === 0) {
    return `Raiz: vez do ${nomeDoMaximizador} (MAX)`;
  }
  if (no.podado) {
    return 'Ramo podado';
  }
  if (no.desfecho) {
    return 'Fim de jogo';
  }
  if (noEhFolha(no)) {
    return 'Folha: limite de profundidade';
  }
  if (no.tipo === NO_MAX) {
    return `Nó MAX: vez do ${nomeDoMaximizador}`;
  }
  return `Nó MIN: vez do ${nomeDoMinimizador}`;
}

function descreverDesfecho(no, nomeDoMaximizador, nomeDoMinimizador) {
  const { valorDeVitoria, valorDeEmpate } = obterConstantesDoJogo();
  if (no.desfecho === DESFECHO_EMPATE) {
    return `<p>Os dois bateram na mesma rodada: <strong>empate</strong>.</p>
      <p>Valor = <strong>${formatarComSinal(valorDeEmpate)}</strong>: melhor que perder, mas pior que qualquer posição em que o jogo continua. Assim o agente só aceita empatar para fugir de uma derrota.</p>`;
  }
  const rodadasQueSobraram = Math.abs(no.valor) - valorDeVitoria;
  if (no.desfecho === DESFECHO_VITORIA) {
    return `<p>O ${nomeDoMinimizador} bateu e o ${nomeDoMaximizador} sobreviveu: <strong>vitória</strong>.</p>
      <p>Valor = ${formatarNumero(valorDeVitoria)} + ${rodadasQueSobraram} rodada(s) que sobraram na busca = <strong>${formatarNumero(no.valor)}</strong>. Vencer mais cedo vale mais.</p>`;
  }
  return `<p>O ${nomeDoMaximizador} bateu e o ${nomeDoMinimizador} sobreviveu: <strong>derrota</strong>.</p>
    <p>Valor = −(${formatarNumero(valorDeVitoria)} + ${rodadasQueSobraram}) = <strong>${formatarComSinal(no.valor)}</strong>. Se não tiver como escapar, perder mais tarde é menos ruim.</p>`;
}

function descreverFolhaHeuristica(no, nomeDoMaximizador, nomeDoMinimizador) {
  const { territorioDoMaximizador, territorioDoMinimizador, valor } = no.avaliacao;
  return `<p>A busca chegou ao limite de profundidade, então a posição é avaliada pela <strong>heurística de território</strong>: cada célula livre pertence a quem consegue chegar nela primeiro (as células sombreadas no tabuleiro acima).</p>
    <p><strong>${nomeDoMaximizador}: ${territorioDoMaximizador} células − ${nomeDoMinimizador}: ${territorioDoMinimizador} células = ${formatarComSinal(valor)}</strong></p>`;
}

function descreverEscolhaDoNo(no, nomeDoMaximizador, nomeDoMinimizador) {
  const melhorFilho = no.filhos[no.indiceDoMelhorFilho];
  const avaliados = no.filhos.filter((filho) => !filho.podado).length;
  const podados = no.filhos.length - avaliados;
  const resumoDosFilhos = `<p>Filhos: ${avaliados} avaliado(s)${podados > 0 ? `, <strong>${podados} podado(s)</strong>` : ''}.</p>`;
  const escolha = melhorFilho
    ? `${descreverMovimento(melhorFilho.movimento)} (${textoDoValor(melhorFilho)})`
    : '-';
  if (no.tipo === NO_MAX) {
    return `<p>O ${nomeDoMaximizador} escolhe o filho de <strong>maior</strong> valor. Melhor opção: <strong>${escolha}</strong>.</p>${resumoDosFilhos}`;
  }
  return `<p>O ${nomeDoMinimizador} é o adversário: escolhe o filho de <strong>menor</strong> valor, a resposta que mais atrapalha o ${nomeDoMaximizador}. Resposta mais forte: <strong>${escolha}</strong>.</p>
    <p>A jogada do ${nomeDoMaximizador} (tracejada no tabuleiro) ainda não foi aplicada: as motos andam ao mesmo tempo, então o tabuleiro só muda depois da resposta do ${nomeDoMinimizador}.</p>${resumoDosFilhos}`;
}

function descreverLimite(no, nomeDoMaximizador, nomeDoMinimizador) {
  const valorFormatado = formatarValorMinimax(no.valor);
  if (no.tipoDoValor === LIMITE_SUPERIOR) {
    return `<p><strong>≤</strong> significa que a busca parou cedo: o valor real é no máximo ${valorFormatado}. Isso já basta, porque o ${nomeDoMaximizador} tem uma opção melhor garantida em outro ramo (α = ${formatarAlfa(no.alfaNaEntrada)}).</p>`;
  }
  if (no.tipoDoValor === LIMITE_INFERIOR) {
    return `<p><strong>≥</strong> significa que o valor real é pelo menos ${valorFormatado}. O ${nomeDoMinimizador} já tem uma resposta melhor para ele em outro ramo (β = ${formatarBeta(no.betaNaEntrada)}), então nunca deixaria o jogo chegar aqui.</p>`;
  }
  return '';
}

function descreverJanelaAlfaBeta(no) {
  return `<p>Janela ao entrar no nó: <strong>α = ${formatarAlfa(no.alfaNaEntrada)}</strong>, <strong>β = ${formatarBeta(no.betaNaEntrada)}</strong>. α é o melhor valor que o MAX já tem garantido; β é o melhor que o MIN já tem garantido. Quando α ≥ β, os irmãos restantes são podados.</p>`;
}

function montarDescricaoDoNo(no, busca) {
  const nomeDoMaximizador = NOME_DE_EXIBICAO[busca.jogadorMaximizador];
  const nomeDoMinimizador = NOME_DE_EXIBICAO[oponenteDe(busca.jogadorMaximizador)];
  const partes = [`<h3>${descreverTituloDoNo(no, nomeDoMaximizador, nomeDoMinimizador)}</h3>`, descreverCaminho(no)];

  if (no.podado) {
    partes.push(
      '<p>Este movimento nem chegou a ser simulado. Um irmão anterior já fez α ≥ β: o outro jogador tem uma alternativa melhor em outro ramo e nunca deixaria o jogo seguir por aqui. Isso é a <strong>poda alfa-beta</strong>, que economiza trabalho sem mudar a decisão final.</p>',
    );
    return partes.join('');
  }

  partes.push(`<p>Valor: <span class="valor-em-destaque ${classeDoValorMinimax(no.valor)}">${textoDoValor(no)}</span></p>`);

  if (no.desfecho) {
    partes.push(descreverDesfecho(no, nomeDoMaximizador, nomeDoMinimizador));
  } else if (noEhFolha(no)) {
    partes.push(descreverFolhaHeuristica(no, nomeDoMaximizador, nomeDoMinimizador));
  } else {
    partes.push(descreverEscolhaDoNo(no, nomeDoMaximizador, nomeDoMinimizador));
    partes.push(descreverLimite(no, nomeDoMaximizador, nomeDoMinimizador));
    if (busca.usarPodaAlfaBeta) {
      partes.push(descreverJanelaAlfaBeta(no));
    }
    partes.push('<p>Clique no nó para mostrar ou esconder os filhos.</p>');
  }
  return partes.join('');
}

export function criarVisualizadorDeArvore() {
  const elementos = {
    modal: document.getElementById('modal-arvore'),
    titulo: document.getElementById('titulo-da-arvore'),
    subtitulo: document.getElementById('subtitulo-da-arvore'),
    seletorDeAgente: document.getElementById('agente-da-arvore'),
    botaoFechar: document.getElementById('fechar-arvore'),
    resumo: document.getElementById('resumo-da-busca'),
    botaoExpandirCaminho: document.getElementById('expandir-caminho'),
    botaoExpandirNivel: document.getElementById('expandir-nivel'),
    botaoRecolher: document.getElementById('recolher-arvore'),
    botaoDiminuirZoom: document.getElementById('diminuir-zoom'),
    botaoAumentarZoom: document.getElementById('aumentar-zoom'),
    aviso: document.getElementById('aviso-da-arvore'),
    area: document.getElementById('area-da-arvore'),
    svg: document.getElementById('svg-da-arvore'),
    previa: document.getElementById('previa-do-no'),
    textoDoNo: document.getElementById('texto-do-no'),
  };
  const opcaoDoLaranja = elementos.seletorDeAgente.querySelector('option[value="laranja"]');

  const situacao = {
    abertura: null,
    busca: null,
    nosDoCaminhoPrincipal: new Set(),
    nosExpandidos: new Set(),
    noSelecionado: null,
    indiceDoZoom: INDICE_DO_ZOOM_PADRAO,
    numeroDoPedidoDaArvore: 0,
    numeroDoPedidoDaPrevia: 0,
    layout: null,
  };

  const zoomAtual = () => NIVEIS_DE_ZOOM[situacao.indiceDoZoom];

  function posicaoDoNoNaTela(no) {
    const posicionado = situacao.layout?.posicaoPorNo.get(no);
    if (!posicionado) {
      return null;
    }
    const centro = centroDoNo(posicionado);
    return {
      x: centro.x * zoomAtual() - elementos.area.scrollLeft,
      y: centro.y * zoomAtual() - elementos.area.scrollTop,
    };
  }

  function centralizarNo(no) {
    const posicionado = situacao.layout.posicaoPorNo.get(no);
    const centro = centroDoNo(posicionado);
    elementos.area.scrollLeft = centro.x * zoomAtual() - elementos.area.clientWidth / 2;
    elementos.area.scrollTop = Math.max(0, centro.y * zoomAtual() - 80);
  }

  function criarAresta(pai, filho) {
    const inicio = centroDoNo(pai);
    const fim = centroDoNo(filho);
    const yInicial = inicio.y + ALTURA_DO_NO / 2;
    const yFinal = fim.y - ALTURA_DO_NO / 2;
    const yDoMeio = (yInicial + yFinal) / 2;
    const classes = ['aresta'];
    if (situacao.nosDoCaminhoPrincipal.has(pai.no) && situacao.nosDoCaminhoPrincipal.has(filho.no)) {
      classes.push('aresta-caminho-principal');
    }
    if (filho.no.podado) {
      classes.push('aresta-podada');
    }
    return criarElementoSvg('path', {
      class: classes.join(' '),
      d: `M ${inicio.x} ${yInicial} C ${inicio.x} ${yDoMeio}, ${fim.x} ${yDoMeio}, ${fim.x} ${yFinal}`,
    });
  }

  function criarElementoDoNo(posicionado) {
    const { no } = posicionado;
    const centro = centroDoNo(posicionado);
    const classes = ['no', `vez-${no.jogadorDaVez}`];
    if (noEhFolha(no)) {
      classes.push('no-folha');
    }
    if (no.podado) {
      classes.push('no-podado');
    }
    if (situacao.nosDoCaminhoPrincipal.has(no)) {
      classes.push('no-caminho-principal');
    }
    if (no === situacao.noSelecionado) {
      classes.push('no-selecionado');
    }

    const grupo = criarElementoSvg('g', {
      class: classes.join(' '),
      transform: `translate(${centro.x - LARGURA_DO_NO / 2} ${centro.y - ALTURA_DO_NO / 2})`,
      tabindex: '0',
      role: 'treeitem',
      'aria-label': `${textoDoRotulo(no)}, ${textoDoTipo(no)}, valor ${textoDoValor(no)}`,
    });
    const raioDaBorda = no.tipo === NO_MIN && !noEhFolha(no) ? ALTURA_DO_NO / 2 : 8;
    grupo.append(
      criarElementoSvg('rect', { width: LARGURA_DO_NO, height: ALTURA_DO_NO, rx: raioDaBorda }),
      criarElementoSvg(
        'text',
        {
          class: `rotulo-do-no ${no.jogadorQueMoveu ? `jogada-${no.jogadorQueMoveu}` : ''}`,
          x: LARGURA_DO_NO / 2,
          y: 18,
          'text-anchor': 'middle',
        },
        textoDoRotulo(no),
      ),
      criarElementoSvg(
        'text',
        {
          class: `valor-do-no ${no.podado ? '' : classeDoValorMinimax(no.valor)}`,
          x: LARGURA_DO_NO / 2,
          y: 38,
          'text-anchor': 'middle',
        },
        textoDoValor(no),
      ),
      criarElementoSvg('text', { class: 'tipo-do-no', x: 4, y: -6 }, textoDoTipo(no)),
    );

    const temFilhosEscondidos = no.filhos.length > 0 && !situacao.nosExpandidos.has(no);
    if (temFilhosEscondidos) {
      const selo = criarElementoSvg('g', { class: 'selo-filhos-ocultos' });
      selo.append(
        criarElementoSvg('circle', { cx: LARGURA_DO_NO / 2, cy: ALTURA_DO_NO + 4, r: 10 }),
        criarElementoSvg(
          'text',
          { x: LARGURA_DO_NO / 2, y: ALTURA_DO_NO + 7.5, 'text-anchor': 'middle' },
          `+${no.filhos.length}`,
        ),
      );
      grupo.append(selo);
    }

    grupo.addEventListener('click', () => aoEscolherNo(no));
    grupo.addEventListener('keydown', (evento) => {
      if (evento.key === 'Enter' || evento.key === ' ') {
        evento.preventDefault();
        aoEscolherNo(no);
      }
    });
    return grupo;
  }

  function renderizarArvore(noQueDeveFicarParado = null) {
    const posicaoAnterior = noQueDeveFicarParado ? posicaoDoNoNaTela(noQueDeveFicarParado) : null;
    const layout = calcularLayout(situacao.busca.arvore, situacao.nosExpandidos);
    situacao.layout = layout;

    const larguraNatural = MARGEM_DA_ARVORE * 2 + (layout.quantidadeDeColunas - 1) * LARGURA_DA_COLUNA + LARGURA_DO_NO;
    const alturaNatural = MARGEM_DA_ARVORE * 2 + layout.profundidadeMaxima * ALTURA_DO_NIVEL + ALTURA_DO_NO + 12;
    elementos.svg.setAttribute('viewBox', `0 0 ${larguraNatural} ${alturaNatural}`);
    elementos.svg.setAttribute('width', larguraNatural * zoomAtual());
    elementos.svg.setAttribute('height', alturaNatural * zoomAtual());

    const arestasComuns = criarElementoSvg('g');
    const arestasDoCaminhoPrincipal = criarElementoSvg('g');
    const nos = criarElementoSvg('g');
    for (const posicionado of layout.nosPosicionados) {
      for (const filho of posicionado.filhos) {
        const aresta = criarAresta(posicionado, filho);
        const ehDoCaminhoPrincipal = aresta.classList.contains('aresta-caminho-principal');
        (ehDoCaminhoPrincipal ? arestasDoCaminhoPrincipal : arestasComuns).append(aresta);
      }
      nos.append(criarElementoDoNo(posicionado));
    }
    elementos.svg.replaceChildren(arestasComuns, arestasDoCaminhoPrincipal, nos);

    if (posicaoAnterior) {
      const novaPosicao = centroDoNo(layout.posicaoPorNo.get(noQueDeveFicarParado));
      elementos.area.scrollLeft = novaPosicao.x * zoomAtual() - posicaoAnterior.x;
      elementos.area.scrollTop = novaPosicao.y * zoomAtual() - posicaoAnterior.y;
    }
  }

  async function desenharPreviaDoNo(no) {
    const numeroDoPedido = ++situacao.numeroDoPedidoDaPrevia;
    try {
      const resposta = await chamarApi('/api/estado-do-no', {
        estado: situacao.abertura.estadoRaiz,
        caminho: no.caminho,
        jogadorMaximizador: situacao.busca.jogadorMaximizador,
      });
      if (numeroDoPedido !== situacao.numeroDoPedidoDaPrevia) {
        return;
      }
      desenharTabuleiro(elementos.previa, resposta.estado, {
        territorios: resposta.territorios,
        mostrarTerritorio: true,
        movimentoPendente: resposta.movimentoPendente,
      });
    } catch (erro) {
      avisar(erro.message);
    }
  }

  function renderizarDetalhes() {
    const no = situacao.noSelecionado;
    elementos.textoDoNo.innerHTML = montarDescricaoDoNo(no, situacao.busca);
    desenharPreviaDoNo(no);
  }

  function criarChip(rotulo, valor) {
    return `<span class="chip"><span class="chip-rotulo">${rotulo}</span><strong>${valor}</strong></span>`;
  }

  function renderizarCabecalho() {
    const { busca, abertura } = situacao;
    const nomeDoMaximizador = NOME_DE_EXIBICAO[busca.jogadorMaximizador];
    const nomeDoMinimizador = NOME_DE_EXIBICAO[oponenteDe(busca.jogadorMaximizador)];
    elementos.titulo.textContent = `Árvore de decisão do ${nomeDoMaximizador}`;
    elementos.subtitulo.textContent = `${abertura.descricaoDaRodada} · ${nomeDoMaximizador} é MAX (quer o maior valor) e ${nomeDoMinimizador} é MIN (o adversário, que quer o menor valor).`;
    elementos.resumo.innerHTML = [
      criarChip('Jogada escolhida', descreverMovimento(busca.movimento)),
      criarChip('Valor minimax', formatarValorMinimax(busca.valor)),
      criarChip('Profundidade', descreverProfundidade(busca.profundidadeEmRodadas)),
      criarChip('Nós visitados', formatarNumero(busca.nosVisitados)),
      criarChip('Poda alfa-beta', busca.usarPodaAlfaBeta ? `${formatarNumero(busca.ramosPodados)} ramos podados` : 'desligada'),
      criarChip('Tempo', formatarMilissegundos(busca.tempoEmMilissegundos)),
      busca.usarTurbo ? criarChip('Turbo', 'jogada em C++; árvore refeita em Python com a mesma busca') : '',
    ].join('');
  }

  function avisar(mensagem) {
    elementos.aviso.textContent = mensagem;
  }

  function aoEscolherNo(no) {
    situacao.noSelecionado = no;
    avisar('');
    if (no.filhos.length > 0) {
      if (situacao.nosExpandidos.has(no)) {
        situacao.nosExpandidos.delete(no);
      } else if (contarNosVisiveis(situacao.busca.arvore, situacao.nosExpandidos) + no.filhos.length > LIMITE_DE_NOS_VISIVEIS) {
        avisar('Árvore muito grande para mostrar tudo. Recolha alguns ramos antes.');
      } else {
        situacao.nosExpandidos.add(no);
      }
    }
    renderizarArvore(no);
    renderizarDetalhes();
  }

  async function carregarArvore(jogador) {
    const configuracaoDoAgente = situacao.abertura.configuracaoDosAgentes[jogador];
    const numeroDoPedido = ++situacao.numeroDoPedidoDaArvore;
    avisar('Calculando a árvore no Python…');
    elementos.seletorDeAgente.disabled = true;
    let busca;
    try {
      busca = await chamarApi('/api/arvore', {
        estado: situacao.abertura.estadoRaiz,
        jogador,
        configuracaoDoAgente,
      });
    } catch (erro) {
      avisar(erro.message);
      return;
    } finally {
      elementos.seletorDeAgente.disabled = false;
    }
    if (numeroDoPedido !== situacao.numeroDoPedidoDaArvore) {
      return;
    }
    prepararArvore(busca.arvore);
    situacao.busca = busca;
    const caminhoPrincipal = obterCaminhoPrincipal(situacao.busca.arvore);
    situacao.nosDoCaminhoPrincipal = new Set(caminhoPrincipal);
    situacao.nosExpandidos = new Set(caminhoPrincipal);
    situacao.noSelecionado = situacao.busca.arvore;
    avisar('');
    renderizarCabecalho();
    renderizarArvore();
    renderizarDetalhes();
    centralizarNo(situacao.busca.arvore);
  }

  function expandirCaminhoEscolhido() {
    if (!situacao.busca) {
      return;
    }
    for (const no of situacao.nosDoCaminhoPrincipal) {
      situacao.nosExpandidos.add(no);
    }
    avisar('');
    renderizarArvore(situacao.noSelecionado);
  }

  function expandirMaisUmNivel() {
    if (!situacao.busca) {
      return;
    }
    const nosVisiveis = listarNosVisiveis(situacao.busca.arvore, situacao.nosExpandidos);
    const nosParaExpandir = nosVisiveis.filter((no) => no.filhos.length > 0 && !situacao.nosExpandidos.has(no));
    const nosNovos = nosParaExpandir.reduce((total, no) => total + no.filhos.length, 0);
    if (nosParaExpandir.length === 0) {
      avisar('A árvore já está toda aberta.');
      return;
    }
    if (nosVisiveis.length + nosNovos > LIMITE_DE_NOS_VISIVEIS) {
      avisar(`Mais um nível mostraria ${formatarNumero(nosVisiveis.length + nosNovos)} nós. Expanda ramos específicos clicando neles.`);
      return;
    }
    for (const no of nosParaExpandir) {
      situacao.nosExpandidos.add(no);
    }
    avisar('');
    renderizarArvore(situacao.noSelecionado);
  }

  function recolherTudo() {
    if (!situacao.busca) {
      return;
    }
    situacao.nosExpandidos = new Set([situacao.busca.arvore]);
    situacao.noSelecionado = situacao.busca.arvore;
    avisar('');
    renderizarArvore();
    renderizarDetalhes();
    centralizarNo(situacao.busca.arvore);
  }

  function mudarZoom(variacao) {
    if (!situacao.busca) {
      return;
    }
    const novoIndice = Math.min(NIVEIS_DE_ZOOM.length - 1, Math.max(0, situacao.indiceDoZoom + variacao));
    if (novoIndice === situacao.indiceDoZoom) {
      return;
    }
    situacao.indiceDoZoom = novoIndice;
    renderizarArvore(situacao.noSelecionado);
  }

  elementos.botaoFechar.addEventListener('click', () => elementos.modal.close());
  elementos.modal.addEventListener('click', (evento) => {
    if (evento.target === elementos.modal) {
      elementos.modal.close();
    }
  });
  elementos.seletorDeAgente.addEventListener('change', () => carregarArvore(elementos.seletorDeAgente.value));
  elementos.botaoExpandirCaminho.addEventListener('click', expandirCaminhoEscolhido);
  elementos.botaoExpandirNivel.addEventListener('click', expandirMaisUmNivel);
  elementos.botaoRecolher.addEventListener('click', recolherTudo);
  elementos.botaoDiminuirZoom.addEventListener('click', () => mudarZoom(-1));
  elementos.botaoAumentarZoom.addEventListener('click', () => mudarZoom(1));

  async function abrir(abertura) {
    situacao.abertura = abertura;
    const laranjaUsaMinimax = abertura.configuracaoDosAgentes.laranja.estrategia === 'minimax';
    opcaoDoLaranja.disabled = !laranjaUsaMinimax;
    opcaoDoLaranja.textContent = laranjaUsaMinimax ? 'Laranja' : 'Laranja (não usa Minimax)';
    elementos.seletorDeAgente.value = 'azul';
    if (!elementos.modal.open) {
      elementos.modal.showModal();
    }
    await carregarArvore('azul');
  }

  function estaAberto() {
    return elementos.modal.open;
  }

  return { abrir, estaAberto };
}
