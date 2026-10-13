import type { Field } from '../api/types'

export const isEmpty = (v: any) => v === null || v === undefined || (typeof v === 'string' && v.trim() === '') || (Array.isArray(v) && v.length === 0)
const norm = (x: any) => String(x).trim().toLowerCase()

export function evaluateRule(op: string, actual: any, expected: string | null): boolean {
  if (op === 'not_empty') return !isEmpty(actual)
  if (isEmpty(actual)) return op === 'not_equals'
  const items = Array.isArray(actual) ? actual.map(norm) : [norm(actual)]
  const exp = norm(expected ?? '')
  switch (op) {
    case 'equals': return items.includes(exp)
    case 'not_equals': return !items.includes(exp)
    case 'contains': return items.some((i) => i.includes(exp))
    case 'gt': case 'lt': {
      const a = Number(actual), e = Number(expected)
      if (Array.isArray(actual) || Number.isNaN(a) || Number.isNaN(e)) return false
      return op === 'gt' ? a > e : a < e
    }
    default: return true
  }
}

/** Mirrors the backend logic: visible = own rule passes AND parent field is visible */
export function computeVisibility(fields: Field[], values: Record<number, any>): Record<number, boolean> {
  const byId = new Map(fields.map((f) => [f.id, f]))
  const memo: Record<number, boolean> = {}
  const visible = (f: Field, stack: number[] = []): boolean => {
    if (f.id in memo) return memo[f.id]
    let r = true
    if (f.cond_field_id && byId.has(f.cond_field_id) && !stack.includes(f.id)) {
      const parent = byId.get(f.cond_field_id)!
      r = visible(parent, [...stack, f.id]) && evaluateRule(f.cond_operator || 'equals', values[parent.id], f.cond_value)
    }
    memo[f.id] = r
    return r
  }
  fields.forEach((f) => visible(f))
  return memo
}
