import { textField } from '@/shared/form'

function formWith(entries: Record<string, string>): FormData {
  const form = new FormData()
  for (const [key, value] of Object.entries(entries)) form.append(key, value)
  return form
}

describe('textField', () => {
  it('reads what was typed', () => {
    expect(textField(formWith({ username: 'admin' }), 'username')).toBe('admin')
  })

  it('reads an empty field as an empty string', () => {
    expect(textField(formWith({ username: '' }), 'username')).toBe('')
  })

  it('reads a missing field as an empty string, never as "null"', () => {
    expect(textField(formWith({}), 'username')).toBe('')
  })

  it('ignores a field that is a file rather than text', () => {
    const form = new FormData()
    form.append('username', new File([''], 'a.txt'))

    expect(textField(form, 'username')).toBe('')
  })
})
