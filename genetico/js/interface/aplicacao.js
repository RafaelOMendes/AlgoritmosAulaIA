import { chamarApi } from './api.js';
import { desenharAnatomiaDaGeracao, formatarQuilometros } from './anatomia-da-geracao.js';
import { desenharGraficoDeEvolucao } from './grafico-de-evolucao.js';
import { criarMapaDaRota } from './mapa-da-rota.js';

const GERACOES_POR_SEGUNDO = [1, 2, 5, 10, 25, 50, 100, 200];
const DURACAO_MINIMA_DO_CICLO = 100;
const QUANTIDADE_MINIMA_DE_PONTOS = 4;

const elementos = Object.fromEntries(
  [
    'aviso-de-erro',
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
  execucao: null,
  historico: [],
  emExecucao: false,
  identificadorDoCiclo: 0,
  aguardandoServidor: false,
};

const formatadorDeNumeros = new Intl.NumberFormat('pt-BR');

const mapa = criarMapaDaRota(document.getElementById('mapa'), {
  aoClicarNoMapa: adicionarPonto,
  aoClicarNoPonto: removerPonto,
});

function esperar(milissegundos) {
  return new Promise((resolver) => setTimeout(resolver, milissegundos));
}

function mostrarErro(mensagem) {
  elementos.avisoDeErro.textContent = mensagem;
  elementos.avisoDeErro.hidden = !mensagem;
}

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

function execucaoConvergiu() {
  const { execucao } = aplicacao;
  return Boolean(execucao) && execucao.geracao - execucao.geracaoDaUltimaMelhora >= lerConfiguracao().geracoesSemMelhoraParaParar;
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
  if (!aplicacao.execucao) {
    return { texto: `Adicione pelo menos ${QUANTIDADE_MINIMA_DE_PONTOS} pontos`, classe: '' };
  }
  if (execucaoConvergiu()) {
    return {
      texto: `Convergiu: ${formatadorDeNumeros.format(lerConfiguracao().geracoesSemMelhoraParaParar)} gerações sem melhora`,
      classe: 'convergiu',
    };
  }
  if (aplicacao.emExecucao) {
    return { texto: 'Evoluindo…', classe: 'evoluindo' };
  }
  return { texto: aplicacao.execucao.geracao === 0 ? 'Pronto para evoluir' : 'Pausado', classe: '' };
}

function atualizarBotoes() {
  const semExecucao = !aplicacao.execucao;
  const convergiu = execucaoConvergiu();
  elementos.botaoEvoluir.textContent = aplicacao.emExecucao ? '⏸ Pausar' : '▶ Evoluir';
  elementos.botaoEvoluir.classList.toggle('em-execucao', aplicacao.emExecucao);
  elementos.botaoEvoluir.disabled = semExecucao || convergiu;
  elementos.botaoPasso.disabled = semExecucao || aplicacao.emExecucao || convergiu || aplicacao.aguardandoServidor;
  elementos.botaoReiniciar.disabled = semExecucao;
  const estado = descreverEstado();
  elementos.seloDeEstado.textContent = estado.texto;
  elementos.seloDeEstado.className = `selo-de-estado ${estado.classe}`;
}

function desenharListaDaRota(melhor) {
  const itens = melhor.rota.map((indiceDoPonto, posicao) => {
    const ponto = aplicacao.pontos[indiceDoPonto];
    const nome = ponto.uf ? `${ponto.nome} (${ponto.uf})` : ponto.nome;
    return `<li>${indiceDoPonto + 1}. ${nome} <span class="distancia-do-trecho">→ ${formatarQuilometros(melhor.trechos[posicao])}</span></li>`;
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
  atualizarBotoes();
  elementos.resumoDosPontos.textContent = `${aplicacao.pontos.length} pontos no mapa.`;
  const { execucao } = aplicacao;
  if (!execucao) {
    limparPainel();
    return;
  }
  const estatisticasAtuais = aplicacao.historico.at(-1);

  elementos.indicadorGeracao.textContent = formatadorDeNumeros.format(execucao.geracao);
  elementos.indicadorMelhor.textContent = formatarQuilometros(execucao.melhor.distancia);
  elementos.indicadorMedia.textContent = formatarQuilometros(estatisticasAtuais.media);
  elementos.indicadorMelhora.textContent = `${Math.round((1 - execucao.melhor.distancia / execucao.distanciaInicial) * 100)}%`;
  elementos.estatisticaPior.textContent = formatarQuilometros(estatisticasAtuais.pior);
  elementos.estatisticaDiversidade.textContent = `${execucao.rotasDistintas} de ${execucao.tamanhoDaPopulacao}`;
  elementos.estatisticaAvaliadas.textContent = formatadorDeNumeros.format(execucao.individuosAvaliados);
  elementos.estatisticaUltimaMelhora.textContent = `geração ${formatadorDeNumeros.format(execucao.geracaoDaUltimaMelhora)}`;

  mapa.mostrarRota(aplicacao.pontos, execucao.melhor.rota);
  desenharListaDaRota(execucao.melhor);
  desenharAnatomiaDaGeracao(elementos.anatomiaDaGeracao, execucao.exemploDeReproducao, lerConfiguracao());
  desenharGraficoDeEvolucao(elementos.graficoEvolucao, aplicacao.historico, {
    series: [
      { chave: 'media', variavelDeCor: '--secundaria', espessura: 1.5 },
      { chave: 'melhor', variavelDeCor: '--destaque', espessura: 2.5 },
    ],
    formatarValor: formatarQuilometros,
  });
}

function registrarInstantaneo(instantaneo) {
  aplicacao.execucao = instantaneo;
  aplicacao.historico.push(...instantaneo.historicoNovo);
}

async function evoluirNoServidor(quantidadeDeGeracoes) {
  const execucaoAtual = aplicacao.execucao;
  if (!execucaoAtual || execucaoConvergiu() || aplicacao.aguardandoServidor) {
    return false;
  }
  aplicacao.aguardandoServidor = true;
  try {
    const instantaneo = await chamarApi('/api/evoluir', {
      id: execucaoAtual.id,
      geracoes: quantidadeDeGeracoes,
      configuracao: lerConfiguracao(),
      desdeAGeracao: execucaoAtual.geracao,
    });
    if (aplicacao.execucao !== execucaoAtual) {
      return false;
    }
    registrarInstantaneo(instantaneo);
    mostrarErro('');
    return !instantaneo.convergiu;
  } catch (erro) {
    mostrarErro(erro.message);
    return false;
  } finally {
    aplicacao.aguardandoServidor = false;
  }
}

async function evoluirContinuamente(identificadorDoCiclo) {
  while (aplicacao.emExecucao && aplicacao.identificadorDoCiclo === identificadorDoCiclo) {
    const inicio = performance.now();
    const velocidade = geracoesPorSegundo();
    const geracoesNoCiclo = Math.max(1, Math.ceil((velocidade * DURACAO_MINIMA_DO_CICLO) / 1000));
    const duracaoDoCiclo = (geracoesNoCiclo * 1000) / velocidade;
    const podeContinuar = await evoluirNoServidor(geracoesNoCiclo);
    if (aplicacao.identificadorDoCiclo !== identificadorDoCiclo) {
      return;
    }
    if (!podeContinuar) {
      pausar();
      return;
    }
    desenharTudo();
    const tempoRestante = duracaoDoCiclo - (performance.now() - inicio);
    if (tempoRestante > 0) {
      await esperar(tempoRestante);
    }
  }
}

function evoluir() {
  if (!aplicacao.execucao || execucaoConvergiu()) {
    return;
  }
  aplicacao.emExecucao = true;
  aplicacao.identificadorDoCiclo += 1;
  desenharTudo();
  evoluirContinuamente(aplicacao.identificadorDoCiclo);
}

function interromperEvolucao() {
  aplicacao.emExecucao = false;
  aplicacao.identificadorDoCiclo += 1;
}

function pausar() {
  interromperEvolucao();
  desenharTudo();
}

function alternarExecucao() {
  if (aplicacao.emExecucao) {
    pausar();
  } else {
    evoluir();
  }
}

async function avancarUmaGeracao() {
  await evoluirNoServidor(1);
  desenharTudo();
}

async function reiniciarAlgoritmo() {
  interromperEvolucao();
  aplicacao.execucao = null;
  aplicacao.historico = [];
  mapa.mostrarPontos(aplicacao.pontos);
  if (aplicacao.pontos.length >= QUANTIDADE_MINIMA_DE_PONTOS) {
    const pontosEnviados = aplicacao.pontos;
    try {
      const instantaneo = await chamarApi('/api/iniciar', { pontos: pontosEnviados, configuracao: lerConfiguracao() });
      if (aplicacao.pontos === pontosEnviados) {
        registrarInstantaneo(instantaneo);
        mostrarErro('');
      }
    } catch (erro) {
      mostrarErro(erro.message);
    }
  }
  desenharTudo();
}

async function trocarPontos(novosPontos) {
  aplicacao.pontos = novosPontos;
  mapa.mostrarPontos(aplicacao.pontos);
  mapa.enquadrarPontos(aplicacao.pontos);
  await reiniciarAlgoritmo();
}

async function carregarConjuntoEscolhido() {
  const conjunto = elementos.selecaoConjunto.value;
  try {
    if (conjunto === 'capitais') {
      const { pontos } = await chamarApi('/api/capitais');
      await trocarPontos(pontos);
    } else if (conjunto === 'sorteio') {
      const { pontos } = await chamarApi('/api/sortear-cidades', { quantidade: Number(elementos.quantidadeSorteio.value) });
      await trocarPontos(pontos);
    } else {
      await reiniciarAlgoritmo();
    }
  } catch (erro) {
    mostrarErro(erro.message);
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
