import { DEFINICAO_DOS_GENES, formatarGene } from '../logica/genes.js';
import { criarMaqueteDoCelular } from './maquete-do-celular.js';

const ESCALA_DAS_MAQUETES_DA_FAMILIA = 0.26;

export function formatarNota(nota) {
  return nota.toFixed(1).replace('.', ',');
}

function criarMembroDaFamilia(genes, legenda) {
  const membro = document.createElement('div');
  membro.className = 'membro-da-familia';
  const texto = document.createElement('span');
  texto.textContent = legenda;
  membro.append(criarMaqueteDoCelular(genes, ESCALA_DAS_MAQUETES_DA_FAMILIA, 'celular-pequeno'), texto);
  return membro;
}

function criarSimbolo(simbolo) {
  const elemento = document.createElement('span');
  elemento.className = 'simbolo-da-familia';
  elemento.textContent = simbolo;
  return elemento;
}

function descreverTorneio(torneio) {
  const notas = torneio.participantes.map((participante) => formatarNota(participante.aptidao)).join(', ');
  return `torneio entre notas ${notas}`;
}

function classeDoGeneDoFilho(nomeDoGene, cruzamento, mutacao) {
  if (mutacao.nomesDosGenesMutados.includes(nomeDoGene)) {
    return 'mutado';
  }
  if (!cruzamento) {
    return 'origem-a';
  }
  return cruzamento.origemDeCadaGene[nomeDoGene] === 'A' ? 'origem-a' : 'origem-b';
}

function criarTabelaDeGenes(exemplo) {
  const { torneioDoPaiA, torneioDoPaiB, cruzamento, mutacao, filho } = exemplo;
  const linhas = DEFINICAO_DOS_GENES.map((gene) => {
    const classe = classeDoGeneDoFilho(gene.nome, cruzamento, mutacao);
    return `<tr>
      <td>${gene.rotulo}</td>
      <td>${formatarGene(gene, torneioDoPaiA.vencedor.genes[gene.nome])}</td>
      <td>${formatarGene(gene, torneioDoPaiB.vencedor.genes[gene.nome])}</td>
      <td class="${classe}">${formatarGene(gene, filho.genes[gene.nome])}</td>
    </tr>`;
  }).join('');
  const tabela = document.createElement('table');
  tabela.className = 'tabela-de-genes';
  tabela.innerHTML = `<thead><tr><th>Gene</th><th>Pai A</th><th>Pai B</th><th>Filho</th></tr></thead><tbody>${linhas}</tbody>`;
  return tabela;
}

function criarLegendaDeOrigem(cruzamento) {
  const legenda = document.createElement('ul');
  legenda.className = 'legenda-de-origem';
  const itens = cruzamento
    ? [
        ['rgba(167, 139, 250, 0.5)', 'veio do pai A'],
        ['rgba(251, 146, 60, 0.5)', 'veio do pai B'],
        ['rgba(250, 204, 21, 0.6)', 'sofreu mutação'],
      ]
    : [
        ['rgba(167, 139, 250, 0.5)', 'sem cruzamento: cópia do pai A'],
        ['rgba(250, 204, 21, 0.6)', 'sofreu mutação'],
      ];
  legenda.innerHTML = itens.map(([cor, texto]) => `<li><span style="background:${cor}"></span>${texto}</li>`).join('');
  return legenda;
}

export function desenharAnatomiaDaGeracao(elemento, exemplo) {
  if (!exemplo) {
    elemento.innerHTML = '<p class="observacao">Evolua uma geração para ver a seleção, o cruzamento e a mutação acontecendo.</p>';
    return;
  }
  const { torneioDoPaiA, torneioDoPaiB, cruzamento, mutacao, filho } = exemplo;
  const familia = document.createElement('div');
  familia.className = 'familia';
  familia.append(
    criarMembroDaFamilia(torneioDoPaiA.vencedor.genes, `Pai A · nota ${formatarNota(torneioDoPaiA.vencedor.aptidao)}`),
    criarSimbolo(cruzamento ? '×' : '→'),
    criarMembroDaFamilia(torneioDoPaiB.vencedor.genes, `Pai B · nota ${formatarNota(torneioDoPaiB.vencedor.aptidao)}`),
    criarSimbolo('='),
    criarMembroDaFamilia(filho.genes, `Filho · nota ${formatarNota(filho.aptidao)}`),
  );

  const explicacao = document.createElement('p');
  explicacao.className = 'observacao';
  const quantidadeDeMutacoes = mutacao.nomesDosGenesMutados.length;
  explicacao.textContent =
    `Pai A venceu o ${descreverTorneio(torneioDoPaiA)}; pai B venceu o ${descreverTorneio(torneioDoPaiB)}. ` +
    (cruzamento ? 'No cruzamento uniforme, cada gene do filho vem de um dos pais, como numa moeda jogada. ' : 'Não houve cruzamento desta vez. ') +
    (quantidadeDeMutacoes > 0
      ? `${quantidadeDeMutacoes} gene(s) sofreram mutação com ruído gaussiano.`
      : 'Nenhum gene sofreu mutação.');

  elemento.replaceChildren(familia, explicacao, criarLegendaDeOrigem(cruzamento), criarTabelaDeGenes(exemplo));
}
