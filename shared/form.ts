/** Reads a text field from a form, treating "absent" as empty. */
export function textField(form: FormData, name: string): string {
  const value = form.get(name)

  return typeof value === 'string' ? value : ''
}
