import { descreverCorCss } from '../logica/cores.js';
import {
  ALTURA_DA_BARRA_DE_STATUS,
  ALTURA_DA_TELA,
  ITENS_DA_LISTA,
  LARGURA_DA_TELA,
  TEXTO_DO_PARAGRAFO,
  TEXTO_DO_TITULO,
} from '../logica/metricas.js';

function criarElemento(nomeDaTag, classe, estilo = {}, texto = null) {
  const elemento = document.createElement(nomeDaTag);
  elemento.className = classe;
  Object.assign(elemento.style, estilo);
  if (texto !== null) {
    elemento.textContent = texto;
  }
  return elemento;
}

function calcularCores(genes) {
  return {
    fundo: descreverCorCss(genes.matizDoFundo, genes.saturacaoDoFundo, genes.luminosidadeDoFundo),
    texto: descreverCorCss(genes.matizDoTexto, genes.saturacaoDoTexto, genes.luminosidadeDoTexto),
    divisoria: descreverCorCss(genes.matizDoTexto, genes.saturacaoDoTexto, genes.luminosidadeDoTexto, 0.22),
    botao: descreverCorCss(genes.matizDoBotao, genes.saturacaoDoBotao, genes.luminosidadeDoBotao),
    textoDoBotao: descreverCorCss(0, 0, genes.luminosidadeDoTextoDoBotao),
  };
}

function criarTela(genes) {
  const cores = calcularCores(genes);
  const espacamento = `${genes.espacamentoEntreBlocos}px`;
  const tela = criarElemento('div', 'tela-do-celular', {
    background: cores.fundo,
    color: cores.texto,
    fontSize: `${genes.tamanhoDaFonte}px`,
    lineHeight: String(genes.alturaDaLinha),
  });

  const barraDeStatus = criarElemento('div', 'maquete-barra-de-status', { height: `${ALTURA_DA_BARRA_DE_STATUS}px` });
  barraDeStatus.append(criarElemento('span', '', {}, '9:41'), criarElemento('span', '', {}, '▮▮▮ 100%'));

  const conteudo = criarElemento('div', 'maquete-conteudo', {
    gap: espacamento,
    padding: `${espacamento} ${genes.margemLateral}px`,
  });
  const titulo = criarElemento('h3', 'maquete-titulo', { fontSize: `${genes.tamanhoDaFonte * genes.escalaDoTitulo}px` }, TEXTO_DO_TITULO);
  const paragrafo = criarElemento('p', 'maquete-paragrafo', {}, TEXTO_DO_PARAGRAFO);

  const lista = criarElemento('ul', 'maquete-lista');
  for (const [rotulo, valor] of ITENS_DA_LISTA) {
    const item = criarElemento('li', 'maquete-item', {
      padding: `${genes.espacamentoEntreBlocos / 4}px 0`,
      borderBottom: `1px solid ${cores.divisoria}`,
    });
    item.append(criarElemento('span', '', {}, rotulo), criarElemento('strong', '', {}, valor));
    lista.append(item);
  }

  const botao = criarElemento(
    'div',
    'maquete-botao',
    {
      height: `${genes.alturaDoBotao}px`,
      borderRadius: `${genes.raioDaBorda}px`,
      background: cores.botao,
      color: cores.textoDoBotao,
    },
    'Continuar',
  );
  const link = criarElemento('div', 'maquete-link', { color: cores.botao }, 'Agora não');

  conteudo.append(titulo, paragrafo, lista, botao, link);
  tela.append(barraDeStatus, conteudo);
  return tela;
}

export function criarMaqueteDoCelular(genes, escala, classeExtra = '') {
  const celular = criarElemento('div', `celular ${classeExtra}`);
  const recorte = criarElemento('div', 'recorte-da-tela', {
    width: `${LARGURA_DA_TELA * escala}px`,
    height: `${ALTURA_DA_TELA * escala}px`,
  });
  const tela = criarTela(genes);
  tela.style.transform = `scale(${escala})`;
  recorte.append(tela);
  celular.append(recorte);
  celular.setAttribute('role', 'img');
  celular.setAttribute('aria-label', 'Maquete de uma tela de celular gerada pelo algoritmo');
  return celular;
}
