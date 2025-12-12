import os
from math import ceil

# pasta raiz (use "." se executar o script na pasta "geral")
PASTA_RAIZ = "."
BASE_SAIDA = "codigo_unificado_parte"
EXTENSAO_CODIGO = "txt"   # pode trocar para "py" se quiser
MAX_PARTES = 4
ARQUIVO_MAPA = "mapeamento_pastas_arquivos.txt"

def coletar_arquivos_py(pasta_raiz: str):
    arquivos = []
    for raiz, _, files in os.walk(pasta_raiz):
        for nome in files:
            if nome.endswith(".py"):
                caminho = os.path.join(raiz, nome)
                # evita incluir o próprio script
                if os.path.abspath(caminho) != os.path.abspath(__file__):
                    arquivos.append(caminho)
    return arquivos

def gerar_mapa_diretorios(pasta_raiz: str, caminho_saida: str):
    linhas = []
    pasta_raiz_abs = os.path.abspath(pasta_raiz)

    for raiz, dirs, files in os.walk(pasta_raiz):
        nivel = os.path.relpath(raiz, pasta_raiz_abs).count(os.sep)
        indent = "    " * nivel
        rel_raiz = os.path.relpath(raiz, pasta_raiz_abs)
        if rel_raiz == ".":
            rel_raiz = os.path.basename(pasta_raiz_abs)
        linhas.append(f"{indent}[DIR] {rel_raiz}\n")
        sub_indent = "    " * (nivel + 1)
        for d in sorted(dirs):
            linhas.append(f"{sub_indent}[DIR] {d}\n")
        for f in sorted(files):
            linhas.append(f"{sub_indent}[FILE] {f}\n")
        linhas.append("\n")

    with open(caminho_saida, "w", encoding="utf-8") as f:
        f.writelines(linhas)

def main():
    # 1) coletar todos os .py
    arquivos_py = coletar_arquivos_py(PASTA_RAIZ)

    if not arquivos_py:
        print("Nenhum arquivo .py encontrado.")
        return

    # 2) juntar todo o código em uma lista de linhas
    todas_linhas = []
    pasta_abs = os.path.abspath(PASTA_RAIZ)

    for caminho in arquivos_py:
        rel = os.path.relpath(caminho, pasta_abs)
        todas_linhas.append(f"# ==== ARQUIVO: {rel} ====\n")
        with open(caminho, "r", encoding="utf-8") as f:
            todas_linhas.extend(f.readlines())
        todas_linhas.append("\n")

    total_linhas = len(todas_linhas)
    tamanho_parte = ceil(total_linhas / MAX_PARTES)

    # 3) gerar arquivos unificados (até MAX_PARTES)
    for i in range(MAX_PARTES):
        inicio = i * tamanho_parte
        fim = min((i + 1) * tamanho_parte, total_linhas)
        if inicio >= total_linhas:
            break

        nome_saida = f"{BASE_SAIDA}_{i+1}.{EXTENSAO_CODIGO}"
        with open(nome_saida, "w", encoding="utf-8") as f:
            f.writelines(todas_linhas[inicio:fim])
        print(f"Gerado: {nome_saida} ({fim - inicio} linhas)")

    # 4) gerar mapeamento de pastas e arquivos
    gerar_mapa_diretorios(PASTA_RAIZ, ARQUIVO_MAPA)
    print(f"Mapa de pastas e arquivos gerado em: {ARQUIVO_MAPA}")

if __name__ == "__main__":
    main()
