/**
 * Shared plumbing for every service module.
 *
 * Services throw on failure rather than returning `{ data, error }` pairs, so
 * pages can rely on `usePortalData` catching once instead of checking after
 * every call.
 */

/**
 * Unwrap a supabase-js response, throwing a readable error on failure.
 * PostgREST error codes worth recognising are translated to plain English —
 * the raw ones ("PGRST116", "42P01") tell a user nothing.
 */
export function unwrap({ data, error, count }, context = 'request') {
  if (error) throw toFriendlyError(error, context)
  return count === undefined ? data : { data, count }
}

export function toFriendlyError(error, context) {
  const friendly = new Error(describe(error, context))
  friendly.cause = error
  friendly.code = error.code
  return friendly
}

function describe(error, context) {
  // Relation missing — the schema has not been applied yet.
  if (error.code === '42P01') {
    return `The database tables are missing. Run supabase_schema.md against your project, then reload.`
  }
  // Function missing — the aggregate RPCs were skipped.
  if (error.code === 'PGRST202' || error.code === '42883') {
    return `A database function used by this page does not exist yet. Run section 10 of supabase_schema.md.`
  }
  // RLS rejected the write.
  if (error.code === '42501' || error.code === 'PGRST301') {
    return `You do not have permission to do that.`
  }
  // .single() found no row.
  if (error.code === 'PGRST116') {
    return `No matching record was found.`
  }
  if (error.message?.includes('Failed to fetch')) {
    return `Could not reach Supabase. Check your connection and VITE_SUPABASE_URL.`
  }
  return error.message || `The ${context} failed.`
}

/**
 * Escape a user-typed search term before it goes into a PostgREST `or()`
 * filter, where commas and parentheses are syntax rather than literal text.
 */
export function escapeFilterValue(term) {
  return String(term).replace(/[,()]/g, ' ').trim()
}

/** Convert a page index and size into the inclusive range PostgREST wants. */
export function pageRange(page = 0, size = 20) {
  const from = page * size
  return [from, from + size - 1]
}
