type Props = Record<string, unknown> & { class?: string; on?: Record<string, (e: Event) => void> }

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Props = {},
  ...children: (Node | string | null | false)[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag)
  for (const [k, v] of Object.entries(props)) {
    if (k === 'on') for (const [ev, fn] of Object.entries(v as Record<string, (e: Event) => void>)) el.addEventListener(ev, fn)
    else if (k === 'class') el.className = v as string
    else if (v !== undefined && v !== false) (el as unknown as Record<string, unknown>)[k] = v
  }
  for (const c of children) if (c) el.append(c)
  return el
}
