# ADR-0006 — Fonte de verdade dos design tokens

- **Status:** Aceito
- **Data:** 2026-08-28
- **Requisitos:** RNF-MNT-002

## Contexto

O design chega em duas formas: `docs/design/vestiq_core/DESIGN.md` (prosa +
frontmatter com tokens) e `docs/design/*/code.html` (protótipos Tailwind com
`tailwind.config` inline). Há divergências entre eles:

| Token | DESIGN.md (prosa) | code.html (config) |
| --- | --- | --- |
| primary | `#7027B8` | `primary: #56009a`, `primary-container: #7027b8` |
| botão | "rounded-md (8px)" | usa `rounded-lg` = `0.5rem` (8px) |
| `borderRadius.lg` | `1rem` | `0.5rem` |

## Decisão

1. **Os protótipos `code.html` prevalecem** sobre a prosa do `DESIGN.md` quando
   divergem — eles geram as telas de referência (`screen.png`).
2. Tokens portados para `tailwind.config.ts` a partir do frontmatter do
   `DESIGN.md` (paleta Material 3 completa) com os overrides dos protótipos
   (`borderRadius`, uso de `primary-container` como preenchimento de botão).
3. Botões e inputs: `rounded-lg` (`0.5rem`). Cards: `rounded-xl` (`0.75rem`).
4. O preenchimento primário de ações é `primary-container` (`#7027b8`); `primary`
   (`#56009a`) é o estado hover/ativo e a cor da marca em texto.
5. Ícones: Material Symbols Outlined (como nos protótipos), via componente `Icon`.

## Consequências

- `tailwind.config.ts` é a fonte de verdade em código; `DESIGN.md` é referência
  de intenção.
- Ao portar cada tela, seguir `screen.png` + `code.html`; discrepâncias com o
  `DESIGN.md` não bloqueiam.
- Se o time de design republicar os protótipos, reconciliar os tokens em um único
  PR de design system.

## Alternativas consideradas

- **Seguir o DESIGN.md:** a prosa está internamente inconsistente (8px ≠ 1rem).
- **Extrair tokens via ferramenta do Figma:** não temos o arquivo fonte.
