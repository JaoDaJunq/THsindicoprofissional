import { formatCnpj } from '@/components/condominium/format'

describe('formatCnpj', () => {
  it('punctuates the fourteen digits', () => {
    expect(formatCnpj('12345678000199')).toBe('12.345.678/0001-99')
  })

  it('shows a dash when there is no cnpj', () => {
    expect(formatCnpj(null)).toBe('—')
  })

  it('leaves alone what does not look like a cnpj', () => {
    expect(formatCnpj('123')).toBe('123')
  })
})
