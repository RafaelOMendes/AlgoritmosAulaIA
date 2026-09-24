import json
import os
import sys
from functools import partial
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from logica.api import ROTAS_DA_API, ErroDeRequisicao

PASTA_DO_PROJETO = Path(__file__).resolve().parent
PORTA_PADRAO = 8000
NOME_DO_PROJETO = "Fuga no Labirinto (Minimax)"


class ManipuladorDeRequisicoes(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".html": "text/html; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".js": "text/javascript; charset=utf-8",
        ".json": "application/json; charset=utf-8",
    }

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def _responder_com_json(self, conteudo: dict, situacao: HTTPStatus = HTTPStatus.OK) -> None:
        corpo = json.dumps(conteudo, ensure_ascii=False, allow_nan=False).encode("utf-8")
        self.send_response(situacao)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(corpo)))
        self.end_headers()
        self.wfile.write(corpo)

    def do_POST(self) -> None:
        rota = self.path.split("?", 1)[0]
        tratar_requisicao = ROTAS_DA_API.get(rota)
        if tratar_requisicao is None:
            self._responder_com_json({"erro": "Rota não encontrada."}, HTTPStatus.NOT_FOUND)
            return
        try:
            tamanho_do_corpo = int(self.headers.get("Content-Length", 0))
            dados = json.loads(self.rfile.read(tamanho_do_corpo) or b"{}")
            resposta = tratar_requisicao(dados)
        except (ErroDeRequisicao, KeyError, TypeError, ValueError) as erro:
            self._responder_com_json({"erro": f"Requisição inválida: {erro}"}, HTTPStatus.BAD_REQUEST)
            return
        self._responder_com_json(resposta)

    def log_message(self, formato: str, *argumentos) -> None:
        if not self.path.startswith("/api/"):
            super().log_message(formato, *argumentos)


def iniciar_servidor(porta: int) -> None:
    manipulador = partial(ManipuladorDeRequisicoes, directory=str(PASTA_DO_PROJETO))
    with ThreadingHTTPServer(("localhost", porta), manipulador) as servidor:
        print(f"{NOME_DO_PROJETO} rodando em http://localhost:{porta}")
        print("Pressione Ctrl+C para parar.")
        try:
            servidor.serve_forever()
        except KeyboardInterrupt:
            print("\nServidor encerrado.")


def escolher_porta() -> int:
    if len(sys.argv) > 1:
        return int(sys.argv[1])
    return int(os.environ.get("PORT", PORTA_PADRAO))


if __name__ == "__main__":
    iniciar_servidor(escolher_porta())
