# app/core/reference_data.py
"""
Valores de referência usados pelo EliteDesk.

Aqui centralizamos listas de:
- empresas
- setores
- categorias de ticket
- natureza
- canal
- transportadoras
- prioridade (rótulos P1–P4)
- status (rótulos amigáveis)
"""

from enum import Enum


# =========================
# EMPRESAS
# =========================

class EmpresaEnum(str, Enum):
    ELITE_ACO = "Elite Aço"
    MULTIO = "Multio"
    MULTISERV = "Multiserv"
    RODOELITE = "RodoElite"


EMPRESAS = [e.value for e in EmpresaEnum]


# =========================
# SETORES
# =========================

class SetorEnum(str, Enum):
    VENDAS = "Vendas"
    LOGISTICA = "Logística"
    FINANCEIRO = "Financeiro"
    SAC_CRM = "SAC & CRM"
    CONTABILIDADE = "Contabilidade"
    FISCAL = "Fiscal"
    PRODUCAO = "Produção"
    MANUTENCAO = "Manutenção"
    COMPRAS = "Compras"
    OBRAS = "Obras"
    PPD = "PP&D"


SETORES = [s.value for s in SetorEnum]


# =========================
# CATEGORIAS DE TICKET
# =========================

class CategoriaEnum(str, Enum):
    PROBLEMA_ENTREGA = "Problema na Entrega"
    ARREPENDIMENTO = "Arrependimento"
    AVARIA_TRANSPORTE = "Avaria de Transporte"
    ATRASO_ENTREGA = "Atraso na Entrega"
    CLIENTE_COMPROU_ERRADO = "Cliente Comprou Errado"
    FALTA_TROCA_PECAS = "Falta/Troca de Peças"
    FALTA_ACESSORIOS = "Falta de Acessórios"
    PROBLEMA_QUALIDADE = "Problema de Qualidade"
    PROBLEMA_FISCAL = "Problema Fiscal"
    PROBLEMA_MONTAGEM = "Problema na Montagem"
    PROBLEMA_PAGAMENTO = "Problema no Pagamento"
    RECOBRANCA = "Recobrança"
    INADIMPLENCIA = "Inadimplência"
    ORCAMENTO = "Orçamento"
    COTACAO = "Cotação"
    TREINAMENTO = "Treinamento"
    AUDITORIA = "Auditoria"


CATEGORIAS = [c.value for c in CategoriaEnum]


# =========================
# NATUREZA DO TICKET
# =========================

class NaturezaEnum(str, Enum):
    VENDA = "Venda"
    DEVOLUCAO = "Devolução"
    TROCA = "Troca"
    ASSISTENCIA_TECNICA = "Assistência Técnica"
    REPOSICAO = "Reposição"
    COBRANCA = "Cobrança"
    AJUSTE_ALINHAMENTO = "Ajuste/Alinhamento"


NATUREZAS = [n.value for n in NaturezaEnum]


# =========================
# CANAL
# =========================

class CanalEnum(str, Enum):
    B2B_REPRESENTANTES = "B2B - Representantes"
    B2B_VENDAS_DIRETAS = "B2B - Vendas Diretas"
    B2G_LICITACOES = "B2G - Licitações"
    D2C_AMAZON = "D2C - Amazon"
    D2C_CASAS_BAHIA = "D2C - Casas Bahia"
    D2C_ECOMMERCE_ELITE_ACO = "D2C - Ecommerce Elite Aço"
    D2C_AMERICANAS = "D2C - Americanas"
    D2C_MAGALU = "D2C - Magalu"
    D2C_MERCADO_LIVRE = "D2C - Mercado Livre"
    D2C_SHOPEE = "D2C - Shopee"
    D2C_WEBCONTINENTAL = "D2C - Webcontinental"


CANAIS = [c.value for c in CanalEnum]


# =========================
# TRANSPORTADORAS
# =========================

class TransportadoraEnum(str, Enum):
    ALFA = "ALFA"
    BRASPRESS = "BRASPRESS"
    CORREIOS = "Correios"
    ATUAL = "ATUAL"
    J_T = "J&T"
    MENGUE = "MENGUE"
    MAGALOG = "MAGALOG"
    MIRA = "MIRA"
    RAPAL = "RAPAL"
    RODONAVES = "RODONAVES"
    SOLISTICA = "Solística"
    TJB = "TJB"
    TRANS_IMPERIO = "Trans-Império"
    MERCADO_LIVRE = "Mercado Livre"
    TRANSLOVATO = "Translovato"
    TAP = "TAP"
    JADLOG = "JADLOG"
    MOVIMENTE = "Movimente"


TRANSPORTADORAS = [t.value for t in TransportadoraEnum]


# =========================
# PRIORIDADE (mantendo baixa/media/alta/critica)
# =========================

class PrioridadeEnum(str, Enum):
    BAIXA = "baixa"
    MEDIA = "media"
    ALTA = "alta"
    CRITICA = "critica"


PRIORIDADE_LABELS = {
  PrioridadeEnum.CRITICA.value: "Crítica (P1)",
  PrioridadeEnum.ALTA.value: "Alta (P2)",
  PrioridadeEnum.MEDIA.value: "Média (P3)",
  PrioridadeEnum.BAIXA.value: "Baixa (P4)",
}


# =========================
# STATUS DO TICKET (mantendo strings atuais)
# =========================

class StatusEnum(str, Enum):
    ABERTO = "aberto"
    EM_ATENDIMENTO = "em_atendimento"
    AGUARDANDO = "aguardando"
    CONCLUIDO = "concluido"
    CANCELADO = "cancelado"


STATUS_LABELS = {
    StatusEnum.ABERTO.value: "Aberto",
    StatusEnum.EM_ATENDIMENTO.value: "Em atendimento",
    StatusEnum.AGUARDANDO.value: "Aguardando",
    StatusEnum.CONCLUIDO.value: "Concluído",
    StatusEnum.CANCELADO.value: "Cancelado",
}
