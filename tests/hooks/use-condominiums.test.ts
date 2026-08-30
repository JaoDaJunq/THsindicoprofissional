import { buildCondominiumsQuery } from '@/hooks/use-condominiums'

describe('buildCondominiumsQuery', () => {
  it('always asks for a page', () => {
    expect(buildCondominiumsQuery({}, 2)).toContain('page=2')
  })

  it('leaves out filters that were not set', () => {
    const query = buildCondominiumsQuery({}, 1)

    expect(query).not.toContain('search')
    expect(query).not.toContain('cnpj')
    expect(query).not.toContain('status')
  })

  it('sends the search term', () => {
    expect(buildCondominiumsQuery({ search: 'aurora' }, 1)).toContain('search=aurora')
  })

  it('sends the status, the name and the cnpj', () => {
    const query = buildCondominiumsQuery(
      { status: 'inactive', name: 'Aurora', cnpj: '123' },
      1,
    )

    expect(query).toContain('status=inactive')
    expect(query).toContain('name=Aurora')
    expect(query).toContain('cnpj=123')
  })
})
