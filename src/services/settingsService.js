import { supabase } from '../lib/supabaseClient'
import { unwrap } from './helpers'
import { getOrganization, updateOrganization } from './organizationService'

/** Queries behind /portal/settings. */

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const CURRENCY_LABELS = {
  GHS: 'GHS — Ghana Cedi',
  USD: 'USD — US Dollar',
  EUR: 'EUR — Euro',
  GBP: 'GBP — Pound Sterling',
  NGN: 'NGN — Nigerian Naira',
}

/* ------------------------------------------------------------------ profile */

export async function getProfile(userId) {
  const row = unwrap(
    await supabase
      .from('profiles')
      .select('id, full_name, job_title, phone, avatar_url')
      .eq('id', userId)
      .single(),
    'profile lookup',
  )

  return {
    fullName: row.full_name ?? '',
    jobTitle: row.job_title ?? '',
    phone: row.phone ?? '',
    avatarUrl: row.avatar_url ?? '',
  }
}

export async function updateProfile(userId, profile) {
  return unwrap(
    await supabase
      .from('profiles')
      .update({
        full_name: profile.fullName,
        job_title: profile.jobTitle,
        phone: profile.phone,
      })
      .eq('id', userId)
      .select()
      .single(),
    'profile update',
  )
}

/**
 * Avatars live under {user_id}/… because the storage policy reads that first
 * path segment. `upsert` lets someone replace their photo without a delete.
 */
export async function uploadAvatar(userId, file) {
  const path = `${userId}/avatar-${Date.now()}-${file.name}`

  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true })
  if (error) throw error

  const { data } = supabase.storage.from('avatars').getPublicUrl(path)

  await updateProfileAvatar(userId, data.publicUrl)
  return data.publicUrl
}

async function updateProfileAvatar(userId, avatarUrl) {
  return unwrap(
    await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', userId),
    'avatar update',
  )
}

export async function removeAvatar(userId) {
  return updateProfileAvatar(userId, null)
}

/* ------------------------------------------------------------------ company */

export async function getCompanySettings(organizationId) {
  const org = await getOrganization(organizationId)

  return {
    form: {
      name: org.name ?? '',
      registration: org.registration_number ?? '',
      vat: org.vat_number ?? '',
      address: org.address ?? '',
    },
    // Read-only summary strip beneath the form.
    financialYear: [
      { label: 'Year starts', value: `1 ${MONTHS[(org.fiscal_year_start ?? 1) - 1]}` },
      {
        label: 'Base currency',
        value: CURRENCY_LABELS[org.base_currency] ?? org.base_currency,
      },
      {
        label: 'Accounting basis',
        value: org.accounting_basis === 'cash' ? 'Cash' : 'Accrual',
      },
    ],
  }
}

export async function updateCompanySettings(organizationId, form) {
  return updateOrganization(organizationId, {
    name: form.name,
    registrationNumber: form.registration,
    vatNumber: form.vat,
    address: form.address,
  })
}

/* ------------------------------------------------------------ notifications */

/**
 * Toggle state per notification key. The labels and descriptions are UI copy
 * held in samplesData; only the booleans come from the database, so the two are
 * merged on the page.
 */
export async function getNotificationPreferences(organizationId) {
  const rows =
    unwrap(
      await supabase
        .from('notification_preferences')
        .select('key, email, push')
        .eq('organization_id', organizationId),
      'notification preferences',
    ) ?? []

  return Object.fromEntries(
    rows.map((row) => [row.key, { email: row.email, push: row.push }]),
  )
}

export async function updateNotificationPreference(
  userId,
  organizationId,
  key,
  { email, push },
) {
  // Upsert rather than update: a key added after signup has no row yet.
  return unwrap(
    await supabase
      .from('notification_preferences')
      .upsert(
        { user_id: userId, organization_id: organizationId, key, email, push },
        { onConflict: 'user_id,organization_id,key' },
      )
      .select()
      .single(),
    'notification update',
  )
}

/** Everything the settings page needs, fetched in parallel. */
export async function getSettingsPageData(organizationId, userId) {
  const [profile, company, notifications] = await Promise.all([
    getProfile(userId),
    getCompanySettings(organizationId),
    getNotificationPreferences(organizationId),
  ])
  return { profile, company, notifications }
}
