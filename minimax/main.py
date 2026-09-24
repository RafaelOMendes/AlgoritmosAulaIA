import argparse
import sys
import time

from busca_minimax import avaliar_jogadas_possiveis, calcular_valor_do_estado
from mercado import ConfiguracaoDoMercado, criar_estado_inicial
from perfis_concorrente import PERFIS_DE_CONCORRENTE
from simulacao import ResultadoDaSimulacao, simular_guerra_de_precos

LIMITE_DE_RODADAS_PARA_MINIMAX_SEM_PODA = 4
NOME_DO_PERFIL_PESSIMISTA = "Agressivo (minimax)"
MARGEM_DE_ERRO_NUMERICO = 1e-6


def formatar_em_reais(valor: float) -> str:
    valor_formatado = f"{abs(valor):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    sinal = "-" if valor < -0.005 else ""
    return f"{sinal}R$ {valor_formatado}"


def formatar_percentual(valor: float) -> str:
    return f"{valor * 100:.1f}%".replace(".", ",")


def imprimir_titulo(texto: str) -> None:
    print()
    print(texto)
    print("=" * len(texto))


def alinhar_celula(texto: str, largura: int, indice_da_coluna: int, colunas_de_texto: set[int]) -> str:
    if indice_da_coluna in colunas_de_texto:
        return texto.ljust(largura)
    return texto.rjust(largura)


def imprimir_tabela(
    cabecalhos: list[str], linhas: list[list[str]], colunas_de_texto: set[int] | None = None
) -> None:
    colunas_de_texto = colunas_de_texto or set()
    larguras = [
        max(len(cabecalho), *(len(linha[indice]) for linha in linhas))
        for indice, cabecalho in enumerate(cabecalhos)
    ]
    separador = "-+-".join("-" * largura for largura in larguras)
    print(" | ".join(cabecalho.ljust(largura) for cabecalho, largura in zip(cabecalhos, larguras)))
    print(separador)
    for linha in linhas:
        celulas_alinhadas = [
            alinhar_celula(celula, largura, indice, colunas_de_texto)
            for indice, (celula, largura) in enumerate(zip(linha, larguras))
        ]
        print(" | ".join(celulas_alinhadas))


def ler_argumentos() -> argparse.Namespace:
    leitor = argparse.ArgumentParser(
        description="Guerra de preços em um duopólio resolvida com o algoritmo Minimax."
    )
    leitor.add_argument(
        "--rodadas",
        type=int,
        default=3,
        choices=range(1, 6),
        help="Quantidade de rodadas (trimestres) da guerra de preços. Padrão: 3.",
    )
    leitor.add_argument(
        "--caixa-concorrente",
        type=float,
        default=2000.0,
        help="Caixa inicial que o concorrente pode queimar vendendo abaixo do custo. Padrão: 2000.",
    )
    leitor.add_argument(
        "--semente",
        type=int,
        default=42,
        help="Semente do concorrente aleatório, para a simulação ser reproduzível. Padrão: 42.",
    )
    leitor.add_argument(
        "--detalhar",
        action="store_true",
        help="Mostra o passo a passo de cada rodada para todos os perfis de concorrente.",
    )
    return leitor.parse_args()


def mostrar_configuracao(configuracao: ConfiguracaoDoMercado) -> None:
    imprimir_titulo("Guerra de preços em um duopólio - decisão com Minimax")
    precos = ", ".join(formatar_em_reais(preco) for preco in configuracao.precos_possiveis)
    print(f"Rodadas (trimestres):             {configuracao.quantidade_de_rodadas}")
    print(f"Preços possíveis:                 {precos}")
    print(f"Custo unitário da empresa:        {formatar_em_reais(configuracao.custo_unitario_da_empresa)}")
    print(f"Custo unitário do concorrente:    {formatar_em_reais(configuracao.custo_unitario_do_concorrente)}")
    print(f"Clientes potenciais por rodada:   {configuracao.clientes_potenciais_por_rodada}")
    print(f"Fidelidade inicial da empresa:    {formatar_percentual(configuracao.fidelidade_inicial_da_empresa)}")
    print(f"Caixa inicial do concorrente:     {formatar_em_reais(configuracao.caixa_inicial_do_concorrente)}")
    print("Ordem de cada rodada: a empresa anuncia o preço e o concorrente responde já sabendo dele.")


def mostrar_lucro_garantido_por_preco_inicial(configuracao: ConfiguracaoDoMercado) -> None:
    imprimir_titulo("1) Lucro mínimo garantido para cada preço da primeira rodada")
    avaliacoes = avaliar_jogadas_possiveis(configuracao, criar_estado_inicial(configuracao))
    melhor_avaliacao = max(avaliacoes, key=lambda avaliacao: avaliacao.lucro_minimo_garantido)
    linhas = [
        [
            formatar_em_reais(avaliacao.preco),
            formatar_em_reais(avaliacao.lucro_minimo_garantido),
            "<- melhor escolha" if avaliacao == melhor_avaliacao else "",
        ]
        for avaliacao in avaliacoes
    ]
    imprimir_tabela(["Preço inicial", "Lucro mínimo garantido", ""], linhas, colunas_de_texto={2})
    print()
    print(
        f"Começando com {formatar_em_reais(melhor_avaliacao.preco)}, a empresa lucra pelo menos "
        f"{formatar_em_reais(melhor_avaliacao.lucro_minimo_garantido)} no total, "
        "mesmo que o concorrente jogue da forma mais agressiva possível."
    )


def mostrar_rodadas_da_simulacao(simulacao: ResultadoDaSimulacao) -> None:
    linhas = [
        [
            str(registro.numero_da_rodada),
            formatar_em_reais(registro.preco_da_empresa),
            formatar_em_reais(registro.preco_do_concorrente),
            formatar_percentual(registro.resultado.participacao_da_empresa),
            formatar_em_reais(registro.resultado.lucro_da_empresa),
            formatar_em_reais(registro.resultado.lucro_do_concorrente),
            formatar_em_reais(registro.caixa_do_concorrente_apos_a_rodada),
        ]
        for registro in simulacao.rodadas
    ]
    imprimir_tabela(
        [
            "Rodada",
            "Preço empresa",
            "Preço concorrente",
            "Participação empresa",
            "Lucro empresa",
            "Lucro concorrente",
            "Caixa concorrente",
        ],
        linhas,
    )
    print(f"Lucro total da empresa: {formatar_em_reais(simulacao.lucro_total_da_empresa)}")


def mostrar_cenario_pessimista(simulacao_pessimista: ResultadoDaSimulacao) -> None:
    imprimir_titulo("2) Cenário pessimista: o concorrente joga para derrubar o lucro da empresa")
    mostrar_rodadas_da_simulacao(simulacao_pessimista)
    print("Preços abaixo do custo indicam dumping: o concorrente aceita prejuízo para tirar clientes da empresa.")


def mostrar_comparacao_entre_perfis(simulacoes: list[ResultadoDaSimulacao]) -> None:
    imprimir_titulo("3) Empresa usando Minimax contra diferentes perfis de concorrente")
    linhas = []
    for simulacao in simulacoes:
        garantia_respeitada = (
            simulacao.lucro_total_da_empresa + MARGEM_DE_ERRO_NUMERICO
            >= simulacao.lucro_minimo_garantido_no_inicio
        )
        linhas.append(
            [
                simulacao.nome_do_perfil,
                formatar_em_reais(simulacao.lucro_total_da_empresa),
                formatar_em_reais(simulacao.lucro_minimo_garantido_no_inicio),
                "Sim" if garantia_respeitada else "Não",
                formatar_em_reais(simulacao.lucro_total_do_concorrente),
            ]
        )
    imprimir_tabela(
        ["Perfil do concorrente", "Lucro da empresa", "Garantia inicial", "Garantia cumprida?", "Lucro do concorrente"],
        linhas,
        colunas_de_texto={0},
    )
    print()
    print("Qualquer comportamento diferente do pior caso só pode deixar a empresa com lucro igual ou maior.")


def mostrar_detalhes_de_todos_os_perfis(simulacoes: list[ResultadoDaSimulacao]) -> None:
    for simulacao in simulacoes:
        imprimir_titulo(f"Detalhes - concorrente: {simulacao.nome_do_perfil}")
        mostrar_rodadas_da_simulacao(simulacao)


def medir_busca(configuracao: ConfiguracaoDoMercado, usar_poda_alfa_beta: bool) -> list[str]:
    inicio = time.perf_counter()
    valor, estatisticas = calcular_valor_do_estado(
        configuracao, criar_estado_inicial(configuracao), usar_poda_alfa_beta
    )
    tempo_em_milissegundos = (time.perf_counter() - inicio) * 1000
    return [
        "Minimax com poda alfa-beta" if usar_poda_alfa_beta else "Minimax puro",
        f"{estatisticas.nos_visitados:,}".replace(",", "."),
        f"{estatisticas.podas_realizadas:,}".replace(",", "."),
        f"{tempo_em_milissegundos:.1f} ms".replace(".", ","),
        formatar_em_reais(valor),
    ]


def mostrar_comparacao_de_eficiencia(configuracao: ConfiguracaoDoMercado) -> None:
    imprimir_titulo("4) Eficiência: Minimax puro x Minimax com poda alfa-beta")
    profundidade_da_arvore = 2 * configuracao.quantidade_de_rodadas
    print(f"Profundidade da árvore: {profundidade_da_arvore} níveis (empresa e concorrente jogam uma vez por rodada)")
    linhas = []
    if configuracao.quantidade_de_rodadas <= LIMITE_DE_RODADAS_PARA_MINIMAX_SEM_PODA:
        linhas.append(medir_busca(configuracao, usar_poda_alfa_beta=False))
    linhas.append(medir_busca(configuracao, usar_poda_alfa_beta=True))
    imprimir_tabela(["Algoritmo", "Nós visitados", "Podas", "Tempo", "Lucro garantido"], linhas, colunas_de_texto={0})
    if configuracao.quantidade_de_rodadas > LIMITE_DE_RODADAS_PARA_MINIMAX_SEM_PODA:
        print(
            f"O Minimax puro não foi executado: com mais de {LIMITE_DE_RODADAS_PARA_MINIMAX_SEM_PODA} "
            "rodadas a árvore passa de 10 milhões de nós."
        )


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    argumentos = ler_argumentos()
    configuracao = ConfiguracaoDoMercado(
        quantidade_de_rodadas=argumentos.rodadas,
        caixa_inicial_do_concorrente=argumentos.caixa_concorrente,
    )

    mostrar_configuracao(configuracao)
    mostrar_lucro_garantido_por_preco_inicial(configuracao)

    simulacoes = [
        simular_guerra_de_precos(configuracao, nome_do_perfil, perfil, argumentos.semente)
        for nome_do_perfil, perfil in PERFIS_DE_CONCORRENTE.items()
    ]
    simulacao_pessimista = next(
        simulacao for simulacao in simulacoes if simulacao.nome_do_perfil == NOME_DO_PERFIL_PESSIMISTA
    )

    mostrar_cenario_pessimista(simulacao_pessimista)
    mostrar_comparacao_entre_perfis(simulacoes)
    if argumentos.detalhar:
        mostrar_detalhes_de_todos_os_perfis(simulacoes)
    mostrar_comparacao_de_eficiencia(configuracao)


if __name__ == "__main__":
    main()
