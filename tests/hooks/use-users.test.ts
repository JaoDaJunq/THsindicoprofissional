import { buildUsersQuery } from '@/hooks/use-users'

describe('buildUsersQuery', () => {
  it('always asks for a page', () => {
    expect(buildUsersQuery({}, 2)).toContain('page=2')
  })

  it('leaves out filters that were not set', () => {
    const query = buildUsersQuery({}, 1)

    expect(query).not.toContain('search')
    expect(query).not.toContain('isManager')
    expect(query).not.toContain('status')
  })

  it('sends the search term', () => {
    expect(buildUsersQuery({ search: 'ana' }, 1)).toContain('search=ana')
  })

  it('sends false flags, which are a real filter and not an absent one', () => {
    expect(buildUsersQuery({ isManager: false }, 1)).toContain('isManager=false')
  })

  it('sends the status, the code, the name and the e-mail', () => {
    const query = buildUsersQuery(
      { status: 'inactive', id: 'abc', name: 'Ana', email: 'ana@' },
      1,
    )

    expect(query).toContain('status=inactive')
    expect(query).toContain('id=abc')
    expect(query).toContain('name=Ana')
    expect(query).toContain('email=ana%40')
  })
})
