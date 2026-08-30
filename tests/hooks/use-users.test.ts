import { buildUsersQuery } from '@/hooks/use-users'

describe('buildUsersQuery', () => {
  it('always asks for a page', () => {
    expect(buildUsersQuery({}, 2)).toContain('page=2')
  })

  it('leaves out filters that were not set', () => {
    const query = buildUsersQuery({}, 1)

    expect(query).not.toContain('search')
    expect(query).not.toContain('isManager')
    expect(query).not.toContain('isActive')
  })

  it('sends the search term', () => {
    expect(buildUsersQuery({ search: 'ana' }, 1)).toContain('search=ana')
  })

  it('sends false flags, which are a real filter and not an absent one', () => {
    expect(buildUsersQuery({ isActive: false }, 1)).toContain('isActive=false')
  })
})
