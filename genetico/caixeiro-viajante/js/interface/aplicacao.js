import { criarGeradorAleatorio, gerarSementeAleatoria } from '../logica/aleatorio.js';
import { listarCapitais, sortearCidades } from '../logica/cidades.js';
import { distanciaEntre } from '../logica/distancias.js';
import {
  QUANTIDADE_MINIMA_DE_PONTOS,
  algoritmoConvergiu,
  contarRotasDistintas,
  criarAlgoritmoGenetico,
  evoluirUmaGeracao,
  melhorIndividuo,
} from '../logica/genetico.js';
import { desenharAnatomiaDaGeracao, formatarQuilometros } from './anatomia-da-geracao.js';
import { desenharGraficoDeEvolucao } from './grafico-de-evolucao.js';
import { criarMapaDaRota } from './mapa-da-rota.js';

const GERACOES_POR_SEGUNDO = [1, 2, 5, 10, 30, 60, 200, 1000];
const INTERVALO_MINIMO_ENTRE_DESENHOS = 90;
const TEMPO_MAXIMO_DE_CALCULO_POR_QUADRO = 14;
const INTERVALO_ENTRE_QUADROS = 16;

const elementos = Object.fromEntries(
  [
    'indicador-geracao',
    'indicador-melhor',
    'indicador-media',
    'indicador-melhora',
    'selo-de-estado',
    'botao-evoluir',
    'botao-passo',
    'botao-reiniciar',
    'botao-mais-devagar',
    'botao-mais-rapido',
    'controle-velocidade',
    'rotulo-velocidade',
    'grafico-evolucao',
    'anatomia-da-geracao',
    'selecao-conjunto',
    'quantidade-sorteio',
    'rotulo-quantidade-sorteio',
    'botao-sortear',
    'botao-limpar',
    'resumo-dos-pontos',
    'parametro-populacao',
    'rotulo-populacao',
    'parametro-cruzamento',
    'rotulo-cruzamento',
    'parametro-mutacao',
    'rotulo-mutacao',
    'parametro-elite',
    'rotulo-elite',
    'parametro-torneio',
    'rotulo-torneio',
    'parametro-parada',
    'rotulo-parada',
    'estatistica-pior',
    'estatistica-diversidade',
    'estatistica-avaliadas',
    'estatistica-ultima-melhora',
    'lista-da-rota',
  ].map((id) => [id.replace(/-([a-z])/g, (_, letra) => letra.toUpperCase()), document.getElementById(id)]),
);

const aplicacao = {
  pontos: [],
  algoritmo: null,
  emExecucao: false,
  geracoesAcumuladas: 0,
  instanteDoQuadroAnterior: 0,
  instanteDoUltimoDesenho: 0,
};

const formatadorDeNumeros = new Intl.NumberFormat('pt-BR');

const mapa = criarMapaDaRota(document.getElementById('mapa'), {
  aoClicarNoMapa: adicionarPonto,
  aoClicarNoPonto: removerPonto,
});

function lerConfiguracao() {
  return {
    tamanhoDaPopulacao: Number(elementos.parametroPopulacao.value),
    taxaDeCruzamento: Number(elementos.parametroCruzamento.value) / 100,
    taxaDeMutacao: Number(elementos.parametroMutacao.value) / 100,
    quantidadeDeElite: Number(elementos.parametroElite.value),
    tamanhoDoTorneio: Number(elementos.parametroTorneio.value),
    geracoesSemMelhoraParaParar: Number(elementos.parametroParada.value),
  };
}

function geracoesPorSegundo() {
  return GERACOES_POR_SEGUNDO[Number(elementos.controleVelocidade.value)];
}

function atualizarRotulos() {
  const configuracao = lerConfiguracao();
  elementos.rotuloPopulacao.textContent = `${configuracao.tamanhoDaPopulacao} rotas`;
  elementos.rotuloCruzamento.textContent = `${Math.round(configuracao.taxaDeCruzamento * 100)}%`;
  elementos.rotuloMutacao.textContent = `${Math.round(configuracao.taxaDeMutacao * 100)}%`;
  elementos.rotuloElite.textContent = `${configuracao.quantidadeDeElite}`;
  elementos.rotuloTorneio.textContent = `${configuracao.tamanhoDoTorneio}`;
  elementos.rotuloParada.textContent = formatadorDeNumeros.format(configuracao.geracoesSemMelhoraParaParar);
  elementos.rotuloQuantidadeSorteio.textContent = `${elementos.quantidadeSorteio.value} cidades`;
  const velocidade = geracoesPorSegundo();
  elementos.rotuloVelocidade.textContent = `${formatadorDeNumeros.format(velocidade)} ${velocidade === 1 ? 'geração' : 'gerações'}/s`;
  elementos.botaoMaisDevagar.disabled = Number(elementos.controleVelocidade.value) === 0;
  elementos.botaoMaisRapido.disabled = Number(elementos.controleVelocidade.value) === GERACOES_POR_SEGUNDO.length - 1;
}

function descreverEstado() {
  if (!aplicacao.algoritmo) {
    return { texto: `Adicione pelo menos ${QUANTIDADE_MINIMA_DE_PONTOS} pontos`, classe: '' };
  }
  if (algoritmoConvergiu(aplicacao.algoritmo, lerConfiguracao())) {
    return { texto: `Convergiu: ${formatadorDeNumeros.format(lerConfiguracao().geracoesSemMelhoraParaParar)} gerações sem melhora`, classe: 'convergiu' };
  }
  if (aplicacao.emExecucao) {
    return { texto: 'Evoluindo…', classe: 'evoluindo' };
  }
  return { texto: aplicacao.algoritmo.geracao === 0 ? 'Pronto para evoluir' : 'Pausado', classe: '' };
}

function atualizarBotoes() {
  const semAlgoritmo = !aplicacao.algoritmo;
  const convergiu = !semAlgoritmo && algoritmoConvergiu(aplicacao.algoritmo, lerConfiguracao());
  elementos.botaoEvoluir.textContent = aplicacao.emExecucao ? '⏸ Pausar' : '▶ Evoluir';
  elementos.botaoEvoluir.classList.toggle('em-execucao', aplicacao.emExecucao);
  elementos.botaoEvoluir.disabled = semAlgoritmo || convergiu;
  elementos.botaoPasso.disabled = semAlgoritmo || aplicacao.emExecucao || convergiu;
  elementos.botaoReiniciar.disabled = semAlgoritmo;
  const estado = descreverEstado();
  elementos.seloDeEstado.textContent = estado.texto;
  elementos.seloDeEstado.className = `selo-de-estado ${estado.classe}`;
}

function desenharListaDaRota(individuo) {
  const { pontos, matrizDeDistancias } = aplicacao.algoritmo;
  const itens = individuo.rota.map((indiceDoPonto, posicao) => {
    const proximoPonto = individuo.rota[(posicao + 1) % individuo.rota.length];
    const ponto = pontos[indiceDoPonto];
    const nome = ponto.uf ? `${ponto.nome} (${ponto.uf})` : ponto.nome;
    const trecho = formatarQuilometros(distanciaEntre(matrizDeDistancias, indiceDoPonto, proximoPonto));
    return `<li>${indiceDoPonto + 1}. ${nome} <span class="distancia-do-trecho">→ ${trecho}</span></li>`;
  });
  elementos.listaDaRota.innerHTML = itens.join('');
}

function limparPainel() {
  for (const elemento of [
    elementos.indicadorMelhor,
    elementos.indicadorMedia,
    elementos.indicadorMelhora,
    elementos.estatisticaPior,
    elementos.estatisticaDiversidade,
    elementos.estatisticaAvaliadas,
    elementos.estatisticaUltimaMelhora,
  ]) {
    elemento.textContent = '-';
  }
  elementos.indicadorGeracao.textContent = '0';
  elementos.listaDaRota.innerHTML = '';
  mapa.mostrarRota(aplicacao.pontos, null);
  desenharAnatomiaDaGeracao(elementos.anatomiaDaGeracao, null, lerConfiguracao());
  desenharGraficoDeEvolucao(elementos.graficoEvolucao, [], { series: [], formatarValor: formatarQuilometros });
}

function desenharTudo() {
  aplicacao.instanteDoUltimoDesenho = performance.now();
  atualizarBotoes();
  elementos.resumoDosPontos.textContent = `${aplicacao.pontos.length} pontos no mapa.`;
  if (!aplicacao.algoritmo) {
    limparPainel();
    return;
  }
  const { algoritmo } = aplicacao;
  const melhor = melhorIndividuo(algoritmo);
  const estatisticasAtuais = algoritmo.historico.at(-1);
  const distanciaInicial = algoritmo.historico[0].melhor;

  elementos.indicadorGeracao.textContent = formatadorDeNumeros.format(algoritmo.geracao);
  elementos.indicadorMelhor.textContent = formatarQuilometros(melhor.distancia);
  elementos.indicadorMedia.textContent = formatarQuilometros(estatisticasAtuais.media);
  elementos.indicadorMelhora.textContent = `${Math.round((1 - melhor.distancia / distanciaInicial) * 100)}%`;
  elementos.estatisticaPior.textContent = formatarQuilometros(estatisticasAtuais.pior);
  elementos.estatisticaDiversidade.textContent = `${contarRotasDistintas(algoritmo.populacao)} de ${algoritmo.populacao.length}`;
  elementos.estatisticaAvaliadas.textContent = formatadorDeNumeros.format(algoritmo.individuosAvaliados);
  elementos.estatisticaUltimaMelhora.textContent = `geração ${formatadorDeNumeros.format(algoritmo.geracaoDaUltimaMelhora)}`;

  mapa.mostrarRota(algoritmo.pontos, melhor.rota);
  desenharListaDaRota(melhor);
  desenharAnatomiaDaGeracao(elementos.anatomiaDaGeracao, algoritmo.exemploDeReproducao, lerConfiguracao());
  desenharGraficoDeEvolucao(elementos.graficoEvolucao, algoritmo.historico, {
    series: [
      { chave: 'media', variavelDeCor: '--secundaria', espessura: 1.5 },
      { chave: 'melhor', variavelDeCor: '--destaque', espessura: 2.5 },
    ],
    formatarValor: formatarQuilometros,
  });
}

function evoluirSePossivel() {
  const configuracao = lerConfiguracao();
  if (!aplicacao.algoritmo || algoritmoConvergiu(aplicacao.algoritmo, configuracao)) {
    return false;
  }
  evoluirUmaGeracao(aplicacao.algoritmo, configuracao);
  return true;
}

function executarQuadro() {
  if (!aplicacao.emExecucao) {
    return;
  }
  const instante = performance.now();
  const tempoDecorrido = Math.min(250, instante - aplicacao.instanteDoQuadroAnterior);
  aplicacao.instanteDoQuadroAnterior = instante;
  aplicacao.geracoesAcumuladas += (tempoDecorrido * geracoesPorSegundo()) / 1000;

  const limiteDeTempo = performance.now() + TEMPO_MAXIMO_DE_CALCULO_POR_QUADRO;
  while (aplicacao.geracoesAcumuladas >= 1 && performance.now() < limiteDeTempo) {
    if (!evoluirSePossivel()) {
      pausar();
      break;
    }
    aplicacao.geracoesAcumuladas -= 1;
  }
  aplicacao.geracoesAcumuladas = Math.min(aplicacao.geracoesAcumuladas, 1);

  if (!aplicacao.emExecucao || performance.now() - aplicacao.instanteDoUltimoDesenho >= INTERVALO_MINIMO_ENTRE_DESENHOS) {
    desenharTudo();
  }
  if (aplicacao.emExecucao) {
    setTimeout(executarQuadro, INTERVALO_ENTRE_QUADROS);
  }
}

function evoluir() {
  if (!evoluirSePossivel()) {
    desenharTudo();
    return;
  }
  aplicacao.emExecucao = true;
  aplicacao.geracoesAcumuladas = 0;
  aplicacao.instanteDoQuadroAnterior = performance.now();
  desenharTudo();
  setTimeout(executarQuadro, INTERVALO_ENTRE_QUADROS);
}

function pausar() {
  aplicacao.emExecucao = false;
  desenharTudo();
}

function alternarExecucao() {
  if (aplicacao.emExecucao) {
    pausar();
  } else {
    evoluir();
  }
}

function avancarUmaGeracao() {
  evoluirSePossivel();
  desenharTudo();
}

function reiniciarAlgoritmo() {
  aplicacao.emExecucao = false;
  aplicacao.algoritmo =
    aplicacao.pontos.length >= QUANTIDADE_MINIMA_DE_PONTOS
      ? criarAlgoritmoGenetico(aplicacao.pontos, lerConfiguracao(), gerarSementeAleatoria())
      : null;
  mapa.mostrarPontos(aplicacao.pontos);
  desenharTudo();
}

function trocarPontos(novosPontos) {
  aplicacao.pontos = novosPontos;
  reiniciarAlgoritmo();
  mapa.enquadrarPontos(aplicacao.pontos);
}

function carregarConjuntoEscolhido() {
  const conjunto = elementos.selecaoConjunto.value;
  if (conjunto === 'capitais') {
    trocarPontos(listarCapitais());
  } else if (conjunto === 'sorteio') {
    const quantidade = Number(elementos.quantidadeSorteio.value);
    trocarPontos(sortearCidades(quantidade, criarGeradorAleatorio(gerarSementeAleatoria())));
  } else {
    reiniciarAlgoritmo();
  }
}

function adicionarPonto(latitude, longitude) {
  elementos.selecaoConjunto.value = 'personalizado';
  aplicacao.pontos = [...aplicacao.pontos, { nome: `Ponto ${aplicacao.pontos.length + 1}`, uf: '', latitude, longitude }];
  reiniciarAlgoritmo();
}

function removerPonto(indice) {
  elementos.selecaoConjunto.value = 'personalizado';
  aplicacao.pontos = aplicacao.pontos.filter((_, posicao) => posicao !== indice);
  reiniciarAlgoritmo();
}

function mudarVelocidade(variacao) {
  const novoValor = Number(elementos.controleVelocidade.value) + variacao;
  elementos.controleVelocidade.value = Math.min(GERACOES_POR_SEGUNDO.length - 1, Math.max(0, novoValor));
  atualizarRotulos();
}

function registrarEventos() {
  elementos.botaoEvoluir.addEventListener('click', alternarExecucao);
  elementos.botaoPasso.addEventListener('click', avancarUmaGeracao);
  elementos.botaoReiniciar.addEventListener('click', reiniciarAlgoritmo);
  elementos.botaoMaisDevagar.addEventListener('click', () => mudarVelocidade(-1));
  elementos.botaoMaisRapido.addEventListener('click', () => mudarVelocidade(1));
  elementos.controleVelocidade.addEventListener('input', () => mudarVelocidade(0));
  elementos.selecaoConjunto.addEventListener('change', carregarConjuntoEscolhido);
  elementos.botaoSortear.addEventListener('click', () => {
    elementos.selecaoConjunto.value = 'sorteio';
    carregarConjuntoEscolhido();
  });
  elementos.botaoLimpar.addEventListener('click', () => {
    elementos.selecaoConjunto.value = 'personalizado';
    trocarPontos([]);
  });
  elementos.quantidadeSorteio.addEventListener('input', atualizarRotulos);
  elementos.quantidadeSorteio.addEventListener('change', () => {
    if (elementos.selecaoConjunto.value === 'sorteio') {
      carregarConjuntoEscolhido();
    }
  });
  for (const parametro of ['parametroPopulacao', 'parametroCruzamento', 'parametroMutacao', 'parametroElite', 'parametroTorneio', 'parametroParada']) {
    elementos[parametro].addEventListener('input', () => {
      atualizarRotulos();
      atualizarBotoes();
    });
  }
  document.addEventListener('keydown', (evento) => {
    const alvo = evento.target.tagName;
    if (alvo === 'SELECT' || alvo === 'BUTTON' || evento.ctrlKey || evento.metaKey) {
      return;
    }
    if (evento.key === ' ') {
      evento.preventDefault();
      alternarExecucao();
    } else if (evento.key === 'ArrowRight' && alvo !== 'INPUT' && !aplicacao.emExecucao) {
      avancarUmaGeracao();
    }
  });
  window.addEventListener('resize', () => {
    mapa.ajustarTamanho();
    desenharTudo();
  });
}

atualizarRotulos();
registrarEventos();
carregarConjuntoEscolhido();
