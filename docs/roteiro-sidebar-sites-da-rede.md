# Roteiro: Dropdown "Sites da rede" na Sidebar

Este roteiro descreve **exatamente** como replicar a alteração da sidebar (dropdown "Sites da rede") em outro site (ex.: Beauty Sleep).

---

## 1. O que foi alterado (resumo)

- O **logo/título** no topo da sidebar deixou de ser um link direto e virou um **botão** que abre um dropdown.
- O dropdown mostra o título **"Sites da rede"** (centralizado, sem borda embaixo) e uma lista de links: **Beauty Smile Partners** (este site) e **Beauty Sleep** (link externo).
- O **botão de recolher/expandir** a sidebar foi para uma **linha separada**, abaixo do logo.
- O **ícone do logo** ganhou animação de hover (scale + brilho).
- O dropdown tem **contorno** (`border`), fundo escuro, sem borda no título.

---

## 2. Estrutura de dados

**Lista de links externos** (outros sites da rede):

```ts
const REDE_LINKS_EXTERNOS = [
  { href: "https://beautysleep.bslabs.com.br/", label: "Beauty Sleep", external: true },
  // Adicione mais: { href: "URL", label: "Nome", external: true },
];
```

**Lista completa do dropdown** (montada no componente):

- Primeiro item: **este site** — `href` = `homeHref` (ex.: `/admin/dashboard` ou `/`), `label` = `"Beauty Smile Partners"` (ou o nome do seu site).
- Demais itens: vêm de `REDE_LINKS_EXTERNOS` (links externos com `target="_blank"`).

---

## 3. Estados e ref

- `redeOpen: boolean` — controla se o dropdown está aberto.
- `redeRef: useRef<HTMLDivElement>(null)` — usado para **fechar ao clicar fora** (detectar clique fora da área do logo + dropdown).

---

## 4. Fechar ao clicar fora

```ts
useEffect(() => {
  function handleClickOutside(e: MouseEvent) {
    if (redeRef.current && !redeRef.current.contains(e.target as Node)) setRedeOpen(false);
  }
  if (redeOpen) {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }
}, [redeOpen]);
```

O elemento que envolve o **botão do logo** e o **dropdown** deve ter `ref={redeRef}`.

---

## 5. Layout do topo da sidebar

- **Primeira linha:** um único bloco com `ref={redeRef}`, contendo:
  - **Botão** (não mais `<Link>`): ao clicar faz `setRedeOpen((v) => !v)`.
  - Dentro do botão: ícone do logo + texto (ex.: "Beauty Smile" + "Partners" + setinha).
  - **Dropdown** (condicional `{redeOpen && (...)}`): posicionado `absolute left-0 top-full`, com `z-[100]` para ficar acima do resto.
- **Segunda linha:** só o botão de recolher/expandir a sidebar (separado do bloco do logo).

---

## 6. Estilos do botão do logo

- Sem hover de fundo no botão inteiro (só no ícone).
- `outline-none focus:outline-none` para não mostrar anel de foco feio.
- Ícone: `transition-transform duration-200 hover:scale-110 hover:shadow-[0_0_12px_rgba(53,191,173,0.4)]` (ou cor do seu tema).

---

## 7. Estilos do dropdown

- **Container:**  
  `absolute left-0 top-full z-[100] mt-1 w-52 rounded-lg border border-white/15 bg-[#0f172a] shadow-xl overflow-hidden`
- **Título "Sites da rede":**  
  `px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-white/40 text-center`  
  Sem `border-b` (sem linha embaixo do título).
- **Lista de itens:**  
  Wrapper com `py-1`. Cada item:
  - Link interno: `<Link>` com `block w-full px-4 py-2.5 text-sm font-medium text-white/95 hover:bg-white/10 transition-colors whitespace-nowrap`.
  - Link externo: `<a target="_blank" rel="noopener noreferrer">` com as mesmas classes.
- Ao clicar em um item, executar `setRedeOpen(false)` para fechar.

---

## 8. Lógica de renderização dos itens

Para cada item em `redeLinks`:

- Se tiver `external: true`: renderizar `<a href={...} target="_blank" rel="noopener noreferrer">` com `item.label`.
- Senão: renderizar `<Link href={...}>` com `item.label`.

Use `"external" in item && item.external` para distinguir (TypeScript).

---

## 9. No outro site (Beauty Sleep)

- **`REDE_LINKS_EXTERNOS`:** incluir o link para o **Beauty Smile Partners** (ex.: `https://dash-unidades-bs.vercel.app` ou a URL do dashboard).
- **Primeiro item do dropdown:** `href` = rota inicial do Beauty Sleep (ex.: `/` ou `/dashboard`), `label` = `"Beauty Sleep"` (ou o nome do site).
- Manter a mesma estrutura: botão no topo, dropdown com título centralizado "Sites da rede", contorno no dropdown, botão de recolher em linha separada, ícone com hover.

---

## 10. Checklist ao implementar

- [ ] Trocar o `<Link>` do logo por um `<button>` que alterna `redeOpen`.
- [ ] Adicionar `redeOpen`, `redeRef` e o `useEffect` de clique fora.
- [ ] Criar a lista `redeLinks` (este site + `REDE_LINKS_EXTERNOS`).
- [ ] Renderizar o dropdown com título "Sites da rede" centralizado, sem borda no título.
- [ ] Itens com `block w-full`, `whitespace-nowrap`, e `setRedeOpen(false)` no clique.
- [ ] Contorno no dropdown: `border border-white/15` (ou equivalente no tema).
- [ ] Botão de recolher sidebar em uma segunda linha (outra `div`), não ao lado do logo.
- [ ] Ícone do logo com hover (scale + sombra).
- [ ] No outro site, ajustar `REDE_LINKS_EXTERNOS` e o primeiro item de `redeLinks` com as URLs e labels corretos.

---

## 11. Referência rápida de classes (Tailwind)

| Elemento | Classes principais |
|----------|--------------------|
| Container do dropdown | `absolute left-0 top-full z-[100] mt-1 w-52 rounded-lg border border-white/15 bg-[#0f172a] shadow-xl overflow-hidden` |
| Título | `px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-white/40 text-center` |
| Item do dropdown | `block w-full px-4 py-2.5 text-sm font-medium text-white/95 hover:bg-white/10 transition-colors whitespace-nowrap` |
| Ícone logo (hover) | `transition-transform duration-200 hover:scale-110 hover:shadow-[0_0_12px_rgba(53,191,173,0.4)]` |

Com isso você consegue reproduzir a mesma alteração da sidebar no outro site.
