import { gerarSementeAleatoria } from '../logica/aleatorio.js';
import {
  algoritmoConvergiu,
  atingiuAptidaoMaxima,
  criarAlgoritmoGenetico,
  evoluirUmaGeracao,
  melhorIndividuo,
} from '../logica/genetico.js';
import { desenharAnatomiaDaGeracao, formatarNota } from './anatomia-da-geracao.js';
import { desenharGraficoDeEvolucao } from './grafico-de-evolucao.js';
import { criarMaqueteDoCelular } from './maquete-do-celular.js';

const GERACOES_POR_SEGUNDO = [1, 2, 5, 10, 30, 60, 200, 1000];
const INTERVALO_MINIMO_ENTRE_DESENHOS = 150;
const TEMPO_MAXIMO_DE_CALCULO_POR_QUADRO = 14;
const INTERVALO_ENTRE_QUADROS = 16;
const ESCALA_DA_MELHOR_MAQUETE = 0.72;
const ESCALA_DAS_MAQUETES_DA_POPULACAO = 0.27;
const QUANTIDADE_MAXIMA_DE_MAQUETES_NA_GRADE = 60;

const elementos = Object.fromEntries(
  [
    'indicador-geracao',
    'indicador-melhor',
    'indicador-media',
    'indicador-variacoes',
    'selo-de-estado',
    'melhor-maquete',
    'nota-do-melhor',
    'lista-de-metricas',
    'botao-evoluir',
    'botao-passo',
    'botao-reiniciar',
    'botao-mais-devagar',
    'botao-mais-rapido',
    'controle-velocidade',
    'rotulo-velocidade',
    'grafico-evolucao',
    'grade-da-populacao',
    'anatomia-da-geracao',
    'parametro-populacao',
    'rotulo-populacao',
    'parametro-cruzamento',
    'rotulo-cruzamento',
    'parametro-mutacao',
    'rotulo-mutacao',
    'parametro-intensidade',
    'rotulo-intensidade',
    'parametro-elite',
    'rotulo-elite',
    'parametro-torneio',
    'rotulo-torneio',
    'parametro-parada',
    'rotulo-parada',
    'estatistica-pior',
    'estatistica-inicial',
    'estatistica-ultima-melhora',
    'estatistica-semente',
  ].map((id) => [id.replace(/-([a-z])/g, (_, letra) => letra.toUpperCase()), document.getElementById(id)]),
);

const aplicacao = {
  algoritmo: null,
  emExecucao: false,
  geracoesAcumuladas: 0,
  instanteDoQuadroAnterior: 0,
  instanteDoUltimoDesenho: 0,
};

const formatadorDeNumeros = new Intl.NumberFormat('pt-BR');

function lerConfiguracao() {
  return {
    tamanhoDaPopulacao: Number(elementos.parametroPopulacao.value),
    taxaDeCruzamento: Number(elementos.parametroCruzamento.value) / 100,
    taxaDeMutacaoPorGene: Number(elementos.parametroMutacao.value) / 100,
    intensidadeDaMutacao: Number(elementos.parametroIntensidade.value) / 100,
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
  elementos.rotuloPopulacao.textContent = `${configuracao.tamanhoDaPopulacao} telas`;
  elementos.rotuloCruzamento.textContent = `${Math.round(configuracao.taxaDeCruzamento * 100)}%`;
  elementos.rotuloMutacao.textContent = `${Math.round(configuracao.taxaDeMutacaoPorGene * 100)}%`;
  elementos.rotuloIntensidade.textContent = `${Math.round(configuracao.intensidadeDaMutacao * 100)}% da faixa`;
  elementos.rotuloElite.textContent = `${configuracao.quantidadeDeElite}`;
  elementos.rotuloTorneio.textContent = `${configuracao.tamanhoDoTorneio}`;
  elementos.rotuloParada.textContent = formatadorDeNumeros.format(configuracao.geracoesSemMelhoraParaParar);
  const velocidade = geracoesPorSegundo();
  elementos.rotuloVelocidade.textContent = `${formatadorDeNumeros.format(velocidade)} ${velocidade === 1 ? 'geração' : 'gerações'}/s`;
  elementos.botaoMaisDevagar.disabled = Number(elementos.controleVelocidade.value) === 0;
  elementos.botaoMaisRapido.disabled = Number(elementos.controleVelocidade.value) === GERACOES_POR_SEGUNDO.length - 1;
}

function descreverEstado() {
  const { algoritmo } = aplicacao;
  if (atingiuAptidaoMaxima(algoritmo)) {
    return { texto: 'Nota máxima atingida', classe: 'convergiu' };
  }
  if (algoritmoConvergiu(algoritmo, lerConfiguracao())) {
    return { texto: 'Convergiu: parou de melhorar', classe: 'convergiu' };
  }
  if (aplicacao.emExecucao) {
    return { texto: 'Evoluindo…', classe: 'evoluindo' };
  }
  return { texto: algoritmo.geracao === 0 ? 'Pronto para evoluir' : 'Pausado', classe: '' };
}

function atualizarBotoes() {
  const convergiu = algoritmoConvergiu(aplicacao.algoritmo, lerConfiguracao());
  elementos.botaoEvoluir.textContent = aplicacao.emExecucao ? '⏸ Pausar' : '▶ Evoluir';
  elementos.botaoEvoluir.classList.toggle('em-execucao', aplicacao.emExecucao);
  elementos.botaoEvoluir.disabled = convergiu;
  elementos.botaoPasso.disabled = aplicacao.emExecucao || convergiu;
  const estado = descreverEstado();
  elementos.seloDeEstado.textContent = estado.texto;
  elementos.seloDeEstado.className = `selo-de-estado ${estado.classe}`;
}

function classeDaNota(nota) {
  if (nota >= 0.8) {
    return '';
  }
  return nota >= 0.4 ? 'nota-media' : 'nota-baixa';
}

function desenharMetricas(individuo) {
  elementos.listaDeMetricas.innerHTML = individuo.metricas
    .map(
      (metrica) => `<li class="metrica">
        <span class="metrica-nome">${metrica.nome}</span>
        <span class="metrica-pontos">${formatarNota(metrica.peso * metrica.nota)} / ${metrica.peso}</span>
        <span class="metrica-barra"><span class="${classeDaNota(metrica.nota)}" style="width:${Math.round(metrica.nota * 100)}%"></span></span>
        <span class="metrica-detalhe">medido: ${metrica.valorMedido} · ideal: ${metrica.ideal}</span>
      </li>`,
    )
    .join('');
}

function desenharPopulacao(populacao, quantidadeDeElite) {
  const itens = populacao.slice(0, QUANTIDADE_MAXIMA_DE_MAQUETES_NA_GRADE).map((individuo, posicao) => {
    const item = document.createElement('div');
    item.className = posicao < quantidadeDeElite ? 'individuo-da-populacao elite' : 'individuo-da-populacao';
    const legenda = document.createElement('span');
    legenda.textContent = `#${posicao + 1} · ${formatarNota(individuo.aptidao)}`;
    item.append(criarMaqueteDoCelular(individuo.genes, ESCALA_DAS_MAQUETES_DA_POPULACAO, 'celular-pequeno'), legenda);
    return item;
  });
  elementos.gradeDaPopulacao.replaceChildren(...itens);
}

function desenharTudo() {
  aplicacao.instanteDoUltimoDesenho = performance.now();
  atualizarBotoes();
  const { algoritmo } = aplicacao;
  const configuracao = lerConfiguracao();
  const melhor = melhorIndividuo(algoritmo);
  const estatisticasAtuais = algoritmo.historico.at(-1);

  elementos.indicadorGeracao.textContent = formatadorDeNumeros.format(algoritmo.geracao);
  elementos.indicadorMelhor.textContent = formatarNota(melhor.aptidao);
  elementos.indicadorMedia.textContent = formatarNota(estatisticasAtuais.media);
  elementos.indicadorVariacoes.textContent = formatadorDeNumeros.format(algoritmo.variacoesAvaliadas);
  elementos.notaDoMelhor.textContent = formatarNota(melhor.aptidao);
  elementos.estatisticaPior.textContent = formatarNota(estatisticasAtuais.pior);
  elementos.estatisticaInicial.textContent = formatarNota(algoritmo.historico[0].melhor);
  elementos.estatisticaUltimaMelhora.textContent = `geração ${formatadorDeNumeros.format(algoritmo.geracaoDaUltimaMelhora)}`;
  elementos.estatisticaSemente.textContent = String(algoritmo.semente);

  elementos.melhorMaquete.replaceChildren(criarMaqueteDoCelular(melhor.genes, ESCALA_DA_MELHOR_MAQUETE));
  desenharMetricas(melhor);
  desenharPopulacao(algoritmo.populacao, configuracao.quantidadeDeElite);
  desenharAnatomiaDaGeracao(elementos.anatomiaDaGeracao, algoritmo.exemploDeReproducao);
  desenharGraficoDeEvolucao(elementos.graficoEvolucao, algoritmo.historico, {
    series: [
      { chave: 'media', variavelDeCor: '--secundaria', espessura: 1.5 },
      { chave: 'melhor', variavelDeCor: '--destaque', espessura: 2.5 },
    ],
    formatarValor: formatarNota,
  });
}

function evoluirSePossivel() {
  const configuracao = lerConfiguracao();
  if (algoritmoConvergiu(aplicacao.algoritmo, configuracao)) {
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
  let houveGeracaoNova = false;
  while (aplicacao.geracoesAcumuladas >= 1 && performance.now() < limiteDeTempo) {
    if (!evoluirSePossivel()) {
      pausar();
      break;
    }
    houveGeracaoNova = true;
    aplicacao.geracoesAcumuladas -= 1;
  }
  aplicacao.geracoesAcumuladas = Math.min(aplicacao.geracoesAcumuladas, 1);

  const desenhoLiberado = performance.now() - aplicacao.instanteDoUltimoDesenho >= INTERVALO_MINIMO_ENTRE_DESENHOS;
  if (aplicacao.emExecucao && houveGeracaoNova && desenhoLiberado) {
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

function criarNovaPopulacao() {
  aplicacao.emExecucao = false;
  aplicacao.algoritmo = criarAlgoritmoGenetico(lerConfiguracao(), gerarSementeAleatoria());
  desenharTudo();
}

function mudarVelocidade(variacao) {
  const novoValor = Number(elementos.controleVelocidade.value) + variacao;
  elementos.controleVelocidade.value = Math.min(GERACOES_POR_SEGUNDO.length - 1, Math.max(0, novoValor));
  atualizarRotulos();
}

function registrarEventos() {
  elementos.botaoEvoluir.addEventListener('click', alternarExecucao);
  elementos.botaoPasso.addEventListener('click', avancarUmaGeracao);
  elementos.botaoReiniciar.addEventListener('click', criarNovaPopulacao);
  elementos.botaoMaisDevagar.addEventListener('click', () => mudarVelocidade(-1));
  elementos.botaoMaisRapido.addEventListener('click', () => mudarVelocidade(1));
  elementos.controleVelocidade.addEventListener('input', () => mudarVelocidade(0));
  for (const parametro of [
    'parametroPopulacao',
    'parametroCruzamento',
    'parametroMutacao',
    'parametroIntensidade',
    'parametroElite',
    'parametroTorneio',
    'parametroParada',
  ]) {
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
  window.addEventListener('resize', desenharTudo);
}

atualizarRotulos();
registrarEventos();
criarNovaPopulacao();
