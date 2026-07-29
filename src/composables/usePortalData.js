import { onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { useOrganization } from './useOrganization'

/**
 * Runs a service call against the current organisation and tracks its loading
 * and error state, so pages never hand-roll the same three refs.
 *
 * `fetcher` receives the organisation id and returns a promise:
 *
 *   const { data, loading, error, refresh } = usePortalData(
 *     (orgId) => getDashboardData(orgId),
 *     { initial: { stats: null } },
 *   )
 *
 * Pass `watchSources` to refetch when a filter changes. Out-of-order responses
 * are discarded, so a slow early request can never overwrite a fast later one.
 */
export function usePortalData(fetcher, { initial = null, watchSources = [], immediate = true } = {}) {
  const { ensureOrganization } = useOrganization()

  const data = shallowRef(initial)
  const error = ref(null)
  const loading = ref(false)

  let requestId = 0
  let disposed = false

  async function refresh() {
    const current = ++requestId
    loading.value = true
    error.value = null

    try {
      const organizationId = await ensureOrganization()
      const result = await fetcher(organizationId)
      if (current === requestId && !disposed) data.value = result
    } catch (caught) {
      if (current === requestId && !disposed) {
        error.value = caught
        data.value = initial
      }
    } finally {
      if (current === requestId && !disposed) loading.value = false
    }
  }

  if (watchSources.length) {
    watch(watchSources, refresh, { immediate })
  } else if (immediate) {
    refresh()
  }

  onBeforeUnmount(() => {
    disposed = true
  })

  return { data, error, loading, refresh }
}
