# Algoritmos genéticos

Dois problemas resolvidos com algoritmo genético, cada um numa pasta independente, com página web própria,
servidor local, testes e documentação. Dá para apagar uma das pastas sem afetar a outra.

| Pasta | Problema | O que evolui | Como a aptidão é medida |
|---|---|---|---|
| [`caixeiro-viajante/`](caixeiro-viajante/) | Caixeiro Viajante num mapa real | Rotas (ordem de visita das cidades) | Distância total da rota em km (menor é melhor) |
| [`design-de-interface/`](design-de-interface/) | Design de interface mobile automático | Telas de celular descritas por 17 genes | Nota de 0 a 100 em métricas de legibilidade (maior é melhor) |

Os dois seguem o mesmo esquema de tela: evoluir, pausar, avançar uma geração, controle de velocidade, gráfico da
evolução, estatísticas da população e o passo a passo de como a última geração foi criada.

## Como rodar

Requisitos: Node.js 18 ou superior e um navegador moderno (o Caixeiro Viajante também precisa de internet para o mapa).

```bash
cd genetico/caixeiro-viajante
```

```bash
npm start
```

ou

```bash
cd genetico/design-de-interface
```

```bash
npm start
```

Depois abra **http://localhost:8000**. Para rodar os dois ao mesmo tempo, use outra porta no segundo
(`node servidor.js 8001`). Cada pasta tem um `README.md` com os detalhes e um `EXPLICACAO.md` com a explicação do
algoritmo e do código.

## Esqueleto comum do algoritmo genético

1. **População inicial** aleatória.
2. **Avaliação** de cada indivíduo pela função de aptidão.
3. **Elitismo**: os melhores passam direto para a próxima geração.
4. **Seleção por torneio**: sorteia alguns indivíduos e o melhor deles vira pai (duas vezes, para ter dois pais).
5. **Cruzamento**: combina os dois pais num filho.
6. **Mutação**: altera o filho aleatoriamente, com uma certa probabilidade, para manter a diversidade.
7. Repete até convergir (muitas gerações sem melhora, ou nota máxima no caso do design).
