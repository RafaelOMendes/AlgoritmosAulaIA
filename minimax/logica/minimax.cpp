#include <algorithm>
#include <array>
#include <cstdint>
#include <future>
#include <limits>
#include <vector>

#ifdef _WIN32
#define EXPORTAR_PARA_O_PYTHON __declspec(dllexport)
#else
#define EXPORTAR_PARA_O_PYTHON __attribute__((visibility("default")))
#endif

using namespace std;

const int VERSAO_DA_INTERFACE = 2;

const uint8_t LIVRE = 0;
const uint8_t PAREDE = 1;
const uint8_t RASTRO_AZUL = 2;
const uint8_t RASTRO_LARANJA = 3;

const uint8_t SEM_DONO = 0;
const uint8_t DONO_AZUL = 1;
const uint8_t DONO_LARANJA = 2;
const uint8_t DISPUTADA = 3;

const int FORA = -1;
const int SEM_MOVIMENTO = -1;

const int CIMA = 0;
const int QUANTIDADE_DE_DIRECOES = 4;
const int DELTA_L[QUANTIDADE_DE_DIRECOES] = {-1, 0, 1, 0};
const int DELTA_C[QUANTIDADE_DE_DIRECOES] = {0, 1, 0, -1};

const int VALOR_VITORIA = 1000;
const int VALOR_EMPATE = -500;
const int INF = numeric_limits<int>::max();

struct Tabelas {
    vector<array<int, QUANTIDADE_DE_DIRECOES>> vizinhos;
    vector<vector<int>> vizinhos_validos;
};

struct Estado {
    int tamanho;
    vector<uint8_t> celulas;
    int pos_azul;
    int pos_laranja;
    bool vivo_azul;
    bool vivo_laranja;
    int ultimo_mov_azul;
    int ultimo_mov_laranja;
};

struct Reversao {
    int pos_azul;
    int pos_laranja;
    bool vivo_azul;
    bool vivo_laranja;
    int ultimo_mov_azul;
    int ultimo_mov_laranja;
    int mod_azul;
    int mod_laranja;
};

struct Movimentos {
    array<int, QUANTIDADE_DE_DIRECOES> direcoes;
    int quantidade;
};

struct Contexto {
    const Tabelas* tabelas;
    bool max_eh_azul;
    bool poda;
    int nos_visitados = 0;
    int ramos_podados = 0;
    vector<uint8_t> dono;
    vector<int> camada_alcance;
    vector<int> fronteira_azul;
    vector<int> fronteira_laranja;
    vector<int> proxima_fronteira_azul;
    vector<int> proxima_fronteira_laranja;

    Contexto(const Tabelas* tabelas_da_busca, int quantidade_de_celulas, bool maximizador_eh_azul, bool usar_poda)
        : tabelas(tabelas_da_busca),
          max_eh_azul(maximizador_eh_azul),
          poda(usar_poda),
          dono(quantidade_de_celulas, SEM_DONO),
          camada_alcance(quantidade_de_celulas, FORA) {}
};

struct ResultadoDoRamo {
    int valor;
    int nos_visitados;
    int ramos_podados;
};

Tabelas criar_tabelas(int tamanho) {
    Tabelas tabelas;
    tabelas.vizinhos.assign(tamanho * tamanho, array<int, QUANTIDADE_DE_DIRECOES>{FORA, FORA, FORA, FORA});
    tabelas.vizinhos_validos.assign(tamanho * tamanho, vector<int>());

    for (int l = 0; l < tamanho; ++l) {
        for (int c = 0; c < tamanho; ++c) {
            int idx = l * tamanho + c;
            for (int d = 0; d < QUANTIDADE_DE_DIRECOES; ++d) {
                int nl = l + DELTA_L[d];
                int nc = c + DELTA_C[d];
                if (nl >= 0 && nl < tamanho && nc >= 0 && nc < tamanho) {
                    int viz = nl * tamanho + nc;
                    tabelas.vizinhos[idx][d] = viz;
                    tabelas.vizinhos_validos[idx].push_back(viz);
                }
            }
        }
    }
    return tabelas;
}

inline bool celula_livre(const Estado& e, int idx) {
    return idx != FORA && e.celulas[idx] == LIVRE;
}

Movimentos movimentos_possiveis(const Tabelas& tabelas, const Estado& e, bool azul) {
    int pos = azul ? e.pos_azul : e.pos_laranja;
    Movimentos movs = {{}, 0};
    for (int d = 0; d < QUANTIDADE_DE_DIRECOES; ++d) {
        if (celula_livre(e, tabelas.vizinhos[pos][d])) movs.direcoes[movs.quantidade++] = d;
    }
    if (movs.quantidade == 0) {
        int ultimo_mov = azul ? e.ultimo_mov_azul : e.ultimo_mov_laranja;
        movs.direcoes[movs.quantidade++] = ultimo_mov == SEM_MOVIMENTO ? CIMA : ultimo_mov;
    }
    return movs;
}

Reversao fazer_rodada(const Tabelas& tabelas, Estado& e, int mov_azul, int mov_laranja) {
    Reversao rev = {
        e.pos_azul, e.pos_laranja, e.vivo_azul, e.vivo_laranja, e.ultimo_mov_azul, e.ultimo_mov_laranja, FORA, FORA
    };

    int dest_azul = tabelas.vizinhos[e.pos_azul][mov_azul];
    int dest_laranja = tabelas.vizinhos[e.pos_laranja][mov_laranja];
    bool colisao_frontal = (dest_azul == dest_laranja);

    bool azul_sobrevive = celula_livre(e, dest_azul) && !colisao_frontal;
    bool laranja_sobrevive = celula_livre(e, dest_laranja) && !colisao_frontal;

    if (azul_sobrevive) {
        e.celulas[dest_azul] = RASTRO_AZUL;
        e.pos_azul = dest_azul;
        rev.mod_azul = dest_azul;
    } else {
        e.vivo_azul = false;
    }

    if (laranja_sobrevive) {
        e.celulas[dest_laranja] = RASTRO_LARANJA;
        e.pos_laranja = dest_laranja;
        rev.mod_laranja = dest_laranja;
    } else {
        e.vivo_laranja = false;
    }

    e.ultimo_mov_azul = mov_azul;
    e.ultimo_mov_laranja = mov_laranja;
    return rev;
}

void desfazer_rodada(Estado& e, const Reversao& rev) {
    if (rev.mod_azul != FORA) e.celulas[rev.mod_azul] = LIVRE;
    if (rev.mod_laranja != FORA) e.celulas[rev.mod_laranja] = LIVRE;
    e.pos_azul = rev.pos_azul;
    e.pos_laranja = rev.pos_laranja;
    e.vivo_azul = rev.vivo_azul;
    e.vivo_laranja = rev.vivo_laranja;
    e.ultimo_mov_azul = rev.ultimo_mov_azul;
    e.ultimo_mov_laranja = rev.ultimo_mov_laranja;
}

int calcular_territorios(Contexto& ctx, const Estado& e) {
    const Tabelas& tabelas = *ctx.tabelas;
    vector<uint8_t>& dono = ctx.dono;
    vector<int>& camada_alcance = ctx.camada_alcance;
    vector<int>& front_azul = ctx.fronteira_azul;
    vector<int>& front_laranja = ctx.fronteira_laranja;
    vector<int>& prox_azul = ctx.proxima_fronteira_azul;
    vector<int>& prox_laranja = ctx.proxima_fronteira_laranja;

    fill(dono.begin(), dono.end(), SEM_DONO);
    front_azul.assign(1, e.pos_azul);
    front_laranja.assign(1, e.pos_laranja);
    int camada = 0;

    while (!front_azul.empty() || !front_laranja.empty()) {
        camada++;
        prox_azul.clear();
        for (int c : front_azul) {
            for (int v : tabelas.vizinhos_validos[c]) {
                if (e.celulas[v] == LIVRE && dono[v] == SEM_DONO) {
                    dono[v] = DONO_AZUL;
                    camada_alcance[v] = camada;
                    prox_azul.push_back(v);
                }
            }
        }

        prox_laranja.clear();
        for (int c : front_laranja) {
            for (int v : tabelas.vizinhos_validos[c]) {
                if (e.celulas[v] != LIVRE) continue;
                if (dono[v] == SEM_DONO) {
                    dono[v] = DONO_LARANJA;
                    camada_alcance[v] = camada;
                    prox_laranja.push_back(v);
                } else if (dono[v] == DONO_AZUL && camada_alcance[v] == camada) {
                    dono[v] = DISPUTADA;
                    prox_laranja.push_back(v);
                }
            }
        }
        front_azul.swap(prox_azul);
        front_laranja.swap(prox_laranja);
    }

    int t_azul = 0, t_laranja = 0;
    for (uint8_t dono_da_celula : dono) {
        if (dono_da_celula == DONO_AZUL) t_azul++;
        else if (dono_da_celula == DONO_LARANJA) t_laranja++;
    }
    return ctx.max_eh_azul ? (t_azul - t_laranja) : (t_laranja - t_azul);
}

int avaliar_fim(const Estado& e, bool max_eh_azul, int rodadas) {
    bool max_vivo = max_eh_azul ? e.vivo_azul : e.vivo_laranja;
    bool min_vivo = max_eh_azul ? e.vivo_laranja : e.vivo_azul;

    if (max_vivo && !min_vivo) return VALOR_VITORIA + rodadas;
    if (!max_vivo && min_vivo) return -VALOR_VITORIA - rodadas;
    return VALOR_EMPATE;
}

int valor_no_maximizador(Contexto& ctx, Estado& e, int rodadas, int alfa, int beta);
int valor_no_minimizador(Contexto& ctx, Estado& e, int mov_max, int rodadas, int alfa, int beta);

int valor_no_minimizador(Contexto& ctx, Estado& e, int mov_max, int rodadas, int alfa, int beta) {
    ctx.nos_visitados++;
    Movimentos movs = movimentos_possiveis(*ctx.tabelas, e, !ctx.max_eh_azul);
    int menor_valor = INF;

    for (int i = 0; i < movs.quantidade; ++i) {
        int m_azul = ctx.max_eh_azul ? mov_max : movs.direcoes[i];
        int m_laranja = ctx.max_eh_azul ? movs.direcoes[i] : mov_max;

        Reversao rev = fazer_rodada(*ctx.tabelas, e, m_azul, m_laranja);
        int val = valor_no_maximizador(ctx, e, rodadas - 1, alfa, beta);
        desfazer_rodada(e, rev);

        menor_valor = min(menor_valor, val);
        if (ctx.poda) {
            beta = min(beta, menor_valor);
            if (alfa >= beta) {
                ctx.ramos_podados += movs.quantidade - i - 1;
                break;
            }
        }
    }
    return menor_valor;
}

int valor_no_maximizador(Contexto& ctx, Estado& e, int rodadas, int alfa, int beta) {
    ctx.nos_visitados++;

    if (!e.vivo_azul || !e.vivo_laranja) return avaliar_fim(e, ctx.max_eh_azul, rodadas);
    if (rodadas == 0) return calcular_territorios(ctx, e);

    Movimentos movs = movimentos_possiveis(*ctx.tabelas, e, ctx.max_eh_azul);
    int melhor_valor = -INF;

    for (int i = 0; i < movs.quantidade; ++i) {
        int val = valor_no_minimizador(ctx, e, movs.direcoes[i], rodadas, alfa, beta);
        melhor_valor = max(melhor_valor, val);

        if (ctx.poda) {
            alfa = max(alfa, melhor_valor);
            if (alfa >= beta) {
                ctx.ramos_podados += movs.quantidade - i - 1;
                break;
            }
        }
    }
    return melhor_valor;
}

extern "C" {
    EXPORTAR_PARA_O_PYTHON int versao_da_interface_cpp() {
        return VERSAO_DA_INTERFACE;
    }

    EXPORTAR_PARA_O_PYTHON void buscar_melhor_movimento_cpp(
        int tamanho, const uint8_t* celulas_ptr,
        int pos_azul, int pos_laranja,
        bool vivo_azul, bool vivo_laranja,
        int ultimo_mov_azul, int ultimo_mov_laranja,
        bool max_eh_azul, int profundidade, bool usar_poda,
        int* out_melhor_mov, int* out_valor, int* out_nos, int* out_podas
    ) {
        const Tabelas tabelas = criar_tabelas(tamanho);

        Estado e;
        e.tamanho = tamanho;
        e.celulas.assign(celulas_ptr, celulas_ptr + (tamanho * tamanho));
        e.pos_azul = pos_azul;
        e.pos_laranja = pos_laranja;
        e.vivo_azul = vivo_azul;
        e.vivo_laranja = vivo_laranja;
        e.ultimo_mov_azul = ultimo_mov_azul;
        e.ultimo_mov_laranja = ultimo_mov_laranja;

        int quantidade_de_celulas = tamanho * tamanho;
        Movimentos movs = movimentos_possiveis(tabelas, e, max_eh_azul);
        *out_melhor_mov = movs.direcoes[0];

        if (!e.vivo_azul || !e.vivo_laranja || profundidade == 0) {
            Contexto ctx(&tabelas, quantidade_de_celulas, max_eh_azul, usar_poda);
            *out_valor = valor_no_maximizador(ctx, e, profundidade, -INF, INF);
            *out_nos = ctx.nos_visitados;
            *out_podas = ctx.ramos_podados;
            return;
        }

        vector<future<ResultadoDoRamo>> futuros;
        for (int i = 0; i < movs.quantidade; ++i) {
            int mov = movs.direcoes[i];
            futuros.push_back(async(launch::async, [&tabelas, e, mov, profundidade, max_eh_azul, usar_poda, quantidade_de_celulas]() mutable {
                Contexto ctx(&tabelas, quantidade_de_celulas, max_eh_azul, usar_poda);
                int val = valor_no_minimizador(ctx, e, mov, profundidade, -INF, INF);
                return ResultadoDoRamo{val, ctx.nos_visitados, ctx.ramos_podados};
            }));
        }

        int melhor_valor = -INF;
        int total_nos = 1;
        int total_podas = 0;
        for (int i = 0; i < movs.quantidade; ++i) {
            ResultadoDoRamo resultado = futuros[i].get();
            total_nos += resultado.nos_visitados;
            total_podas += resultado.ramos_podados;
            if (resultado.valor > melhor_valor) {
                melhor_valor = resultado.valor;
                *out_melhor_mov = movs.direcoes[i];
            }
        }

        *out_valor = melhor_valor;
        *out_nos = total_nos;
        *out_podas = total_podas;
    }
}
