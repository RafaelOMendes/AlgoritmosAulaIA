from dataclasses import dataclass, replace


@dataclass(frozen=True)
class ConfiguracaoDoMercado:
    precos_possiveis: tuple[int, ...] = (8, 12, 16, 20, 24)
    custo_unitario_da_empresa: float = 10.0
    custo_unitario_do_concorrente: float = 10.0
    clientes_potenciais_por_rodada: int = 1000
    preco_maximo_que_o_cliente_aceita: float = 40.0
    sensibilidade_a_diferenca_de_preco: float = 0.05
    peso_da_fidelidade_anterior: float = 0.6
    fidelidade_inicial_da_empresa: float = 0.5
    caixa_inicial_do_concorrente: float = 2000.0
    quantidade_de_rodadas: int = 3

    def __post_init__(self):
        if self.quantidade_de_rodadas < 1:
            raise ValueError("O jogo precisa ter pelo menos uma rodada.")
        if not self.precos_possiveis:
            raise ValueError("É preciso informar pelo menos um preço possível.")
        existe_preco_sem_prejuizo_para_o_concorrente = any(
            preco >= self.custo_unitario_do_concorrente for preco in self.precos_possiveis
        )
        if not existe_preco_sem_prejuizo_para_o_concorrente:
            raise ValueError("O concorrente precisa de pelo menos um preço que não gere prejuízo.")
        if self.caixa_inicial_do_concorrente < 0:
            raise ValueError("O caixa inicial do concorrente não pode ser negativo.")


@dataclass(frozen=True)
class EstadoDoMercado:
    rodada_atual: int
    fidelidade_da_empresa: float
    caixa_do_concorrente: float
    lucro_acumulado_da_empresa: float
    lucro_acumulado_do_concorrente: float
    preco_anunciado_pela_empresa: int | None = None


@dataclass(frozen=True)
class ResultadoDaRodada:
    clientes_no_mercado: float
    participacao_da_empresa: float
    clientes_da_empresa: float
    clientes_do_concorrente: float
    lucro_da_empresa: float
    lucro_do_concorrente: float


def criar_estado_inicial(configuracao: ConfiguracaoDoMercado) -> EstadoDoMercado:
    return EstadoDoMercado(
        rodada_atual=0,
        fidelidade_da_empresa=configuracao.fidelidade_inicial_da_empresa,
        caixa_do_concorrente=configuracao.caixa_inicial_do_concorrente,
        lucro_acumulado_da_empresa=0.0,
        lucro_acumulado_do_concorrente=0.0,
    )


def jogo_terminou(configuracao: ConfiguracaoDoMercado, estado: EstadoDoMercado) -> bool:
    return estado.rodada_atual >= configuracao.quantidade_de_rodadas


def e_a_vez_da_empresa(estado: EstadoDoMercado) -> bool:
    return estado.preco_anunciado_pela_empresa is None


def limitar_entre_zero_e_um(valor: float) -> float:
    return max(0.0, min(1.0, valor))


def calcular_resultado_da_rodada(
    configuracao: ConfiguracaoDoMercado,
    fidelidade_da_empresa: float,
    preco_da_empresa: int,
    preco_do_concorrente: int,
) -> ResultadoDaRodada:
    preco_medio_do_mercado = (preco_da_empresa + preco_do_concorrente) / 2
    fracao_dos_clientes_que_compram = limitar_entre_zero_e_um(
        1 - preco_medio_do_mercado / configuracao.preco_maximo_que_o_cliente_aceita
    )
    clientes_no_mercado = configuracao.clientes_potenciais_por_rodada * fracao_dos_clientes_que_compram

    vantagem_de_preco_da_empresa = preco_do_concorrente - preco_da_empresa
    participacao_da_empresa = limitar_entre_zero_e_um(
        fidelidade_da_empresa
        + configuracao.sensibilidade_a_diferenca_de_preco * vantagem_de_preco_da_empresa
    )

    clientes_da_empresa = clientes_no_mercado * participacao_da_empresa
    clientes_do_concorrente = clientes_no_mercado - clientes_da_empresa

    margem_da_empresa = preco_da_empresa - configuracao.custo_unitario_da_empresa
    margem_do_concorrente = preco_do_concorrente - configuracao.custo_unitario_do_concorrente

    return ResultadoDaRodada(
        clientes_no_mercado=clientes_no_mercado,
        participacao_da_empresa=participacao_da_empresa,
        clientes_da_empresa=clientes_da_empresa,
        clientes_do_concorrente=clientes_do_concorrente,
        lucro_da_empresa=clientes_da_empresa * margem_da_empresa,
        lucro_do_concorrente=clientes_do_concorrente * margem_do_concorrente,
    )


def calcular_nova_fidelidade(
    configuracao: ConfiguracaoDoMercado,
    fidelidade_anterior: float,
    participacao_conquistada_na_rodada: float,
) -> float:
    peso_anterior = configuracao.peso_da_fidelidade_anterior
    return peso_anterior * fidelidade_anterior + (1 - peso_anterior) * participacao_conquistada_na_rodada


def anunciar_preco_da_empresa(estado: EstadoDoMercado, preco_da_empresa: int) -> EstadoDoMercado:
    return replace(estado, preco_anunciado_pela_empresa=preco_da_empresa)


def precos_que_o_concorrente_consegue_bancar(
    configuracao: ConfiguracaoDoMercado, estado: EstadoDoMercado
) -> list[int]:
    precos_bancaveis = []
    for preco_do_concorrente in configuracao.precos_possiveis:
        resultado = calcular_resultado_da_rodada(
            configuracao,
            estado.fidelidade_da_empresa,
            estado.preco_anunciado_pela_empresa,
            preco_do_concorrente,
        )
        caixa_depois_da_rodada = estado.caixa_do_concorrente + resultado.lucro_do_concorrente
        if caixa_depois_da_rodada >= 0:
            precos_bancaveis.append(preco_do_concorrente)
    return precos_bancaveis


def aplicar_resposta_do_concorrente(
    configuracao: ConfiguracaoDoMercado, estado: EstadoDoMercado, preco_do_concorrente: int
) -> EstadoDoMercado:
    resultado = calcular_resultado_da_rodada(
        configuracao,
        estado.fidelidade_da_empresa,
        estado.preco_anunciado_pela_empresa,
        preco_do_concorrente,
    )
    return EstadoDoMercado(
        rodada_atual=estado.rodada_atual + 1,
        fidelidade_da_empresa=calcular_nova_fidelidade(
            configuracao, estado.fidelidade_da_empresa, resultado.participacao_da_empresa
        ),
        caixa_do_concorrente=estado.caixa_do_concorrente + resultado.lucro_do_concorrente,
        lucro_acumulado_da_empresa=estado.lucro_acumulado_da_empresa + resultado.lucro_da_empresa,
        lucro_acumulado_do_concorrente=estado.lucro_acumulado_do_concorrente + resultado.lucro_do_concorrente,
    )
