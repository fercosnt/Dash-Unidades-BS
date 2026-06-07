export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      abatimentos_debito: {
        Row: {
          created_at: string | null
          debito_id: string
          id: string
          mes_referencia: string
          repasse_id: string | null
          valor_abatido: number
        }
        Insert: {
          created_at?: string | null
          debito_id: string
          id?: string
          mes_referencia: string
          repasse_id?: string | null
          valor_abatido: number
        }
        Update: {
          created_at?: string | null
          debito_id?: string
          id?: string
          mes_referencia?: string
          repasse_id?: string | null
          valor_abatido?: number
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
      categorias_despesa: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      clinicas_parceiras: {
        Row: {
          ativo: boolean
          clinicorp_business_id: string | null
          clinicorp_subscriber_id: string | null
          clinicorp_token: string | null
          clinicorp_username: string | null
          cnpj: string | null
          created_at: string
          custo_mao_de_obra: number
          email: string | null
          id: string
          nome: string
          percentual_split: number
          responsavel: string | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          clinicorp_business_id?: string | null
          clinicorp_subscriber_id?: string | null
          clinicorp_token?: string | null
          clinicorp_username?: string | null
          cnpj?: string | null
          created_at?: string
          custo_mao_de_obra?: number
          email?: string | null
          id?: string
          nome: string
          percentual_split?: number
          responsavel?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          clinicorp_business_id?: string | null
          clinicorp_subscriber_id?: string | null
          clinicorp_token?: string | null
          clinicorp_username?: string | null
          cnpj?: string | null
          created_at?: string
          custo_mao_de_obra?: number
          email?: string | null
          id?: string
          nome?: string
          percentual_split?: number
          responsavel?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      comissoes_dentista: {
        Row: {
          base_calculo: number
          clinica_id: string
          config_id: string | null
          created_at: string | null
          data_pagamento: string | null
          dentista_id: string | null
          id: string
          mes_referencia: string
          observacao: string | null
          percentual: number
          qtde_vendas: number
          status: string
          tier_aplicado: number
          valor_comissao: number
        }
        Insert: {
          base_calculo: number
          clinica_id: string
          config_id?: string | null
          created_at?: string | null
          data_pagamento?: string | null
          dentista_id?: string | null
          id?: string
          mes_referencia: string
          observacao?: string | null
          percentual: number
          qtde_vendas: number
          status?: string
          tier_aplicado: number
          valor_comissao: number
        }
        Update: {
          base_calculo?: number
          clinica_id?: string
          config_id?: string | null
          created_at?: string | null
          data_pagamento?: string | null
          dentista_id?: string | null
          id?: string
          mes_referencia?: string
          observacao?: string | null
          percentual?: number
          qtde_vendas?: number
          status?: string
          tier_aplicado?: number
          valor_comissao?: number
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
          created_at: string | null
          id: string
          tier1_limite: number
          tier1_percentual: number
          tier2_limite: number
          tier2_percentual: number
          tier3_percentual: number
          vigencia_fim: string | null
          vigencia_inicio: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          tier1_limite?: number
          tier1_percentual?: number
          tier2_limite?: number
          tier2_percentual?: number
          tier3_percentual?: number
          vigencia_fim?: string | null
          vigencia_inicio?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          tier1_limite?: number
          tier1_percentual?: number
          tier2_limite?: number
          tier2_percentual?: number
          tier3_percentual?: number
          vigencia_fim?: string | null
          vigencia_inicio?: string
        }
        Relationships: []
      }
      configuracoes_financeiras: {
        Row: {
          created_at: string
          id: string
          imposto_nf_percentual: number
          percentual_beauty_smile: number
          taxa_cartao_percentual: number
          vigencia_fim: string | null
          vigencia_inicio: string
        }
        Insert: {
          created_at?: string
          id?: string
          imposto_nf_percentual: number
          percentual_beauty_smile?: number
          taxa_cartao_percentual: number
          vigencia_fim?: string | null
          vigencia_inicio: string
        }
        Update: {
          created_at?: string
          id?: string
          imposto_nf_percentual?: number
          percentual_beauty_smile?: number
          taxa_cartao_percentual?: number
          vigencia_fim?: string | null
          vigencia_inicio?: string
        }
        Relationships: []
      }
      debito_parceiro: {
        Row: {
          clinica_id: string
          created_at: string | null
          data_inicio: string
          descricao: string
          id: string
          status: string
          valor_pago: number
          valor_total: number
        }
        Insert: {
          clinica_id: string
          created_at?: string | null
          data_inicio: string
          descricao: string
          id?: string
          status?: string
          valor_pago?: number
          valor_total: number
        }
        Update: {
          clinica_id?: string
          created_at?: string | null
          data_inicio?: string
          descricao?: string
          id?: string
          status?: string
          valor_pago?: number
          valor_total?: number
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
          ativo: boolean
          clinica_id: string
          created_at: string | null
          email: string | null
          id: string
          nome: string
          telefone: string | null
        }
        Insert: {
          ativo?: boolean
          clinica_id: string
          created_at?: string | null
          email?: string | null
          id?: string
          nome: string
          telefone?: string | null
        }
        Update: {
          ativo?: boolean
          clinica_id?: string
          created_at?: string | null
          email?: string | null
          id?: string
          nome?: string
          telefone?: string | null
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
          categoria_id: string
          clinica_id: string
          created_at: string
          descricao: string | null
          id: string
          mes_referencia: string
          recorrente: boolean
          updated_at: string
          valor: number
        }
        Insert: {
          categoria_id: string
          clinica_id: string
          created_at?: string
          descricao?: string | null
          id?: string
          mes_referencia: string
          recorrente?: boolean
          updated_at?: string
          valor: number
        }
        Update: {
          categoria_id?: string
          clinica_id?: string
          created_at?: string
          descricao?: string | null
          id?: string
          mes_referencia?: string
          recorrente?: boolean
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "despesas_operacionais_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_despesa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "despesas_operacionais_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinicas_parceiras"
            referencedColumns: ["id"]
          },
        ]
      }
      itens_orcamento: {
        Row: {
          categoria: string | null
          clinica_id: string
          created_at: string
          id: string
          match_status: string
          orcamento_fechado_id: string
          procedimento_id: string | null
          procedimento_nome_original: string
          quantidade: number
          valor_proporcional: number
          valor_tabela: number
        }
        Insert: {
          categoria?: string | null
          clinica_id: string
          created_at?: string
          id?: string
          match_status?: string
          orcamento_fechado_id: string
          procedimento_id?: string | null
          procedimento_nome_original: string
          quantidade?: number
          valor_proporcional?: number
          valor_tabela?: number
        }
        Update: {
          categoria?: string | null
          clinica_id?: string
          created_at?: string
          id?: string
          match_status?: string
          orcamento_fechado_id?: string
          procedimento_id?: string | null
          procedimento_nome_original?: string
          quantidade?: number
          valor_proporcional?: number
          valor_tabela?: number
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
            foreignKeyName: "itens_orcamento_orcamento_fechado_id_fkey"
            columns: ["orcamento_fechado_id"]
            isOneToOne: false
            referencedRelation: "vw_inadimplentes"
            referencedColumns: ["orcamento_fechado_id"]
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
          ativo: boolean
          clinica_id: string
          created_at: string
          id: string
          nome: string
          percentual_comissao: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          clinica_id: string
          created_at?: string
          id?: string
          nome: string
          percentual_comissao?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          clinica_id?: string
          created_at?: string
          id?: string
          nome?: string
          percentual_comissao?: number
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
          clinica_id: string
          clinicorp_treatment_id: number | null
          created_at: string
          data_criacao: string | null
          data_fechamento: string | null
          id: string
          mes_referencia: string
          origem: string
          paciente_nome: string
          profissional: string | null
          status: string | null
          upload_batch_id: string | null
          valor_total: number
        }
        Insert: {
          clinica_id: string
          clinicorp_treatment_id?: number | null
          created_at?: string
          data_criacao?: string | null
          data_fechamento?: string | null
          id?: string
          mes_referencia: string
          origem?: string
          paciente_nome: string
          profissional?: string | null
          status?: string | null
          upload_batch_id?: string | null
          valor_total: number
        }
        Update: {
          clinica_id?: string
          clinicorp_treatment_id?: number | null
          created_at?: string
          data_criacao?: string | null
          data_fechamento?: string | null
          id?: string
          mes_referencia?: string
          origem?: string
          paciente_nome?: string
          profissional?: string | null
          status?: string | null
          upload_batch_id?: string | null
          valor_total?: number
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
          clinica_id: string
          clinicorp_treatment_id: number | null
          created_at: string
          data_fechamento: string | null
          desconto_percentual: number | null
          desconto_reais: number | null
          id: string
          medico_indicador_id: string | null
          mes_referencia: string
          observacoes: string | null
          origem: string
          paciente_nome: string
          paciente_telefone: string | null
          procedimentos_texto: string | null
          profissional: string | null
          split_status: string | null
          status: Database["public"]["Enums"]["status_orcamento"]
          tem_indicacao: boolean
          upload_batch_id: string | null
          valor_bruto: number | null
          valor_em_aberto: number | null
          valor_pago: number
          valor_total: number
        }
        Insert: {
          clinica_id: string
          clinicorp_treatment_id?: number | null
          created_at?: string
          data_fechamento?: string | null
          desconto_percentual?: number | null
          desconto_reais?: number | null
          id?: string
          medico_indicador_id?: string | null
          mes_referencia: string
          observacoes?: string | null
          origem?: string
          paciente_nome: string
          paciente_telefone?: string | null
          procedimentos_texto?: string | null
          profissional?: string | null
          split_status?: string | null
          status?: Database["public"]["Enums"]["status_orcamento"]
          tem_indicacao?: boolean
          upload_batch_id?: string | null
          valor_bruto?: number | null
          valor_em_aberto?: number | null
          valor_pago?: number
          valor_total: number
        }
        Update: {
          clinica_id?: string
          clinicorp_treatment_id?: number | null
          created_at?: string
          data_fechamento?: string | null
          desconto_percentual?: number | null
          desconto_reais?: number | null
          id?: string
          medico_indicador_id?: string | null
          mes_referencia?: string
          observacoes?: string | null
          origem?: string
          paciente_nome?: string
          paciente_telefone?: string | null
          procedimentos_texto?: string | null
          profissional?: string | null
          split_status?: string | null
          status?: Database["public"]["Enums"]["status_orcamento"]
          tem_indicacao?: boolean
          upload_batch_id?: string | null
          valor_bruto?: number | null
          valor_em_aberto?: number | null
          valor_pago?: number
          valor_total?: number
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
          bandeira: string | null
          clinica_id: string
          clinicorp_payment_id: number | null
          created_at: string
          data_pagamento: string
          forma: Database["public"]["Enums"]["forma_pagamento"]
          id: string
          orcamento_fechado_id: string
          origem: string
          parcelas: number
          registrado_por: string | null
          valor: number
        }
        Insert: {
          bandeira?: string | null
          clinica_id: string
          clinicorp_payment_id?: number | null
          created_at?: string
          data_pagamento: string
          forma: Database["public"]["Enums"]["forma_pagamento"]
          id?: string
          orcamento_fechado_id: string
          origem?: string
          parcelas?: number
          registrado_por?: string | null
          valor: number
        }
        Update: {
          bandeira?: string | null
          clinica_id?: string
          clinicorp_payment_id?: number | null
          created_at?: string
          data_pagamento?: string
          forma?: Database["public"]["Enums"]["forma_pagamento"]
          id?: string
          orcamento_fechado_id?: string
          origem?: string
          parcelas?: number
          registrado_por?: string | null
          valor?: number
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
            foreignKeyName: "pagamentos_orcamento_fechado_id_fkey"
            columns: ["orcamento_fechado_id"]
            isOneToOne: false
            referencedRelation: "vw_inadimplentes"
            referencedColumns: ["orcamento_fechado_id"]
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
      parcelas_cartao: {
        Row: {
          clinica_id: string
          created_at: string
          id: string
          mes_recebimento: string
          pagamento_id: string
          parcela_numero: number
          status: Database["public"]["Enums"]["status_parcela"]
          total_parcelas: number
          valor_parcela: number
        }
        Insert: {
          clinica_id: string
          created_at?: string
          id?: string
          mes_recebimento: string
          pagamento_id: string
          parcela_numero: number
          status?: Database["public"]["Enums"]["status_parcela"]
          total_parcelas: number
          valor_parcela: number
        }
        Update: {
          clinica_id?: string
          created_at?: string
          id?: string
          mes_recebimento?: string
          pagamento_id?: string
          parcela_numero?: number
          status?: Database["public"]["Enums"]["status_parcela"]
          total_parcelas?: number
          valor_parcela?: number
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
          ativo: boolean
          categoria: string | null
          codigo_clinicorp: string | null
          created_at: string
          custo_fixo: number
          id: string
          nome: string
          valor_tabela: number | null
        }
        Insert: {
          ativo?: boolean
          categoria?: string | null
          codigo_clinicorp?: string | null
          created_at?: string
          custo_fixo?: number
          id?: string
          nome: string
          valor_tabela?: number | null
        }
        Update: {
          ativo?: boolean
          categoria?: string | null
          codigo_clinicorp?: string | null
          created_at?: string
          custo_fixo?: number
          id?: string
          nome?: string
          valor_tabela?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          ativo: boolean
          clinica_id: string | null
          created_at: string
          email: string | null
          id: string
          nome: string | null
          role: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          clinica_id?: string | null
          created_at?: string
          email?: string | null
          id: string
          nome?: string | null
          role: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          clinica_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      repasses_mensais: {
        Row: {
          clinica_id: string
          created_at: string | null
          data_transferencia: string
          id: string
          mes_referencia: string
          observacao: string | null
          status: string
          tipo: string
          valor_repasse: number
        }
        Insert: {
          clinica_id: string
          created_at?: string | null
          data_transferencia: string
          id?: string
          mes_referencia: string
          observacao?: string | null
          status?: string
          tipo?: string
          valor_repasse: number
        }
        Update: {
          clinica_id?: string
          created_at?: string | null
          data_transferencia?: string
          id?: string
          mes_referencia?: string
          observacao?: string | null
          status?: string
          tipo?: string
          valor_repasse?: number
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
          calculado_em: string
          clinica_id: string
          faturamento_bruto: number
          fechado_em: string | null
          fechado_por: string | null
          id: string
          mes_referencia: string
          recalculado_em: string | null
          status: Database["public"]["Enums"]["status_resumo"]
          total_a_receber_mes: number
          total_comissoes_medicas: number
          total_custo_mao_obra: number
          total_custos_procedimentos: number
          total_imposto_nf: number
          total_inadimplente: number
          total_recebido_mes: number
          total_recebimentos_futuros: number
          total_taxa_cartao: number
          valor_beauty_smile: number
          valor_clinica: number
          valor_liquido: number
        }
        Insert: {
          calculado_em?: string
          clinica_id: string
          faturamento_bruto?: number
          fechado_em?: string | null
          fechado_por?: string | null
          id?: string
          mes_referencia: string
          recalculado_em?: string | null
          status?: Database["public"]["Enums"]["status_resumo"]
          total_a_receber_mes?: number
          total_comissoes_medicas?: number
          total_custo_mao_obra?: number
          total_custos_procedimentos?: number
          total_imposto_nf?: number
          total_inadimplente?: number
          total_recebido_mes?: number
          total_recebimentos_futuros?: number
          total_taxa_cartao?: number
          valor_beauty_smile?: number
          valor_clinica?: number
          valor_liquido?: number
        }
        Update: {
          calculado_em?: string
          clinica_id?: string
          faturamento_bruto?: number
          fechado_em?: string | null
          fechado_por?: string | null
          id?: string
          mes_referencia?: string
          recalculado_em?: string | null
          status?: Database["public"]["Enums"]["status_resumo"]
          total_a_receber_mes?: number
          total_comissoes_medicas?: number
          total_custo_mao_obra?: number
          total_custos_procedimentos?: number
          total_imposto_nf?: number
          total_inadimplente?: number
          total_recebido_mes?: number
          total_recebimentos_futuros?: number
          total_taxa_cartao?: number
          valor_beauty_smile?: number
          valor_clinica?: number
          valor_liquido?: number
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
      sync_logs: {
        Row: {
          clinica_id: string
          created_at: string
          error_message: string | null
          finished_at: string | null
          id: string
          mes_referencia: string
          orcamentos_abertos_inseridos: number | null
          orcamentos_fechados_inseridos: number | null
          pagamentos_inseridos: number | null
          recalculo_ok: boolean | null
          started_at: string
          status: string
          tratamentos_inseridos: number | null
          trigger: string
        }
        Insert: {
          clinica_id: string
          created_at?: string
          error_message?: string | null
          finished_at?: string | null
          id?: string
          mes_referencia: string
          orcamentos_abertos_inseridos?: number | null
          orcamentos_fechados_inseridos?: number | null
          pagamentos_inseridos?: number | null
          recalculo_ok?: boolean | null
          started_at?: string
          status: string
          tratamentos_inseridos?: number | null
          trigger: string
        }
        Update: {
          clinica_id?: string
          created_at?: string
          error_message?: string | null
          finished_at?: string | null
          id?: string
          mes_referencia?: string
          orcamentos_abertos_inseridos?: number | null
          orcamentos_fechados_inseridos?: number | null
          pagamentos_inseridos?: number | null
          recalculo_ok?: boolean | null
          started_at?: string
          status?: string
          tratamentos_inseridos?: number | null
          trigger?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_logs_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinicas_parceiras"
            referencedColumns: ["id"]
          },
        ]
      }
      taxas_cartao_reais: {
        Row: {
          bandeira: string
          created_at: string
          id: string
          modalidade: string
          numero_parcelas: number | null
          taxa_percentual: number
          vigencia_fim: string | null
          vigencia_inicio: string
        }
        Insert: {
          bandeira?: string
          created_at?: string
          id?: string
          modalidade: string
          numero_parcelas?: number | null
          taxa_percentual?: number
          vigencia_fim?: string | null
          vigencia_inicio?: string
        }
        Update: {
          bandeira?: string
          created_at?: string
          id?: string
          modalidade?: string
          numero_parcelas?: number | null
          taxa_percentual?: number
          vigencia_fim?: string | null
          vigencia_inicio?: string
        }
        Relationships: []
      }
      tratamentos_executados: {
        Row: {
          clinica_id: string
          created_at: string
          data_execucao: string | null
          id: string
          mes_referencia: string
          origem: string
          paciente_nome: string
          procedimento_id: string | null
          procedimento_nome: string | null
          profissional: string | null
          quantidade: number
          regiao: string | null
          upload_batch_id: string | null
          valor: number | null
        }
        Insert: {
          clinica_id: string
          created_at?: string
          data_execucao?: string | null
          id?: string
          mes_referencia: string
          origem?: string
          paciente_nome: string
          procedimento_id?: string | null
          procedimento_nome?: string | null
          profissional?: string | null
          quantidade?: number
          regiao?: string | null
          upload_batch_id?: string | null
          valor?: number | null
        }
        Update: {
          clinica_id?: string
          created_at?: string
          data_execucao?: string | null
          id?: string
          mes_referencia?: string
          origem?: string
          paciente_nome?: string
          procedimento_id?: string | null
          procedimento_nome?: string | null
          profissional?: string | null
          quantidade?: number
          regiao?: string | null
          upload_batch_id?: string | null
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
          arquivo_nome: string | null
          clinica_id: string
          created_at: string
          id: string
          mes_referencia: string
          status: Database["public"]["Enums"]["status_upload"]
          tipo: Database["public"]["Enums"]["tipo_planilha"]
          total_registros: number | null
          uploaded_by: string | null
        }
        Insert: {
          arquivo_nome?: string | null
          clinica_id: string
          created_at?: string
          id?: string
          mes_referencia: string
          status?: Database["public"]["Enums"]["status_upload"]
          tipo: Database["public"]["Enums"]["tipo_planilha"]
          total_registros?: number | null
          uploaded_by?: string | null
        }
        Update: {
          arquivo_nome?: string | null
          clinica_id?: string
          created_at?: string
          id?: string
          mes_referencia?: string
          status?: Database["public"]["Enums"]["status_upload"]
          tipo?: Database["public"]["Enums"]["tipo_planilha"]
          total_registros?: number | null
          uploaded_by?: string | null
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
          clinica_id: string | null
          clinica_nome: string | null
          data_fechamento: string | null
          dias_em_aberto: number | null
          orcamento_fechado_id: string | null
          paciente_nome: string | null
          status: Database["public"]["Enums"]["status_orcamento"] | null
          valor_em_aberto: number | null
          valor_pago: number | null
          valor_total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orcamentos_fechados_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinicas_parceiras"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_recebimentos_futuros: {
        Row: {
          clinica_id: string | null
          clinica_nome: string | null
          mes_recebimento: string | null
          total_parcelas: number | null
          total_projetado: number | null
        }
        Relationships: [
          {
            foreignKeyName: "parcelas_cartao_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinicas_parceiras"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      auth_clinica_id: { Args: never; Returns: string }
      auto_receber_parcelas_cartao: {
        Args: { p_data_ref?: string }
        Returns: number
      }
      calcular_resultado_mensal_parceiro: {
        Args: { p_clinica_id: string }
        Returns: {
          custos: number
          mes: string
          recebido: number
          resultado: number
        }[]
      }
      estornar_pagamento: { Args: { p_pagamento_id: string }; Returns: Json }
      is_admin: { Args: never; Returns: boolean }
      registrar_pagamento: {
        Args: {
          p_data_pagamento: string
          p_forma: Database["public"]["Enums"]["forma_pagamento"]
          p_orcamento_fechado_id: string
          p_parcelas: number
          p_registrado_por: string
          p_valor: number
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      forma_pagamento: [
        "cartao_credito",
        "cartao_debito",
        "pix",
        "dinheiro",
        "boleto",
        "transferencia",
      ],
      status_orcamento: ["em_aberto", "parcial", "quitado"],
      status_parcela: ["projetado", "recebido"],
      status_resumo: ["processado", "revisao"],
      status_upload: ["processando", "concluido", "erro"],
      tipo_planilha: [
        "orcamentos_fechados",
        "orcamentos_abertos",
        "tratamentos_executados",
        "recebimentos",
      ],
    },
  },
} as const
