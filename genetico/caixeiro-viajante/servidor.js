import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const PASTA_DO_PROJETO = fileURLToPath(new URL('.', import.meta.url));
const PORTA = Number(process.env.PORT ?? process.argv[2] ?? 8000);

const TIPOS_DE_CONTEUDO = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function caminhoDoArquivoPedido(urlDoPedido) {
  const caminhoDaUrl = decodeURIComponent(new URL(urlDoPedido, 'http://localhost').pathname);
  const caminhoRelativo = caminhoDaUrl.endsWith('/') ? `${caminhoDaUrl}index.html` : caminhoDaUrl;
  const caminhoCompleto = normalize(join(PASTA_DO_PROJETO, caminhoRelativo));
  const pastaComSeparador = PASTA_DO_PROJETO.endsWith(sep) ? PASTA_DO_PROJETO : PASTA_DO_PROJETO + sep;
  return caminhoCompleto.startsWith(pastaComSeparador) ? caminhoCompleto : null;
}

const servidor = createServer(async (pedido, resposta) => {
  const caminhoDoArquivo = caminhoDoArquivoPedido(pedido.url);
  if (!caminhoDoArquivo) {
    resposta.writeHead(403).end('Acesso negado');
    return;
  }
  try {
    const conteudo = await readFile(caminhoDoArquivo);
    const tipoDeConteudo = TIPOS_DE_CONTEUDO[extname(caminhoDoArquivo)] ?? 'application/octet-stream';
    resposta.writeHead(200, { 'Content-Type': tipoDeConteudo, 'Cache-Control': 'no-cache' }).end(conteudo);
  } catch {
    resposta.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Arquivo não encontrado');
  }
});

servidor.listen(PORTA, () => {
  console.log(`Caixeiro Viajante rodando em http://localhost:${PORTA}`);
  console.log('Pressione Ctrl+C para parar.');
});
