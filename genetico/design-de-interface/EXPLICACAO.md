# Explicação: Design de Interface Automático com algoritmo genético

## 1. O problema

Ferramentas de **design generativo** criam automaticamente muitas variações de uma interface e ficam com as
melhores. O desafio é que "boa interface" envolve muitas decisões ao mesmo tempo (cores, tamanhos, espaçamentos) e
elas se influenciam: uma fonte maior melhora a leitura, mas pode fazer o conteúdo não caber na tela; margens maiores
deixam o texto respirar, mas diminuem os caracteres por linha.

Neste projeto, o algoritmo genético evolui o visual de uma **tela de celular** (360 × 640 px) de uma carteira
digital, com título, parágrafo, lista de valores, botão principal e link. O conteúdo é fixo; o que evolui é o
**estilo**. Cada tela é avaliada por **métricas objetivas de legibilidade e usabilidade**, baseadas em
recomendações reais (WCAG, Apple Human Interface Guidelines e Material Design).

## 2. Como o algoritmo genético foi aplicado

| Conceito | Neste problema |
|---|---|
| **Indivíduo (cromossomo)** | Uma tela de celular descrita por 17 genes numéricos |
| **Gene** | Um parâmetro visual, por exemplo `tamanhoDaFonte = 17` ou `luminosidadeDoFundo = 96` |
| **Aptidão** | Nota de 0 a 100: soma ponderada de 12 métricas |
| **População** | 40 telas (configurável) |
| **Seleção** | Torneio: sorteia 3 telas e a de maior nota vira pai |
| **Cruzamento** | Uniforme, com 90% de chance: cada gene vem de um dos pais, como numa moeda jogada |
| **Mutação** | Ruído gaussiano: cada gene tem 15% de chance de mudar um pouco (desvio de 10% da faixa do gene) |
| **Elitismo** | As 2 melhores telas passam direto para a próxima geração |
| **Parada** | Nota 100 ou 150 gerações sem melhora |

### 2.1 Os 17 genes

| Grupo | Genes | Faixa |
|---|---|---|
| Cor do fundo | matiz, saturação, luminosidade (HSL) | 0–360°, 0–100%, 0–100% |
| Cor do texto | matiz, saturação, luminosidade | idem |
| Cor do botão | matiz, saturação, luminosidade | idem |
| Texto do botão | luminosidade (cinza, do preto ao branco) | 0–100% |
| Tipografia | tamanho da fonte, escala do título, altura da linha | 10–28 px, 1–3,2×, 1–2,2× |
| Botão | altura | 24–90 px |
| Espaços | margem lateral, espaçamento entre blocos | 0–48 px, 0–56 px |
| Forma | arredondamento das bordas | 0–28 px |

As cores usam HSL porque é mais intuitivo de mutar: mexer só na luminosidade clareia ou escurece a cor sem mudar o
tom. As matizes são **circulares** (0° e 360° são o mesmo vermelho), então a mutação "dá a volta" em vez de travar
no limite.

O arredondamento **não entra em nenhuma métrica**. Ele serve para mostrar a **deriva genética**: como não há pressão
seletiva sobre ele, esse gene varia livremente de uma geração para outra, enquanto os outros convergem.

### 2.2 As 12 métricas da aptidão

Cada métrica dá uma nota de 0 a 1, multiplicada pelo peso. A maioria usa uma **faixa ideal**: nota 1 dentro da
faixa, caindo em linha reta até 0 nos limites.

| Métrica | Peso | Nota máxima quando | Base |
|---|---|---|---|
| Contraste do texto | 18 | razão de contraste ≥ 7:1 | WCAG 1.4.6 (AAA) |
| Contraste do texto do botão | 10 | ≥ 7:1 | WCAG |
| Destaque do botão no fundo | 6 | ≥ 3:1 | WCAG 1.4.11 |
| Fundo pouco saturado | 6 | saturação ≤ 12% | fundos muito coloridos cansam a vista |
| Tamanho da fonte | 12 | 16 a 18 px | legibilidade em celulares |
| Hierarquia do título | 5 | título 1,75× a 2× o texto | hierarquia visual |
| Altura da linha | 8 | 1,45× a 1,55× | WCAG 1.4.12 |
| Área de toque do botão | 8 | 48 a 56 px | Material Design (48 dp) e Apple (44 pt) |
| Grade de 8 px | 7 | margem, espaço e botão múltiplos de 8 | prática comum de design |
| Margens e espaçamento | 6 | margem 16–24 px, espaço 16–24 px | respiro visual |
| Caracteres por linha | 5 | 38 a 50 | leitura confortável em telas pequenas |
| Ocupação da tela | 9 | conteúdo ocupando 80% a 95% da altura | sem sobrar espaço nem transbordar |

A **razão de contraste** segue a fórmula oficial da WCAG: converte as cores para RGB, calcula a luminância relativa
de cada uma (L) e faz (L_clara + 0,05) / (L_escura + 0,05). Preto no branco dá 21:1; duas cores iguais, 1:1.

A **ocupação da tela** e os **caracteres por linha** são estimados por fórmulas a partir dos genes: caracteres por
linha = largura útil / (fonte × 0,5), e a altura soma título, linhas do parágrafo, itens da lista, botão, link e
espaçamentos. É isso que cria os **conflitos**: aumentar fonte, margem ou espaçamento melhora algumas métricas e
piora outras, e o algoritmo precisa achar o equilíbrio.

### 2.3 Operadores

- **Cruzamento uniforme**: para cada um dos 17 genes, sorteia de qual pai ele vem. Funciona bem aqui porque os genes
  são parâmetros independentes. Diferente do Caixeiro Viajante, não existe restrição de permutação.
- **Mutação gaussiana**: soma ao gene um valor sorteado de uma distribuição normal. Mudanças pequenas são comuns e
  grandes são raras. Depois o valor é arredondado e mantido dentro da faixa (ou dá a volta, no caso da matiz).
- **Torneio e elitismo**: iguais aos do Caixeiro Viajante, mas agora vence a **maior** nota.

### 2.4 Resultados

A população inicial aleatória tem a melhor tela com nota entre 63 e 76 (e a média bem mais baixa, porque muitas
telas têm texto quase invisível). Nos testes com a configuração padrão, o algoritmo chegou à **nota 100 em cerca de
20 a 25 gerações** na maioria das sementes. Numa delas levou 182 gerações, porque a população ficou um tempo presa
com o texto do botão pouco contrastante. Como a velocidade começa em 2 gerações por segundo, dá para ver na tela as
interfaces saindo de combinações ilegíveis para layouts limpos e acessíveis.

## 3. O que cada parte do código faz

Duas camadas: `js/logica` (algoritmo, sem depender do navegador, testado com Node) e `js/interface` (tela). Não há
comentários no código; os nomes descrevem o que cada coisa faz.

### `js/logica/aleatorio.js`

- **`criarGeradorAleatorio`**, **`sortearInteiro`**, **`embaralhar`** e **`gerarSementeAleatoria`**: iguais aos do Caixeiro Viajante.
- **`sortearNumeroNormal`**: número com distribuição normal (transformação de Box-Muller), usado na mutação.

### `js/logica/genes.js`

- **`DEFINICAO_DOS_GENES`**: nome, rótulo, faixa, casas decimais, unidade e se o gene é circular.
- **`arredondarGene`**, **`ajustarAoIntervalo`**: mantêm o valor válido depois da mutação.
- **`formatarGene`**: texto para a tabela da tela (ex.: `17px`, `1,50×`, `220°`).

### `js/logica/cores.js`

- **`converterHslParaRgb`**: conversão de cor.
- **`calcularLuminanciaRelativa`** e **`calcularRazaoDeContraste`**: fórmulas da WCAG.
- **`descreverCorCss`**: gera o texto `hsl(...)` usado para pintar a maquete.

### `js/logica/metricas.js`

- Constantes da tela (360 × 640) e o conteúdo fixo (título, parágrafo e itens da lista).
- **`notaPorFaixaIdeal`**: a função de nota por faixa (1 no ideal, caindo até 0).
- **`extrairCores`**, **`calcularCaracteresPorLinha`**, **`estimarAlturaDoConteudo`**: medidas derivadas dos genes.
- **`calcularMetricas`**: as 12 métricas, com nota, peso, valor medido e valor ideal (tudo isso aparece na tela).
- **`calcularAptidao`**: soma ponderada, de 0 a 100.

### `js/logica/genetico.js`

- **`CONFIGURACAO_PADRAO`**, **`criarIndividuo`** (genes + nota + métricas) e **`sortearGenes`** (indivíduo aleatório).
- **`selecionarPorTorneio`**, **`cruzarUniformemente`** (também informa de qual pai veio cada gene) e
  **`mutarComRuidoGaussiano`** (também informa quais genes mudaram).
- **`criarAlgoritmoGenetico`**, **`gerarFilho`** e **`evoluirUmaGeracao`**: mesmo fluxo do Caixeiro Viajante (elite,
  torneios, cruzamento, mutação, ordenação, estatísticas e exemplo para a tela).
- **`atingiuAptidaoMaxima`** e **`algoritmoConvergiu`**: critérios de parada.

### `js/interface/`

- **`maquete-do-celular.js`**: transforma os genes numa tela de celular de verdade em HTML/CSS (cores, fonte,
  espaçamentos, botão). A mesma função desenha a tela grande, as miniaturas da população e os pais e o filho.
- **`aplicacao.js`**: controlador da página. Botões, **controle de velocidade** (mesmo mecanismo do Caixeiro
  Viajante), parâmetros ao vivo, placar, lista de métricas com barras coloridas, grade da população (a elite ganha
  borda roxa) e gráfico.
- **`anatomia-da-geracao.js`**: mostra o pai A, o pai B e o filho como celulares em miniatura, explica os torneios e
  mostra a tabela gene a gene, colorindo o que veio de cada pai e o que sofreu mutação.
- **`grafico-de-evolucao.js`**: gráfico da melhor nota e da nota média por geração.

### `testes/genetico.test.js`

11 testes: conversão HSL→RGB, contraste 21:1 e 1:1, nota por faixa, nota 100 para uma interface bem projetada,
punição para texto sem contraste e fonte pequena, pesos somando 100, cruzamento uniforme copiando de um dos pais,
mutação dentro dos limites (com a volta da matiz), mutação zero não altera nada, elitismo nunca piorando a melhor
nota e chegando acima de 95, e tamanho da população estável.

## 4. Limitações

- As métricas são um modelo simplificado: medem regras objetivas, não estética nem preferência de usuários reais.
  Ferramentas profissionais combinam métricas assim com testes de usabilidade.
- A altura do conteúdo é estimada por fórmula; a maquete desenhada pelo navegador pode variar alguns pixels.
- Como as métricas dependem de poucos genes cada, o problema é relativamente fácil para o algoritmo genético. Mais
  telas, componentes e restrições entre elementos (por exemplo, harmonia de cores) deixariam a busca mais difícil.
