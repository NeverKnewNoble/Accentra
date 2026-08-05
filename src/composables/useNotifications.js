import { computed, readonly, ref } from 'vue'
import { useAuth } from './useAuth'
import { useOrganization } from './useOrganization'
import { listNotifications } from '../services/notificationService'
import { getNotificationPreferences } from '../services/settingsService'

/**
 * The bell in the topbar.
 *
 * Module-level state, because the topbar mounts once and every page shares the
 * same unread count.
 *
 * Read state lives in `localStorage`, not the database. Items are derived
 * (see notificationService), so their ids are stable — `invoice-overdue:<uuid>`
 * — and there is no `notifications` table to write a `read_at` to. This is the
 * honest trade: the badge is per-browser, and adding a table later would be the
 * only way to make it follow the user across devices.
 */

const items = ref([])
const loading = ref(false)
const error = ref(null)
const readIds = ref(new Set())

let storageKey = null
let loadedOnce = false

/** Cap what is kept, so a long-lived browser does not grow the key forever. */
const MAX_REMEMBERED = 200

function keyFor(userId) {
  return `accentra:notifications-read:${userId ?? 'anonymous'}`
}

function loadReadIds(userId) {
  const next = keyFor(userId)
  if (storageKey === next) return
  storageKey = next

  try {
    const stored = JSON.parse(localStorage.getItem(next) ?? '[]')
    readIds.value = new Set(Array.isArray(stored) ? stored : [])
  } catch {
    // Corrupt or unavailable storage is not worth failing the bell over.
    readIds.value = new Set()
  }
}

function persistReadIds() {
  if (!storageKey) return
  try {
    localStorage.setItem(
      storageKey,
      JSON.stringify([...readIds.value].slice(-MAX_REMEMBERED)),
    )
  } catch {
    // Private browsing, quota — the badge just stops persisting.
  }
}

export function useNotifications() {
  const { user } = useAuth()
  const { ensureOrganization } = useOrganization()

  const unread = computed(() => items.value.filter((item) => !readIds.value.has(item.id)))
  const unreadCount = computed(() => unread.value.length)

  async function refresh() {
    loading.value = true
    error.value = null

    try {
      loadReadIds(user.value?.id)

      const organizationId = await ensureOrganization()
      const preferences = await getNotificationPreferences(organizationId)

      // Both channels off is the user saying they do not want to hear about it,
      // and the bell is a channel too. A key with no row yet is not muted —
      // the signup trigger only seeds six, and new keys should default to on.
      const mutedKeys = Object.entries(preferences)
        .filter(([, channels]) => !channels.email && !channels.push)
        .map(([key]) => key)

      items.value = await listNotifications(organizationId, { mutedKeys })
      loadedOnce = true
    } catch (caught) {
      error.value = caught
    } finally {
      loading.value = false
    }
  }

  /** Fetch once per page load; the panel calls `refresh` when it opens. */
  function ensureLoaded() {
    if (!loadedOnce && !loading.value) refresh()
  }

  function markRead(id) {
    if (readIds.value.has(id)) return
    readIds.value = new Set(readIds.value).add(id)
    persistReadIds()
  }

  function markAllRead() {
    const next = new Set(readIds.value)
    items.value.forEach((item) => next.add(item.id))
    readIds.value = next
    persistReadIds()
  }

  function isRead(id) {
    return readIds.value.has(id)
  }

  return {
    items: readonly(items),
    loading: readonly(loading),
    error: readonly(error),
    unreadCount,
    refresh,
    ensureLoaded,
    markRead,
    markAllRead,
    isRead,
  }
}
