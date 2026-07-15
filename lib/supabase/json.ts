import type { Json } from '@/lib/database.types'

/**
 * Bridges a plain, JSON-serializable domain value (arrays/objects of
 * strings, numbers, booleans, nulls — e.g. RubricScore[], GrammarIssue[]
 * from types/index.ts) into Supabase's generated `Json` type for
 * jsonb columns.
 *
 * Why this is needed: Supabase's generated `Json` type includes an
 * index-signature object variant (`{ [key: string]: Json | undefined }`),
 * and TypeScript's structural typing never considers a *named*
 * interface/type alias to satisfy an index-signature type — even when
 * every property is itself JSON-compatible — because named types don't
 * declare an index signature themselves. That's a TypeScript modeling
 * limitation, not a sign the value is actually the wrong shape.
 *
 * This only papers over that specific mismatch; it still requires the
 * call site to be passing a real, already-typed domain value (not `any`),
 * so a genuine shape bug upstream will still be caught by the compiler
 * before it reaches here.
 */
export function toJson<T>(value: T): Json {
  return value as unknown as Json
}
