import { ref } from 'vue'

/**
 * The submit half of every modal form: one in-flight flag, one error, and a
 * guard against double submission.
 *
 * `submit` resolves to the action's return value on success and to `undefined`
 * on failure, so callers can close the dialog conditionally:
 *
 *   const row = await submit(() => createExpense(orgId, userId, form))
 *   if (row) emit('created', row)
 *
 * Errors are held rather than rethrown — every service already converts them to
 * a readable message through `unwrap`, and the modal renders `error.message`.
 */
export function useFormSubmit() {
  const submitting = ref(false)
  const error = ref(null)

  async function submit(action) {
    if (submitting.value) return undefined

    submitting.value = true
    error.value = null
    try {
      return await action()
    } catch (caught) {
      error.value = caught
      return undefined
    } finally {
      submitting.value = false
    }
  }

  function reset() {
    submitting.value = false
    error.value = null
  }

  return { submitting, error, submit, reset }
}
