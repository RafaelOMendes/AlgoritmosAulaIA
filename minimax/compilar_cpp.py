import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from logica.minimax_cpp_wrapper import (
    CAMINHO_DA_BIBLIOTECA,
    BibliotecaCppIndisponivel,
    carregar_biblioteca_cpp,
)

ARQUIVO_FONTE = Path(__file__).resolve().parent / "logica" / "minimax.cpp"
PASTA_DOS_PROGRAMAS_32_BITS = Path(os.environ.get("ProgramFiles(x86)", r"C:\Program Files (x86)"))
CAMINHO_DO_VSWHERE = PASTA_DOS_PROGRAMAS_32_BITS / "Microsoft Visual Studio" / "Installer" / "vswhere.exe"
COMPONENTE_DO_COMPILADOR_CPP = "Microsoft.VisualStudio.Component.VC.Tools.x86.x64"


def encontrar_ambiente_do_visual_studio() -> Path:
    if not CAMINHO_DO_VSWHERE.exists():
        raise SystemExit(
            "Não encontrei o Visual Studio. Instale as 'Ferramentas de Build do Visual Studio' "
            "com a carga de trabalho 'Desenvolvimento para desktop com C++'."
        )
    resultado = subprocess.run(
        [
            str(CAMINHO_DO_VSWHERE),
            "-latest",
            "-products",
            "*",
            "-requires",
            COMPONENTE_DO_COMPILADOR_CPP,
            "-property",
            "installationPath",
        ],
        capture_output=True,
        text=True,
        check=True,
    )
    pasta_da_instalacao = resultado.stdout.strip()
    if not pasta_da_instalacao:
        raise SystemExit("O Visual Studio foi encontrado, mas sem o compilador C++ (MSVC x64).")
    return Path(pasta_da_instalacao) / "VC" / "Auxiliary" / "Build" / "vcvars64.bat"


def compilar_no_windows(pasta_temporaria: Path) -> Path:
    ambiente_do_visual_studio = encontrar_ambiente_do_visual_studio()
    roteiro_de_compilacao = pasta_temporaria / "compilar.bat"
    roteiro_de_compilacao.write_text(
        "@echo off\n"
        f'set "PATH=%PATH%;{CAMINHO_DO_VSWHERE.parent}"\n'
        f'call "{ambiente_do_visual_studio}" >nul\n'
        f'cl /nologo /LD /O2 /EHsc /MT /std:c++17 "{ARQUIVO_FONTE}" /Fe:{CAMINHO_DA_BIBLIOTECA.name}\n',
        encoding="utf-8",
    )
    subprocess.run(["cmd", "/c", str(roteiro_de_compilacao)], cwd=pasta_temporaria, check=True)
    return pasta_temporaria / CAMINHO_DA_BIBLIOTECA.name


def compilar_no_linux(pasta_temporaria: Path) -> Path:
    biblioteca_compilada = pasta_temporaria / CAMINHO_DA_BIBLIOTECA.name
    try:
        subprocess.run(
            ["g++", "-shared", "-fPIC", "-O3", "-std=c++17", "-pthread", str(ARQUIVO_FONTE), "-o", str(biblioteca_compilada)],
            check=True,
        )
    except FileNotFoundError:
        raise SystemExit("Não encontrei o g++. No Ubuntu/WSL, instale com: sudo apt install g++")
    return biblioteca_compilada


def compilar() -> None:
    with tempfile.TemporaryDirectory() as pasta:
        pasta_temporaria = Path(pasta)
        try:
            if sys.platform == "win32":
                biblioteca_compilada = compilar_no_windows(pasta_temporaria)
            else:
                biblioteca_compilada = compilar_no_linux(pasta_temporaria)
        except subprocess.CalledProcessError:
            raise SystemExit("A compilação falhou. Veja as mensagens do compilador acima.")
        try:
            shutil.copyfile(biblioteca_compilada, CAMINHO_DA_BIBLIOTECA)
        except PermissionError:
            raise SystemExit(f"Não consegui substituir {CAMINHO_DA_BIBLIOTECA.name}. Feche o servidor e tente de novo.")

    try:
        carregar_biblioteca_cpp()
    except BibliotecaCppIndisponivel as erro:
        raise SystemExit(f"A biblioteca foi compilada, mas não carregou: {erro}")
    print(f"Biblioteca do modo turbo pronta: {CAMINHO_DA_BIBLIOTECA}")


if __name__ == "__main__":
    compilar()
