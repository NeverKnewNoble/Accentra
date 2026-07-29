import { readonly, ref } from 'vue'
import { getCurrentOrganization } from '../services/organizationService'

/**
 * The organisation the portal is currently working in.
 *
 * Module-level state, resolved once per page load and shared by every page —
 * navigating between /portal routes must not re-query the membership table.
 */
const organizationId = ref(null)
const organization = ref(null)
const role = ref(null)
const error = ref(null)

let pending = null

async function resolve() {
  try {
    const membership = await getCurrentOrganization()
    organizationId.value = membership.organizationId
    organization.value = membership.organization
    role.value = membership.role
    error.value = null
    return membership.organizationId
  } catch (caught) {
    error.value = caught
    // Clear the cache so a retry actually retries instead of replaying the
    // rejected promise forever.
    pending = null
    throw caught
  }
}

export function useOrganization() {
  /** Resolves to the organisation id, fetching it only on first call. */
  function ensureOrganization() {
    if (organizationId.value) return Promise.resolve(organizationId.value)
    if (!pending) pending = resolve()
    return pending
  }

  /** Drop the cache — call after switching organisations or signing out. */
  function resetOrganization() {
    organizationId.value = null
    organization.value = null
    role.value = null
    error.value = null
    pending = null
  }

  return {
    organizationId: readonly(organizationId),
    organization: readonly(organization),
    role: readonly(role),
    error: readonly(error),
    ensureOrganization,
    resetOrganization,
  }
}
