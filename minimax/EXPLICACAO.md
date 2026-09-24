# Explicação do projeto: Minimax aplicado à guerra de preços em um duopólio

## 1. O problema

Em um **duopólio** duas empresas dominam o mercado e vendem produtos parecidos. Quando uma baixa o preço,
rouba clientes da outra, e a outra tende a reagir: é a **guerra de preços**. Um concorrente muito agressivo pode
até vender **abaixo do custo** (*dumping*), aceitando prejuízo temporário só para tirar clientes do rival.

A pergunta que o programa responde é:

> **Qual preço a empresa deve cobrar para garantir o maior lucro possível no pior cenário, ou seja,
> mesmo que o concorrente faça tudo para derrubar o lucro dela?**

Esse valor se chama **lucro mínimo garantido** (em teoria dos jogos, *nível de segurança* ou estratégia *maximin*).

### O que foi acrescentado à sugestão original

Se o jogo tivesse uma única rodada, o Minimax se resumiria a uma tabela: para cada preço da empresa, olhar a pior
resposta do concorrente e escolher o melhor desses piores casos. Para o algoritmo realmente explorar uma
**árvore de decisão**, o problema foi modelado com **várias rodadas** (trimestres) e com **memória entre as rodadas**:

- **Fidelidade dos clientes**: quem comprou da empresa numa rodada tende a continuar comprando na próxima.
  Perder clientes hoje prejudica o lucro de amanhã.
- **Caixa limitado do concorrente**: o concorrente só consegue vender abaixo do custo enquanto tiver dinheiro
  para cobrir o prejuízo. Se o caixa ficaria negativo, aquele preço não é permitido.

Com isso a decisão de hoje muda o que é possível amanhã, e o Minimax precisa olhar vários passos à frente.

## 2. Por que o Minimax se aplica

O Minimax é usado em jogos de **dois jogadores**, com **turnos alternados**, **informação perfeita** e
**interesses opostos** (soma zero). Na modelagem:

- a **empresa** é o jogador **MAX**: quer o maior lucro possível;
- o **concorrente** é o jogador **MIN**: escolhe o preço que deixa o lucro da empresa o menor possível.

Na vida real o concorrente quer maximizar o **próprio** lucro, e não necessariamente destruir o da empresa.
Supor que ele é um adversário que só quer prejudicar é uma **hipótese pessimista proposital**: é justamente ela que
permite falar em **garantia**. Se o concorrente fizer qualquer outra coisa (por exemplo, cuidar do próprio lucro),
a empresa só pode lucrar **igual ou mais** do que o valor calculado. A seção 3 da saída do programa e os testes
automatizados comprovam isso.

## 3. Modelagem como jogo

| Elemento do jogo | Como aparece no problema | Onde está no código |
|---|---|---|
| Jogadores | Empresa (MAX) e concorrente (MIN) | `e_a_vez_da_empresa` em `mercado.py` |
| Estado | Rodada atual, fidelidade dos clientes, caixa do concorrente, lucros acumulados e o preço já anunciado | `EstadoDoMercado` |
| Jogadas | Escolher um preço da lista `R$ 8, 12, 16, 20, 24` (o concorrente só pode escolher preços que consegue bancar) | `gerar_jogadas_possiveis` |
| Ordem dos turnos | Em cada rodada a empresa anuncia o preço primeiro; o concorrente responde já sabendo dele | `anunciar_preco_da_empresa` e `aplicar_resposta_do_concorrente` |
| Estado terminal | Todas as rodadas foram jogadas | `jogo_terminou` |
| Função de utilidade | Lucro acumulado da empresa no fim do jogo | `avaliar_estado_final` |

Cada rodada tem duas jogadas (empresa e concorrente), então a árvore tem **profundidade 2 × rodadas**
(6 níveis no padrão de 3 rodadas) e **fator de ramificação de até 5** (os 5 preços possíveis).

O fato de o concorrente **ver o preço da empresa antes de responder** também é pessimista de propósito: é o pior
cenário possível para a empresa, porque o adversário sempre tem a informação para dar a melhor resposta contra ela.

## 4. Modelo econômico

Em cada rodada, com preço da empresa `pE` e preço do concorrente `pC`:

1. **Tamanho do mercado**: quanto mais caro o mercado, menos gente compra.
   - `preço médio = (pE + pC) / 2`
   - `fração que compra = 1 − preço médio / 40`, limitada entre 0 e 1 (R$ 40 é o preço máximo que o cliente aceita)
   - `clientes no mercado = 1000 × fração que compra`
2. **Divisão dos clientes**: parte vem da fidelidade, parte da diferença de preço.
   - `participação da empresa = fidelidade + 0,05 × (pC − pE)`, limitada entre 0 e 1
   - Cada R$ 1 mais barato que o concorrente rende 5 pontos percentuais de participação.
3. **Lucro**: clientes × margem.
   - `lucro da empresa = clientes da empresa × (pE − custo)`
   - `lucro do concorrente = clientes do concorrente × (pC − custo)`, com custo de R$ 10 para as duas
   - Se o preço é menor que o custo, a margem é negativa e o lucro vira prejuízo.
4. **Memória para a próxima rodada**:
   - `nova fidelidade = 0,6 × fidelidade anterior + 0,4 × participação desta rodada`
   - `novo caixa do concorrente = caixa + lucro do concorrente`, e o concorrente não pode escolher um preço que deixe o caixa negativo.

Exemplo da primeira rodada, com os dois cobrando R$ 12: preço médio 12, fração que compra `1 − 12/40 = 0,7`,
700 clientes, 50% para cada um, lucro de `350 × (12 − 10) = R$ 700` para cada empresa.

## 5. O que cada parte do código faz

O código foi dividido em módulos com uma responsabilidade cada. Todos os nomes de funções e variáveis foram
escritos por extenso para o código se explicar sozinho, sem precisar de comentários.

### 5.1 `mercado.py`: regras do mercado

É o "tabuleiro" do jogo: sabe calcular o que acontece numa rodada, mas não sabe nada de Minimax.

- **`ConfiguracaoDoMercado`**: guarda todos os parâmetros do problema (preços possíveis, custos, número de clientes,
  sensibilidade a preço, peso da fidelidade, caixa inicial do concorrente e número de rodadas). Tem valores padrão e
  é imutável (`frozen=True`). O método `__post_init__` valida a configuração: exige pelo menos uma rodada, pelo menos
  um preço, caixa não negativo e pelo menos um preço em que o concorrente não tenha prejuízo (senão ele poderia ficar
  sem nenhuma jogada válida).
- **`EstadoDoMercado`**: uma "fotografia" do jogo num momento: rodada atual, fidelidade da empresa, caixa do
  concorrente, lucros acumulados e o preço que a empresa anunciou na rodada (ou `None`, se ainda é a vez dela).
  É imutável: cada jogada cria um estado novo em vez de alterar o anterior. Isso simplifica o Minimax, porque não é
  preciso "desfazer" jogadas ao voltar na árvore.
- **`ResultadoDaRodada`**: o resultado de uma rodada (clientes no mercado, participação, clientes e lucro de cada lado).
- **`criar_estado_inicial`**: monta o estado da rodada 0 a partir da configuração.
- **`jogo_terminou`**: diz se todas as rodadas já foram jogadas (estado terminal da árvore).
- **`e_a_vez_da_empresa`**: é a vez da empresa quando ela ainda não anunciou preço na rodada atual.
- **`limitar_entre_zero_e_um`**: garante que frações e participações fiquem entre 0% e 100%.
- **`calcular_resultado_da_rodada`**: aplica as fórmulas da seção 4 e devolve um `ResultadoDaRodada`.
- **`calcular_nova_fidelidade`**: média ponderada entre a fidelidade anterior e a participação conquistada na rodada.
- **`anunciar_preco_da_empresa`**: devolve um estado igual ao atual, mas com o preço da empresa registrado (passa a vez ao concorrente).
- **`precos_que_o_concorrente_consegue_bancar`**: filtra os preços em que o caixa do concorrente continua maior ou
  igual a zero depois da rodada. É o que impede o dumping infinito.
- **`aplicar_resposta_do_concorrente`**: fecha a rodada: calcula o resultado, soma os lucros, atualiza fidelidade e
  caixa e avança para a próxima rodada (de novo com a vez da empresa).

### 5.2 `busca_minimax.py`: o algoritmo

- **`EstatisticasDaBusca`**: contador de nós visitados e de podas, usado para comparar as duas versões do algoritmo.
- **`AvaliacaoDeJogada`**: associa um preço ao lucro mínimo garantido se esse preço for escolhido.
- **`gerar_jogadas_possiveis`**: se é a vez da empresa, todos os preços; se é a vez do concorrente, só os que ele consegue bancar.
- **`aplicar_jogada`**: gera o estado filho. Se quem joga é a empresa, anuncia o preço; se é o concorrente, fecha a rodada.
- **`avaliar_estado_final`**: a função de utilidade: o lucro acumulado da empresa no fim do jogo.
- **`minimax`**: o algoritmo clássico, recursivo:
  1. conta o nó visitado;
  2. se o jogo terminou, devolve o lucro acumulado da empresa (folha da árvore);
  3. se é a vez da empresa (MAX), testa todos os preços, calcula recursivamente o valor de cada um e devolve o **maior**;
  4. se é a vez do concorrente (MIN), testa todos os preços que ele consegue bancar e devolve o **menor**.

  O valor devolvido na raiz é o lucro mínimo garantido: o melhor resultado que a empresa consegue assegurar contra a
  pior sequência de respostas do concorrente.
- **`minimax_com_poda_alfa_beta`**: o mesmo algoritmo com a otimização alfa-beta, que dá **exatamente o mesmo
  resultado** visitando muito menos nós.
  - **alfa** é o maior lucro que a empresa já tem garantido em algum caminho explorado até agora;
  - **beta** é o menor lucro a que o concorrente já consegue limitar a empresa em algum caminho explorado até agora;
  - quando `alfa >= beta`, os irmãos restantes daquele nó não podem mudar a decisão final: um dos jogadores já tem
    uma alternativa melhor em outro ponto da árvore e nunca deixaria o jogo chegar ali. Esses ramos são **podados**
    (o `break` no laço) e a poda é contada.
- **`calcular_valor_do_estado`**: função auxiliar que roda uma das duas versões (com ou sem poda) a partir de um estado e devolve o valor e as estatísticas.
- **`avaliar_jogadas_possiveis`**: calcula o valor Minimax de **cada** jogada possível num estado. Cada filho é
  avaliado com a janela alfa-beta completa para que o valor de todos seja exato (e não só um limite), o que permite
  mostrar a tabela da seção 1 da saída.
- **`escolher_preco_da_empresa`**: pega a jogada de **maior** valor (decisão do jogador MAX).
- **`escolher_resposta_mais_agressiva_do_concorrente`**: pega a jogada de **menor** valor (decisão do jogador MIN).

### 5.3 `perfis_concorrente.py`: tipos de concorrente para a simulação

O Minimax sempre **planeja** supondo o pior concorrente. Para demonstrar a garantia, a simulação coloca a empresa
contra concorrentes com comportamentos diferentes. Todos recebem a configuração, o estado (com o preço da empresa já
anunciado) e um gerador aleatório, e devolvem um preço que o concorrente consegue bancar.

- **`concorrente_agressivo_minimax`**: joga como o MIN da árvore, a resposta que mais derruba o lucro da empresa. É o pior caso.
- **`concorrente_que_maximiza_o_proprio_lucro`**: escolhe o preço que dá mais lucro para ele próprio na rodada (comportamento racional "normal").
- **`concorrente_que_imita_a_empresa`**: copia o preço da empresa (ou o mais próximo que conseguir bancar).
- **`concorrente_que_sempre_pratica_o_menor_preco`**: faz dumping sempre que o caixa permite, sem planejar.
- **`concorrente_aleatorio`**: escolhe um preço ao acaso (com semente fixa, para o resultado ser reproduzível).
- **`preco_bancavel_mais_proximo`**: auxiliar que acha, entre os preços permitidos, o mais próximo de um preço desejado.
- **`PERFIS_DE_CONCORRENTE`**: dicionário com o nome de exibição de cada perfil e a função correspondente.

### 5.4 `simulacao.py`: jogando a guerra de preços

- **`RegistroDaRodada`**: o que aconteceu numa rodada (preços, resultado, lucro garantido naquele momento, fidelidade e caixa depois).
- **`ResultadoDaSimulacao`**: todas as rodadas de uma simulação, a garantia calculada no início e os lucros totais.
- **`simular_guerra_de_precos`**: joga o jogo do início ao fim. A cada rodada:
  1. a empresa roda o Minimax **a partir do estado atual** e escolhe o preço (a garantia da primeira rodada é guardada);
  2. o perfil de concorrente escolhido responde;
  3. o resultado da rodada é calculado e registrado, e o estado avança.

  Recalcular o Minimax a cada rodada permite à empresa aproveitar os erros do concorrente: se ele não jogar o pior
  caso, o novo estado é melhor do que o previsto e a garantia daquele ponto em diante só aumenta.

### 5.5 `main.py`: interface de linha de comando e relatórios

- **`ler_argumentos`**: define as opções `--rodadas`, `--caixa-concorrente`, `--semente` e `--detalhar` com `argparse`.
- **`formatar_em_reais`** e **`formatar_percentual`**: formatam números no padrão brasileiro (`R$ 1.480,00`, `50,0%`).
- **`imprimir_titulo`**, **`imprimir_tabela`** e **`alinhar_celula`**: desenham títulos e tabelas em texto, calculando a largura de cada coluna.
- **`mostrar_configuracao`**: imprime os parâmetros do mercado.
- **`mostrar_lucro_garantido_por_preco_inicial`**: seção 1, valor Minimax de cada preço inicial e a melhor escolha.
- **`mostrar_cenario_pessimista`** e **`mostrar_rodadas_da_simulacao`**: seção 2, a guerra rodada a rodada contra o concorrente agressivo.
- **`mostrar_comparacao_entre_perfis`**: seção 3, lucro da empresa contra cada perfil e se a garantia foi cumprida.
- **`mostrar_detalhes_de_todos_os_perfis`**: com `--detalhar`, imprime a tabela rodada a rodada de cada perfil.
- **`medir_busca`** e **`mostrar_comparacao_de_eficiencia`**: seção 4, mede nós, podas e tempo das duas versões do
  algoritmo. Com mais de 4 rodadas o Minimax puro é pulado, porque a árvore passaria de 10 milhões de nós.
- **`main`**: configura a saída em UTF-8 (para os acentos aparecerem certos), monta a configuração, roda as
  simulações para todos os perfis e chama as funções de relatório na ordem.

### 5.6 `test_minimax.py`: testes automatizados

Usa o `unittest` da biblioteca padrão. São 11 testes em três grupos:

- **Modelo de mercado**: preço menor aumenta a participação; a participação fica sempre entre 0 e 1; sem caixa o
  concorrente não consegue vender abaixo do custo; configuração sem preço viável é rejeitada.
- **Minimax**: com 1 rodada o Minimax dá o mesmo valor de uma busca por força bruta (máximo dos mínimos); a poda
  alfa-beta dá o mesmo valor que o Minimax puro em 12 configurações diferentes; a poda visita menos nós; o preço
  escolhido tem o maior lucro garantido.
- **Simulação**: contra **todos** os perfis, em várias configurações e sementes, a empresa nunca lucra menos que a
  garantia; contra o concorrente agressivo o lucro é **exatamente** a garantia; o caixa do concorrente nunca fica negativo.

## 6. Interpretando os resultados (configuração padrão: 3 rodadas, caixa de R$ 2.000)

**Seção 1: lucro garantido por preço inicial**

| Preço inicial | Lucro mínimo garantido |
|---|---|
| R$ 8 | R$ 282 |
| **R$ 12** | **R$ 1.480** (melhor) |
| R$ 16 | R$ 1.106 |
| R$ 20 | R$ 570 |
| R$ 24 | R$ 180 |

Preços altos dão margem boa, mas deixam a empresa vulnerável: o concorrente faz dumping, rouba os clientes e ainda
derruba a fidelidade para as rodadas seguintes. Preço baixo demais (R$ 8, abaixo do custo) dá prejuízo por unidade.
O melhor compromisso entre margem e proteção contra o pior caso é R$ 12.

**Seção 2: cenário pessimista.** O concorrente agressivo **não** faz dumping logo de cara: na rodada 1 ele cobra
R$ 12, lucra R$ 700 e aumenta o caixa para R$ 2.700. Com esse dinheiro ele consegue bancar **duas** rodadas seguidas a
R$ 8 (abaixo do custo), derrubando a participação da empresa de 50% para 30% e depois 22%. Esse planejamento surgiu
sozinho da busca Minimax, sem nenhuma regra escrita para isso.

**Seção 3: comparação entre perfis.** A empresa sempre termina com pelo menos R$ 1.480. Contra o concorrente que só
maximiza o próprio lucro ela chega a R$ 5.086. O concorrente de dumping imediato é um bom contraste: ele queima caixa
na rodada 1, fica sem dinheiro para repetir na rodada 2 (a empresa percebe isso pelo estado e sobe o preço para R$ 16)
e a empresa fecha com R$ 1.518, mais do que contra o agressivo que planeja.

**Seção 4: eficiência.** Com 3 rodadas o Minimax puro visita 18.780 nós e a poda alfa-beta, 1.909 (cerca de 90% a
menos), com o mesmo resultado. Com 4 rodadas a diferença cresce: 465.828 nós contra 13.317 (cerca de 97% a menos). O
tamanho da árvore cresce exponencialmente com a profundidade (até 25 combinações de preço por rodada), por isso a poda
se torna cada vez mais importante.

**Efeito do caixa do concorrente.** Rodando com `--caixa-concorrente 0`, o concorrente não consegue fazer dumping, o
melhor preço inicial passa a ser R$ 16 e a garantia sobe para R$ 2.238. Ou seja, o "cofre de guerra" do concorrente
custa R$ 758 de lucro garantido para a empresa.

## 7. Por que a garantia sempre é cumprida

O valor Minimax de um estado é o melhor lucro que a empresa consegue assegurar dali em diante contra qualquer
sequência de respostas. Quando o concorrente escolhe uma resposta diferente da pior, ele leva o jogo para um estado
cujo valor é **maior ou igual** ao previsto (se fosse menor, essa resposta é que teria sido escolhida como a pior).
Como a empresa recalcula o Minimax a cada rodada, ela continua garantindo pelo menos o valor do novo estado. Por
indução, rodada após rodada, o lucro final nunca fica abaixo da garantia inicial.

## 8. Limitações e possíveis extensões

- Os preços são discretos (5 opções). Mais opções deixam o modelo mais fino, mas a árvore cresce rapidamente.
- A árvore é explorada até o fim do jogo. Para horizontes longos seria preciso limitar a profundidade e usar uma
  **função de avaliação heurística** nos nós de corte (por exemplo, lucro acumulado mais uma estimativa do lucro futuro
  com base na fidelidade atual).
- A hipótese de adversário puro é conservadora. Um modelo de jogo de soma não zero (equilíbrio de Nash) descreveria
  melhor um concorrente que só quer o próprio lucro, mas deixaria de oferecer a garantia de pior caso.
- A ordem das jogadas influencia a eficiência da poda: testar primeiro as jogadas mais promissoras (por exemplo, os
  preços mais baixos para o concorrente, como já acontece aqui) aumenta o número de podas.
