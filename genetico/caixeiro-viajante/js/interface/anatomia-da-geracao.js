const formatadorDeNumeros = new Intl.NumberFormat('pt-BR');

export function formatarQuilometros(distancia) {
  return `${formatadorDeNumeros.format(Math.round(distancia))} km`;
}

function desenharSequencia(rota, classeDaPosicao = () => '') {
  const genes = rota
    .map((ponto, posicao) => `<span class="gene ${classeDaPosicao(posicao)}">${ponto + 1}</span>`)
    .join('');
  return `<div class="sequencia">${genes}</div>`;
}

function desenharTorneio(torneio) {
  const participantes = torneio.participantes
    .map((participante) => {
      const classe = participante === torneio.vencedor ? 'participante participante-vencedor' : 'participante';
      return `<span class="${classe}">${formatarQuilometros(participante.distancia)}</span>`;
    })
    .join('');
  return `<div class="torneio">${participantes}</div>`;
}

function desenharEtapa(titulo, explicacao, conteudo) {
  return `<div class="etapa"><div class="etapa-titulo">${titulo}<small>${explicacao}</small></div><div>${conteudo}</div></div>`;
}

const estaNoTrecho = (posicao, trecho) => trecho && posicao >= trecho.inicioDoTrecho && posicao <= trecho.fimDoTrecho;

export function desenharAnatomiaDaGeracao(elemento, exemplo, configuracao) {
  if (!exemplo) {
    elemento.innerHTML = '<p class="observacao">Evolua uma geração para ver a seleção, o cruzamento e a mutação acontecendo.</p>';
    return;
  }
  const { torneioDoPaiA, torneioDoPaiB, cruzamento, rotaAntesDaMutacao, mutacao, filho } = exemplo;
  const etapas = [
    desenharEtapa(
      'Seleção do pai A',
      `torneio com ${configuracao.tamanhoDoTorneio} rotas sorteadas; vence a mais curta`,
      desenharTorneio(torneioDoPaiA),
    ),
    desenharEtapa('Seleção do pai B', 'outro torneio independente', desenharTorneio(torneioDoPaiB)),
  ];

  if (cruzamento) {
    etapas.push(
      desenharEtapa(
        'Pai A',
        `${formatarQuilometros(torneioDoPaiA.vencedor.distancia)} · o trecho destacado é copiado`,
        desenharSequencia(torneioDoPaiA.vencedor.rota, (posicao) => (estaNoTrecho(posicao, cruzamento) ? 'gene-do-pai-a' : '')),
      ),
      desenharEtapa(
        'Pai B',
        `${formatarQuilometros(torneioDoPaiB.vencedor.distancia)} · completa o resto na ordem dele`,
        desenharSequencia(torneioDoPaiB.vencedor.rota, () => 'gene-do-pai-b'),
      ),
      desenharEtapa(
        'Filho (cruzamento OX)',
        'trecho do pai A + cidades restantes na ordem do pai B',
        desenharSequencia(rotaAntesDaMutacao, (posicao) => (estaNoTrecho(posicao, cruzamento) ? 'gene-do-pai-a' : 'gene-do-pai-b')),
      ),
    );
  } else {
    etapas.push(
      desenharEtapa(
        'Sem cruzamento',
        `aconteceu nos ${Math.round((1 - configuracao.taxaDeCruzamento) * 100)}% de chance restantes`,
        `<p class="observacao">O filho começa como uma cópia do pai A.</p>${desenharSequencia(rotaAntesDaMutacao)}`,
      ),
    );
  }

  if (mutacao) {
    etapas.push(
      desenharEtapa(
        'Mutação por inversão',
        'um trecho da rota é invertido (destacado)',
        desenharSequencia(mutacao.rota, (posicao) => (estaNoTrecho(posicao, mutacao) ? 'gene-mutado' : '')),
      ),
    );
  } else {
    etapas.push(
      desenharEtapa(
        'Sem mutação',
        `chance de mutação: ${Math.round(configuracao.taxaDeMutacao * 100)}%`,
        '<p class="observacao">O filho segue sem alterações.</p>',
      ),
    );
  }

  const melhorPai = Math.min(torneioDoPaiA.vencedor.distancia, torneioDoPaiB.vencedor.distancia);
  const comparacao = filho.distancia < melhorPai ? 'mais curto que os dois pais' : 'não superou o melhor pai';
  etapas.push(
    desenharEtapa(
      'Resultado',
      'o filho entra na próxima geração',
      `<strong>${formatarQuilometros(filho.distancia)}</strong> <span class="observacao">(${comparacao})</span>`,
    ),
  );
  elemento.innerHTML = etapas.join('');
}
