export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      abatimentos_debito: {
        Row: {
          id: string
          debito_id: string
          mes_referencia: string
          valor_abatido: number
          repasse_id: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          debito_id: string
          mes_referencia: string
          valor_abatido: number
          repasse_id?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          debito_id?: string
          mes_referencia?: string
          valor_abatido?: number
          repasse_id?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "abatimentos_debito_debito_id_fkey"
            columns: ["debito_id"]
            isOneToOne: false
            referencedRelation: "debito_parceiro"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abatimentos_debito_repasse_id_fkey"
            columns: ["repasse_id"]
            isOneToOne: false
            referencedRelation: "repasses_mensais"
            referencedColumns: ["id"]
          },
        ]
      }
      clinicas_parceiras: {
        Row: {
          id: string
          nome: string
          cnpj: string | null
          responsavel: string | null
          email: string | null
          telefone: string | null
          custo_mao_de_obra: number
          percentual_split: number
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nome: string
          cnpj?: string | null
          responsavel?: string | null
          email?: string | null
          telefone?: string | null
          custo_mao_de_obra?: number
          percentual_split?: number
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nome?: string
          cnpj?: string | null
          responsavel?: string | null
          email?: string | null
          telefone?: string | null
          custo_mao_de_obra?: number
          percentual_split?: number
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      categorias_despesa: {
        Row: {
          id: string
          nome: string
          ativo: boolean
          created_at: string
        }
        Insert: {
          id?: string
          nome: string
          ativo?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          nome?: string
          ativo?: boolean
          created_at?: string
        }
        Relationships: []
      }
      comissoes_dentista: {
        Row: {
          id: string
          clinica_id: string
          mes_referencia: string
          qtde_vendas: number
          tier_aplicado: number
          percentual: number
          base_calculo: number
          valor_comissao: number
          status: string
          data_pagamento: string | null
          observacao: string | null
          config_id: string | null
          dentista_id: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          clinica_id: string
          mes_referencia: string
          qtde_vendas: number
          tier_aplicado: number
          percentual: number
          base_calculo: number
          valor_comissao: number
          status?: string
          data_pagamento?: string | null
          observacao?: string | null
          config_id?: string | null
          dentista_id?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          clinica_id?: string
          mes_referencia?: string
          qtde_vendas?: number
          tier_aplicado?: number
          percentual?: number
          base_calculo?: number
          valor_comissao?: number
          status?: string
          data_pagamento?: string | null
          observacao?: string | null
          config_id?: string | null
          dentista_id?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comissoes_dentista_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinicas_parceiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comissoes_dentista_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "config_comissao_dentista"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comissoes_dentista_dentista_id_fkey"
            columns: ["dentista_id"]
            isOneToOne: false
            referencedRelation: "dentistas"
            referencedColumns: ["id"]
          },
        ]
      }
      config_comissao_dentista: {
        Row: {
          id: string
          tier1_limite: number
          tier1_percentual: number
          tier2_limite: number
          tier2_percentual: number
          tier3_percentual: number
          vigencia_inicio: string
          vigencia_fim: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          tier1_limite?: number
          tier1_percentual?: number
          tier2_limite?: number
          tier2_percentual?: number
          tier3_percentual?: number
          vigencia_inicio?: string
          vigencia_fim?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          tier1_limite?: number
          tier1_percentual?: number
          tier2_limite?: number
          tier2_percentual?: number
          tier3_percentual?: number
          vigencia_inicio?: string
          vigencia_fim?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      configuracoes_financeiras: {
        Row: {
          id: string
          taxa_cartao_percentual: number
          imposto_nf_percentual: number
          percentual_beauty_smile: number
          vigencia_inicio: string
          vigencia_fim: string | null
          created_at: string
        }
        Insert: {
          id?: string
          taxa_cartao_percentual: number
          imposto_nf_percentual: number
          percentual_beauty_smile?: number
          vigencia_inicio: string
          vigencia_fim?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          taxa_cartao_percentual?: number
          imposto_nf_percentual?: number
          percentual_beauty_smile?: number
          vigencia_inicio?: string
          vigencia_fim?: string | null
          created_at?: string
        }
        Relationships: []
      }
      debito_parceiro: {
        Row: {
          id: string
          clinica_id: string
          descricao: string
          valor_total: number
          valor_pago: number
          data_inicio: string
          status: string
          created_at: string | null
        }
        Insert: {
          id?: string
          clinica_id: string
          descricao: string
          valor_total: number
          valor_pago?: number
          data_inicio: string
          status?: string
          created_at?: string | null
        }
        Update: {
          id?: string
          clinica_id?: string
          descricao?: string
          valor_total?: number
          valor_pago?: number
          data_inicio?: string
          status?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "debito_parceiro_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinicas_parceiras"
            referencedColumns: ["id"]
          },
        ]
      }
      dentistas: {
        Row: {
          id: string
          clinica_id: string
          nome: string
          email: string | null
          telefone: string | null
          ativo: boolean
          created_at: string | null
        }
        Insert: {
          id?: string
          clinica_id: string
          nome: string
          email?: string | null
          telefone?: string | null
          ativo?: boolean
          created_at?: string | null
        }
        Update: {
          id?: string
          clinica_id?: string
          nome?: string
          email?: string | null
          telefone?: string | null
          ativo?: boolean
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dentistas_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinicas_parceiras"
            referencedColumns: ["id"]
          },
        ]
      }
      despesas_operacionais: {
        Row: {
          id: string
          clinica_id: string
          mes_referencia: string
          categoria_id: string
          descricao: string | null
          valor: number
          recorrente: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          clinica_id: string
          mes_referencia: string
          categoria_id: string
          descricao?: string | null
          valor: number
          recorrente?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          clinica_id?: string
          mes_referencia?: string
          categoria_id?: string
          descricao?: string | null
          valor?: number
          recorrente?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "despesas_operacionais_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinicas_parceiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "despesas_operacionais_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_despesa"
            referencedColumns: ["id"]
          },
        ]
      }
      itens_orcamento: {
        Row: {
          id: string
          orcamento_fechado_id: string
          clinica_id: string
          procedimento_id: string | null
          procedimento_nome_original: string
          quantidade: number
          valor_tabela: number
          valor_proporcional: number
          categoria: string | null
          match_status: string
          created_at: string
        }
        Insert: {
          id?: string
          orcamento_fechado_id: string
          clinica_id: string
          procedimento_id?: string | null
          procedimento_nome_original: string
          quantidade?: number
          valor_tabela?: number
          valor_proporcional?: number
          categoria?: string | null
          match_status?: string
          created_at?: string
        }
        Update: {
          id?: string
          orcamento_fechado_id?: string
          clinica_id?: string
          procedimento_id?: string | null
          procedimento_nome_original?: string
          quantidade?: number
          valor_tabela?: number
          valor_proporcional?: number
          categoria?: string | null
          match_status?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "itens_orcamento_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinicas_parceiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_orcamento_orcamento_fechado_id_fkey"
            columns: ["orcamento_fechado_id"]
            isOneToOne: false
            referencedRelation: "orcamentos_fechados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_orcamento_procedimento_id_fkey"
            columns: ["procedimento_id"]
            isOneToOne: false
            referencedRelation: "procedimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      medicos_indicadores: {
        Row: {
          id: string
          nome: string
          clinica_id: string
          percentual_comissao: number
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nome: string
          clinica_id: string
          percentual_comissao?: number
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nome?: string
          clinica_id?: string
          percentual_comissao?: number
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medicos_indicadores_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinicas_parceiras"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamentos_abertos: {
        Row: {
          id: string
          clinica_id: string
          mes_referencia: string
          paciente_nome: string
          valor_total: number
          status: string | null
          data_criacao: string | null
          upload_batch_id: string | null
          created_at: string
          profissional: string | null
          data_fechamento: string | null
        }
        Insert: {
          id?: string
          clinica_id: string
          mes_referencia: string
          paciente_nome: string
          valor_total: number
          status?: string | null
          data_criacao?: string | null
          upload_batch_id?: string | null
          created_at?: string
          profissional?: string | null
          data_fechamento?: string | null
        }
        Update: {
          id?: string
          clinica_id?: string
          mes_referencia?: string
          paciente_nome?: string
          valor_total?: number
          status?: string | null
          data_criacao?: string | null
          upload_batch_id?: string | null
          created_at?: string
          profissional?: string | null
          data_fechamento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orcamentos_abertos_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinicas_parceiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_abertos_upload_batch_id_fkey"
            columns: ["upload_batch_id"]
            isOneToOne: false
            referencedRelation: "upload_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamentos_fechados: {
        Row: {
          id: string
          clinica_id: string
          mes_referencia: string
          paciente_nome: string
          valor_total: number
          valor_pago: number
          valor_em_aberto: number | null
          status: Database["public"]["Enums"]["status_orcamento"]
          medico_indicador_id: string | null
          data_fechamento: string | null
          upload_batch_id: string | null
          created_at: string
          profissional: string | null
          paciente_telefone: string | null
          procedimentos_texto: string | null
          valor_bruto: number | null
          desconto_percentual: number | null
          desconto_reais: number | null
          observacoes: string | null
          tem_indicacao: boolean
          split_status: string | null
        }
        Insert: {
          id?: string
          clinica_id: string
          mes_referencia: string
          paciente_nome: string
          valor_total: number
          valor_pago?: number
          status?: Database["public"]["Enums"]["status_orcamento"]
          medico_indicador_id?: string | null
          data_fechamento?: string | null
          upload_batch_id?: string | null
          created_at?: string
          profissional?: string | null
          paciente_telefone?: string | null
          procedimentos_texto?: string | null
          valor_bruto?: number | null
          desconto_percentual?: number | null
          desconto_reais?: number | null
          observacoes?: string | null
          tem_indicacao?: boolean
          split_status?: string | null
        }
        Update: {
          id?: string
          clinica_id?: string
          mes_referencia?: string
          paciente_nome?: string
          valor_total?: number
          valor_pago?: number
          status?: Database["public"]["Enums"]["status_orcamento"]
          medico_indicador_id?: string | null
          data_fechamento?: string | null
          upload_batch_id?: string | null
          created_at?: string
          profissional?: string | null
          paciente_telefone?: string | null
          procedimentos_texto?: string | null
          valor_bruto?: number | null
          desconto_percentual?: number | null
          desconto_reais?: number | null
          observacoes?: string | null
          tem_indicacao?: boolean
          split_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orcamentos_fechados_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinicas_parceiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_fechados_medico_indicador_id_fkey"
            columns: ["medico_indicador_id"]
            isOneToOne: false
            referencedRelation: "medicos_indicadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_fechados_upload_batch_id_fkey"
            columns: ["upload_batch_id"]
            isOneToOne: false
            referencedRelation: "upload_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      pagamentos: {
        Row: {
          id: string
          orcamento_fechado_id: string
          clinica_id: string
          valor: number
          forma: Database["public"]["Enums"]["forma_pagamento"]
          parcelas: number
          data_pagamento: string
          registrado_por: string | null
          bandeira: string | null
          created_at: string
        }
        Insert: {
          id?: string
          orcamento_fechado_id: string
          clinica_id: string
          valor: number
          forma: Database["public"]["Enums"]["forma_pagamento"]
          parcelas?: number
          data_pagamento: string
          registrado_por?: string | null
          bandeira?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          orcamento_fechado_id?: string
          clinica_id?: string
          valor?: number
          forma?: Database["public"]["Enums"]["forma_pagamento"]
          parcelas?: number
          data_pagamento?: string
          registrado_por?: string | null
          bandeira?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pagamentos_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinicas_parceiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagamentos_orcamento_fechado_id_fkey"
            columns: ["orcamento_fechado_id"]
            isOneToOne: false
            referencedRelation: "orcamentos_fechados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagamentos_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pagamentos_comissao: {
        Row: {
          id: string
          medico_indicador_id: string
          clinica_id: string
          mes_referencia: string
          valor_comissao: number
          status: string
          data_pagamento: string | null
          observacao: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          medico_indicador_id: string
          clinica_id: string
          mes_referencia: string
          valor_comissao: number
          status?: string
          data_pagamento?: string | null
          observacao?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          medico_indicador_id?: string
          clinica_id?: string
          mes_referencia?: string
          valor_comissao?: number
          status?: string
          data_pagamento?: string | null
          observacao?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pagamentos_comissao_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinicas_parceiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagamentos_comissao_medico_indicador_id_fkey"
            columns: ["medico_indicador_id"]
            isOneToOne: false
            referencedRelation: "medicos_indicadores"
            referencedColumns: ["id"]
          },
        ]
      }
      parcelas_cartao: {
        Row: {
          id: string
          pagamento_id: string
          clinica_id: string
          parcela_numero: number
          total_parcelas: number
          valor_parcela: number
          mes_recebimento: string
          status: Database["public"]["Enums"]["status_parcela"]
          created_at: string
        }
        Insert: {
          id?: string
          pagamento_id: string
          clinica_id: string
          parcela_numero: number
          total_parcelas: number
          valor_parcela: number
          mes_recebimento: string
          status?: Database["public"]["Enums"]["status_parcela"]
          created_at?: string
        }
        Update: {
          id?: string
          pagamento_id?: string
          clinica_id?: string
          parcela_numero?: number
          total_parcelas?: number
          valor_parcela?: number
          mes_recebimento?: string
          status?: Database["public"]["Enums"]["status_parcela"]
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "parcelas_cartao_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinicas_parceiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parcelas_cartao_pagamento_id_fkey"
            columns: ["pagamento_id"]
            isOneToOne: false
            referencedRelation: "pagamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      procedimentos: {
        Row: {
          id: string
          nome: string
          codigo_clinicorp: string | null
          custo_fixo: number
          categoria: string | null
          ativo: boolean
          created_at: string
          valor_tabela: number | null
        }
        Insert: {
          id?: string
          nome: string
          codigo_clinicorp?: string | null
          custo_fixo?: number
          categoria?: string | null
          ativo?: boolean
          created_at?: string
          valor_tabela?: number | null
        }
        Update: {
          id?: string
          nome?: string
          codigo_clinicorp?: string | null
          custo_fixo?: number
          categoria?: string | null
          ativo?: boolean
          created_at?: string
          valor_tabela?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          email: string | null
          nome: string | null
          role: string
          clinica_id: string | null
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          nome?: string | null
          role: string
          clinica_id?: string | null
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          nome?: string | null
          role?: string
          clinica_id?: string | null
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinicas_parceiras"
            referencedColumns: ["id"]
          },
        ]
      }
      repasses_mensais: {
        Row: {
          id: string
          clinica_id: string
          mes_referencia: string
          valor_repasse: number
          data_transferencia: string
          observacao: string | null
          status: string
          created_at: string | null
        }
        Insert: {
          id?: string
          clinica_id: string
          mes_referencia: string
          valor_repasse: number
          data_transferencia: string
          observacao?: string | null
          status?: string
          created_at?: string | null
        }
        Update: {
          id?: string
          clinica_id?: string
          mes_referencia?: string
          valor_repasse?: number
          data_transferencia?: string
          observacao?: string | null
          status?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "repasses_mensais_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinicas_parceiras"
            referencedColumns: ["id"]
          },
        ]
      }
      resumo_mensal: {
        Row: {
          id: string
          clinica_id: string
          mes_referencia: string
          faturamento_bruto: number
          total_custos_procedimentos: number
          total_custo_mao_obra: number
          total_taxa_cartao: number
          total_imposto_nf: number
          total_comissoes_medicas: number
          valor_liquido: number
          valor_beauty_smile: number
          valor_clinica: number
          total_recebido_mes: number
          total_a_receber_mes: number
          total_inadimplente: number
          total_recebimentos_futuros: number
          status: Database["public"]["Enums"]["status_resumo"]
          calculado_em: string
          recalculado_em: string | null
          fechado_em: string | null
          fechado_por: string | null
        }
        Insert: {
          id?: string
          clinica_id: string
          mes_referencia: string
          faturamento_bruto?: number
          total_custos_procedimentos?: number
          total_custo_mao_obra?: number
          total_taxa_cartao?: number
          total_imposto_nf?: number
          total_comissoes_medicas?: number
          valor_liquido?: number
          valor_beauty_smile?: number
          valor_clinica?: number
          total_recebido_mes?: number
          total_a_receber_mes?: number
          total_inadimplente?: number
          total_recebimentos_futuros?: number
          status?: Database["public"]["Enums"]["status_resumo"]
          calculado_em?: string
          recalculado_em?: string | null
          fechado_em?: string | null
          fechado_por?: string | null
        }
        Update: {
          id?: string
          clinica_id?: string
          mes_referencia?: string
          faturamento_bruto?: number
          total_custos_procedimentos?: number
          total_custo_mao_obra?: number
          total_taxa_cartao?: number
          total_imposto_nf?: number
          total_comissoes_medicas?: number
          valor_liquido?: number
          valor_beauty_smile?: number
          valor_clinica?: number
          total_recebido_mes?: number
          total_a_receber_mes?: number
          total_inadimplente?: number
          total_recebimentos_futuros?: number
          status?: Database["public"]["Enums"]["status_resumo"]
          calculado_em?: string
          recalculado_em?: string | null
          fechado_em?: string | null
          fechado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resumo_mensal_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinicas_parceiras"
            referencedColumns: ["id"]
          },
        ]
      }
      taxas_cartao_reais: {
        Row: {
          id: string
          modalidade: string
          bandeira: string
          numero_parcelas: number | null
          taxa_percentual: number
          vigencia_inicio: string
          vigencia_fim: string | null
          created_at: string
        }
        Insert: {
          id?: string
          modalidade: string
          bandeira?: string
          numero_parcelas?: number | null
          taxa_percentual: number
          vigencia_inicio?: string
          vigencia_fim?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          modalidade?: string
          bandeira?: string
          numero_parcelas?: number | null
          taxa_percentual?: number
          vigencia_inicio?: string
          vigencia_fim?: string | null
          created_at?: string
        }
        Relationships: []
      }
      tratamentos_executados: {
        Row: {
          id: string
          clinica_id: string
          mes_referencia: string
          paciente_nome: string
          procedimento_id: string | null
          procedimento_nome: string | null
          quantidade: number
          data_execucao: string | null
          upload_batch_id: string | null
          created_at: string
          profissional: string | null
          regiao: string | null
          valor: number | null
        }
        Insert: {
          id?: string
          clinica_id: string
          mes_referencia: string
          paciente_nome: string
          procedimento_id?: string | null
          procedimento_nome?: string | null
          quantidade?: number
          data_execucao?: string | null
          upload_batch_id?: string | null
          created_at?: string
          profissional?: string | null
          regiao?: string | null
          valor?: number | null
        }
        Update: {
          id?: string
          clinica_id?: string
          mes_referencia?: string
          paciente_nome?: string
          procedimento_id?: string | null
          procedimento_nome?: string | null
          quantidade?: number
          data_execucao?: string | null
          upload_batch_id?: string | null
          created_at?: string
          profissional?: string | null
          regiao?: string | null
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tratamentos_executados_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinicas_parceiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tratamentos_executados_procedimento_id_fkey"
            columns: ["procedimento_id"]
            isOneToOne: false
            referencedRelation: "procedimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tratamentos_executados_upload_batch_id_fkey"
            columns: ["upload_batch_id"]
            isOneToOne: false
            referencedRelation: "upload_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      upload_batches: {
        Row: {
          id: string
          clinica_id: string
          mes_referencia: string
          tipo: Database["public"]["Enums"]["tipo_planilha"]
          arquivo_nome: string | null
          total_registros: number | null
          status: Database["public"]["Enums"]["status_upload"]
          uploaded_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          clinica_id: string
          mes_referencia: string
          tipo: Database["public"]["Enums"]["tipo_planilha"]
          arquivo_nome?: string | null
          total_registros?: number | null
          status?: Database["public"]["Enums"]["status_upload"]
          uploaded_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          clinica_id?: string
          mes_referencia?: string
          tipo?: Database["public"]["Enums"]["tipo_planilha"]
          arquivo_nome?: string | null
          total_registros?: number | null
          status?: Database["public"]["Enums"]["status_upload"]
          uploaded_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "upload_batches_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinicas_parceiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upload_batches_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      vw_inadimplentes: {
        Row: {
          orcamento_fechado_id: string | null
          paciente_nome: string | null
          clinica_id: string | null
          clinica_nome: string | null
          valor_total: number | null
          valor_pago: number | null
          valor_em_aberto: number | null
          data_fechamento: string | null
          status: Database["public"]["Enums"]["status_orcamento"] | null
          dias_em_aberto: number | null
        }
        Relationships: []
      }
      vw_recebimentos_futuros: {
        Row: {
          clinica_id: string | null
          clinica_nome: string | null
          mes_recebimento: string | null
          total_projetado: number | null
          total_parcelas: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      auth_clinica_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      auto_receber_parcelas_cartao: {
        Args: {
          p_data_ref?: string
        }
        Returns: number
      }
      estornar_pagamento: {
        Args: {
          p_pagamento_id: string
        }
        Returns: Json
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      registrar_pagamento: {
        Args: {
          p_orcamento_fechado_id: string
          p_valor: number
          p_forma: Database["public"]["Enums"]["forma_pagamento"]
          p_parcelas: number
          p_data_pagamento: string
          p_registrado_por: string
        }
        Returns: Json
      }
    }
    Enums: {
      forma_pagamento:
        | "cartao_credito"
        | "cartao_debito"
        | "pix"
        | "dinheiro"
        | "boleto"
        | "transferencia"
      status_orcamento: "em_aberto" | "parcial" | "quitado"
      status_parcela: "projetado" | "recebido"
      status_resumo: "processado" | "revisao"
      status_upload: "processando" | "concluido" | "erro"
      tipo_planilha:
        | "orcamentos_fechados"
        | "orcamentos_abertos"
        | "tratamentos_executados"
        | "recebimentos"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
