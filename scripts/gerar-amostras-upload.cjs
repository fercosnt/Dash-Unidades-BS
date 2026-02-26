/**
 * Gera dois arquivos XLSX de exemplo para testar o upload.
 * Mínimo ~100 linhas por planilha, com procedimentos realistas (odontologia + estética).
 * Execute: node scripts/gerar-amostras-upload.cjs
 * Arquivos gerados em: amostras-upload/modelo-orcamentos.xlsx e modelo-tratamentos.xlsx
 */

const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const OUT_DIR = path.join(__dirname, "..", "amostras-upload");

// --- Dados base para gerar amostras realistas ---

const NOMES = [
  "Ana Paula Silva", "Bruno Oliveira", "Carla Mendes", "Daniel Costa", "Elena Santos",
  "Fernando Lima", "Gabriela Rocha", "Henrique Alves", "Isabela Pereira", "João Pedro Souza",
  "Larissa Martins", "Marcos Ferreira", "Natália Ribeiro", "Otávio Carvalho", "Patricia Gomes",
  "Rafael Barbosa", "Sandra Nascimento", "Thiago Araújo", "Vanessa Castro", "William Dias",
  "Amanda Correia", "Caio Pinto", "Débora Moreira", "Eduardo Cavalcanti", "Fabiana Lopes",
  "Gustavo Teixeira", "Helena Nunes", "Igor Cardoso", "Juliana Freitas", "Leonardo Azevedo",
  "Mariana Campos", "Nathan Rodrigues", "Olivia Monteiro", "Paulo Vieira", "Renata Soares",
  "Samuel Macedo", "Tatiana Andrade", "Vitor Machado", "Yasmin Reis", "André Brito",
  "Beatriz Cunha", "César Farias", "Diana Vasconcelos", "Erick Melo", "Flávia Barros",
  "Giovanni Figueiredo", "Heloisa Miranda", "Ivan Coelho", "Júlia Bezerra", "Lucas Tavares",
];

const SOBRENOMES_IDADE = ["(28)", "(35)", "(42)", "(19)", "(51)", "(33)", "(27)", "(44)", "(38)", "(25)", "", "", ""];

const STATUS_ORCAMENTO = ["APPROVED", "APPROVED", "APPROVED", "em_aberto", "PENDING", "em_analise"];

const COMO_CONHECEU = [
  "Indicado por Dr. João", "Google", "Instagram", "Facebook", "Indicação de paciente",
  "Site da clínica", "Panfletos", "Busca orgânica", "Indicado por Dra. Ana", "WhatsApp",
  "LinkedIn", "Amigo", "Família",
];

const PROFISSIONAIS = [
  "Dra. Ana Costa", "Dr. Pedro Lima", "Dra. Camila Souza", "Dr. Ricardo Mendes",
  "Dra. Fernanda Oliveira", "Dr. Bruno Santos", "Dra. Mariana Costa",
];

const TELEFONES = ["(11) 98765-4321", "(11) 91234-5678", "(21) 99876-5432", "(11) 97654-3210", ""];

// Procedimentos para orçamentos (descrições que aparecem na planilha)
const PROCEDIMENTOS_ORCAMENTO = [
  "Clareamento dental + Limpeza",
  "Restauração em resina",
  "Tratamento de canal",
  "Extração de siso",
  "Implante dentário - etapa cirúrgica",
  "Lente de contato dental",
  "Faceta em porcelana",
  "Ortodontia - aparelho fixo",
  "Clareamento a laser",
  "Profilaxia + Aplicação de flúor",
  "Raspagem / Periodontia",
  "Prótese total",
  "Prótese parcial",
  "Consulta inicial + Radiografia",
  "Bichectomia",
  "Preenchimento labial",
  "Toxina botulínica",
  "Harmonização facial",
  "Limpeza de pele",
  "Clareamento + Manutenção ortodôntica",
  "Restauração + Aplicação de flúor",
  "Extração simples",
  "Implante + Coroa",
  "Clareamento dental",
  "Ortodontia",
  "Limpeza",
  "Avaliação ortodôntica",
  "Retorno",
];

// Procedimentos para tratamentos executados (um por linha ou concatenados com +)
const PROCEDIMENTOS_TRATAMENTO = [
  "Clareamento dental",
  "Limpeza",
  "Profilaxia",
  "Aplicação de flúor",
  "Restauração em resina",
  "Restauração em porcelana",
  "Tratamento de canal",
  "Extração de siso",
  "Extração simples",
  "Consulta inicial",
  "Retorno",
  "Reavaliação",
  "Lente de contato dental",
  "Faceta em porcelana",
  "Implante - etapa cirúrgica",
  "Implante - prótese",
  "Prótese total",
  "Prótese parcial",
  "Raspagem",
  "Periodontia",
  "Manutenção ortodôntica",
  "Colagem de aparelho",
  "Bichectomia",
  "Preenchimento labial",
  "Toxina botulínica",
  "Botox",
  "Harmonização facial",
  "Peeling químico",
  "Limpeza de pele",
  "Clareamento a laser",
  "Avaliação ortodôntica",
  "Radiografia panorâmica",
  "Aplicação de resina",
  "Polimento",
];

const REGIOES = ["São Paulo", "Campinas", "Guarulhos", "Santo André", "Osasco", "São Bernardo", "Santos", ""];

const OBSERVACOES = ["Paciente retorno", "Aguardando aprovação", "Urgente", "Convênio", "Particular", "", "", ""];

// --- Helpers ---

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

/** Formata valor em reais (BR): 1.250,00 */
function valorBR(val) {
  const n = typeof val === "number" ? val : randomInt(150, 8500);
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Data no mês/ano em DD/MM/YYYY */
function dataNoMes(ano, mes, diaMax) {
  const dia = randomInt(1, diaMax || 28);
  const d = new Date(ano, mes - 1, dia);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// Ano/mês de referência (pode alterar)
const ANO_REF = 2025;
const MES_REF = 3;
const DIAS_MES = 31;

// --- Cabeçalhos (colunas esperadas pelo transform) ---

const ORCAMENTOS_HEADER = [
  "Status",
  "Paciente",
  "Valor Total Com Desconto",
  "Data Criação",
  "Como conheceu?",
  "Profissional",
  "Telefone",
  "Procedimentos",
  "Valor",
  "Desconto-Porcentagem",
  "Desconto-Reais",
  "Observações",
];

const TRATAMENTOS_HEADER = [
  "Paciente",
  "Procedimento",
  "Executado",
  "Valor",
  "Profissional",
  "Região",
];

// --- Gerar ~100+ orçamentos ---

function gerarOrcamentos(quantidade) {
  const rows = [ORCAMENTOS_HEADER];

  for (let i = 0; i < quantidade; i++) {
    const nome = pick(NOMES);
    const nomeComIdade = SOBRENOMES_IDADE.length > 0 && Math.random() > 0.4
      ? `${nome} ${pick(SOBRENOMES_IDADE)}`.trim()
      : nome;
    const status = pick(STATUS_ORCAMENTO);
    const valorBruto = randomInt(200, 6000);
    const temDesconto = status === "APPROVED" && Math.random() > 0.6;
    const descPct = temDesconto ? randomInt(2, 15) : 0;
    const descReais = temDesconto ? Math.round((valorBruto * descPct) / 100) : 0;
    const valorTotal = valorBruto - descReais;

    rows.push([
      status,
      nomeComIdade,
      valorBR(valorTotal),
      dataNoMes(ANO_REF, MES_REF, DIAS_MES),
      pick(COMO_CONHECEU),
      pick(PROFISSIONAIS),
      pick(TELEFONES),
      pick(PROCEDIMENTOS_ORCAMENTO),
      valorBR(valorBruto),
      temDesconto ? `${descPct}%` : "",
      temDesconto ? valorBR(descReais) : "",
      pick(OBSERVACOES),
    ]);
  }

  return rows;
}

// --- Gerar ~100+ tratamentos executados ---

function gerarTratamentos(quantidade) {
  const rows = [TRATAMENTOS_HEADER];

  for (let i = 0; i < quantidade; i++) {
    const paciente = pick(NOMES);
    // Às vezes procedimento composto (dois com +) para testar split
    const usaComposto = Math.random() > 0.75;
    const procedimento = usaComposto
      ? `${pick(PROCEDIMENTOS_TRATAMENTO)} + ${pick(PROCEDIMENTOS_TRATAMENTO)}`
      : pick(PROCEDIMENTOS_TRATAMENTO);
    const valor = randomInt(80, 3500);

    rows.push([
      paciente,
      procedimento,
      dataNoMes(ANO_REF, MES_REF, DIAS_MES),
      valorBR(valor),
      pick(PROFISSIONAIS),
      pick(REGIOES),
    ]);
  }

  return rows;
}

// --- Main ---

const NUM_ORCAMENTOS = 110;
const NUM_TRATAMENTOS = 120;

const orcamentosData = gerarOrcamentos(NUM_ORCAMENTOS);
const tratamentosData = gerarTratamentos(NUM_TRATAMENTOS);

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

const wbOrc = XLSX.utils.book_new();
const wsOrc = XLSX.utils.aoa_to_sheet(orcamentosData);
XLSX.utils.book_append_sheet(wbOrc, wsOrc, "Orcamentos");
const pathOrc = path.join(OUT_DIR, "modelo-orcamentos.xlsx");
XLSX.writeFile(wbOrc, pathOrc);
console.log("Criado:", pathOrc, "—", NUM_ORCAMENTOS, "linhas de orçamentos");

const wbTrat = XLSX.utils.book_new();
const wsTrat = XLSX.utils.aoa_to_sheet(tratamentosData);
XLSX.utils.book_append_sheet(wbTrat, wsTrat, "Tratamentos");
const pathTrat = path.join(OUT_DIR, "modelo-tratamentos.xlsx");
XLSX.writeFile(wbTrat, pathTrat);
console.log("Criado:", pathTrat, "—", NUM_TRATAMENTOS, "linhas de tratamentos");

console.log("\nUse esses arquivos em Admin -> Upload (tipo Orcamentos ou Tratamentos executados).");
