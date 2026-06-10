// ============================================================================
// Kâmbio — Widget Scriptable (médio / rectangular)
// ----------------------------------------------------------------------------
// Mostra o lucro do mês corrente em AOA + a quantidade vendida por moeda
// (EUR, BRL, ...). Lê os dados de um GitHub Gist atualizado pelo PWA Kâmbio.
//
// COMO USAR:
//   1. Crie um Gist (secreto) em https://gist.github.com com um arquivo
//      chamado `kambio-widget.json` (conteúdo inicial: {}).
//   2. Copie o ID do Gist (parte final da URL).
//   3. No app Kâmbio (engrenagem → Widget & Sync), cole o Gist ID e um PAT
//      com escopo `gist`. Salve. O app passa a publicar o resumo ali.
//   4. Aqui no Scriptable, preencha GIST_ID e TOKEN abaixo.
//   5. Adicione um widget Scriptable (tamanho médio) na tela inicial e
//      selecione este script.
// ============================================================================

// ---- CONFIG (preencha) -----------------------------------------------------
const GIST_ID = "COLE_O_GIST_ID_AQUI";
const TOKEN = "COLE_O_SEU_PAT_AQUI"; // escopo: gist
// ----------------------------------------------------------------------------

// Paleta (espelha o Design System do app)
const COLORS = {
  bg1: new Color("#0b1f17"),
  bg2: new Color("#052a1d"),
  primary: new Color("#4edea3"),
  white: new Color("#ffffff"),
  muted: new Color("#bbcabf"),
  card: new Color("#1d2022"),
  border: new Color("#3c4a42"),
};

const CURRENCY_SYMBOL = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  BRL: "R$",
  AOA: "AOA",
};

async function fetchPayload() {
  const req = new Request(`https://api.github.com/gists/${GIST_ID}`);
  req.headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${TOKEN}`,
  };
  const json = await req.loadJSON();
  const file = json.files && json.files["kambio-widget.json"];
  if (!file || !file.content) throw new Error("Arquivo do widget não encontrado no Gist.");
  return JSON.parse(file.content);
}

function formatAOA(value) {
  // 1.234.567 (sem casas decimais, separador de milhar ".")
  const n = Math.round(Number(value) || 0);
  return n.toLocaleString("pt-BR").replace(/,/g, ".");
}

function formatAmount(value, code) {
  const n = Number(value) || 0;
  if (code === "BRL") {
    return "R$ " + n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  const sym = CURRENCY_SYMBOL[code] || "";
  return sym + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function buildWidget(payload) {
  const w = new ListWidget();

  // Fundo em gradiente diagonal obsidiana → verde-floresta.
  const grad = new LinearGradient();
  grad.colors = [COLORS.bg1, COLORS.bg2];
  grad.startPoint = new Point(0, 0);
  grad.endPoint = new Point(1, 1);
  w.backgroundGradient = grad;
  w.setPadding(16, 18, 16, 18);

  // Cabeçalho: "LUCRO • <mês>"
  const header = w.addStack();
  header.centerAlignContent();
  const dot = header.addText("●");
  dot.textColor = COLORS.primary;
  dot.font = Font.systemFont(8);
  header.addSpacer(6);
  const label = header.addText(`LUCRO • ${(payload.monthLabel || "").toUpperCase()}`);
  label.textColor = COLORS.muted;
  label.font = Font.semiboldSystemFont(10);

  w.addSpacer(6);

  // Valor principal: <número> AOA
  const amountStack = w.addStack();
  amountStack.bottomAlignContent();
  const big = amountStack.addText(formatAOA(payload.profitAoa));
  big.textColor = COLORS.white;
  big.font = Font.heavySystemFont(34);
  big.minimumScaleFactor = 0.5;
  amountStack.addSpacer(6);
  const suffix = amountStack.addText("AOA");
  suffix.textColor = COLORS.primary;
  suffix.font = Font.semiboldSystemFont(13);

  w.addSpacer(10);

  // Linha divisória sutil
  const divider = w.addStack();
  divider.size = new Size(0, 1);
  divider.backgroundColor = COLORS.border;

  w.addSpacer(8);

  // Rótulo "VENDIDO NO MÊS"
  const subLabel = w.addText("VENDIDO NO MÊS");
  subLabel.textColor = COLORS.muted;
  subLabel.font = Font.semiboldSystemFont(9);

  w.addSpacer(5);

  // Moedas (até 3 linhas, lado a lado em chips)
  const list = (payload.byCurrency || []).slice(0, 4);
  if (list.length === 0) {
    const none = w.addText("Sem vendas este mês");
    none.textColor = COLORS.muted;
    none.font = Font.systemFont(12);
  } else {
    const row = w.addStack();
    row.spacing = 8;
    for (const entry of list) {
      const chip = row.addStack();
      chip.layoutVertically();
      chip.backgroundColor = new Color("#ffffff", 0.06);
      chip.cornerRadius = 10;
      chip.setPadding(6, 9, 6, 9);

      const code = chip.addText(entry.code);
      code.textColor = COLORS.primary;
      code.font = Font.semiboldSystemFont(9);

      const val = chip.addText(formatAmount(entry.amount, entry.code));
      val.textColor = COLORS.white;
      val.font = Font.mediumSystemFont(13);
      val.minimumScaleFactor = 0.6;
      val.lineLimit = 1;
    }
  }

  w.addSpacer();

  // Rodapé: atualizado há X
  if (payload.updatedAt) {
    const updated = new Date(payload.updatedAt);
    const foot = w.addText("Atualizado " + relativeTime(updated));
    foot.textColor = new Color("#86948a");
    foot.font = Font.systemFont(8);
  }

  return w;
}

function relativeTime(date) {
  const diffMs = Date.now() - date.getTime();
  const min = Math.round(diffMs / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  return `há ${d} d`;
}

function buildErrorWidget(message) {
  const w = new ListWidget();
  w.backgroundColor = COLORS.bg1;
  w.setPadding(16, 18, 16, 18);
  const t = w.addText("Kâmbio");
  t.textColor = COLORS.primary;
  t.font = Font.boldSystemFont(16);
  w.addSpacer(6);
  const e = w.addText(message);
  e.textColor = COLORS.muted;
  e.font = Font.systemFont(11);
  return w;
}

// ---- Execução --------------------------------------------------------------
let widget;
try {
  const payload = await fetchPayload();
  widget = buildWidget(payload);
} catch (err) {
  widget = buildErrorWidget(String(err.message || err));
}

if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  await widget.presentMedium();
}
Script.complete();
