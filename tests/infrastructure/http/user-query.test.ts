import { parseUserQuery } from '@/infrastructure/http/user-query'
import { DEFAULT_PAGE_SIZE } from '@/shared/types'

const parse = (query: string) => parseUserQuery(new URL(`http://x/api/users${query}`).searchParams)

describe('parseUserQuery', () => {
  it('defaults to the first page', () => {
    expect(parse('')).toEqual({
      filters: {},
      page: { page: 1, pageSize: DEFAULT_PAGE_SIZE },
    })
  })

  it('reads page and size', () => {
    expect(parse('?page=3&pageSize=25').page).toEqual({ page: 3, pageSize: 25 })
  })

  it('falls back to page one when the page is not a number', () => {
    expect(parse('?page=abc').page.page).toBe(1)
  })

  it('keeps the search term', () => {
    expect(parse('?search=ana').filters.search).toBe('ana')
  })

  it('ignores a blank search term instead of filtering by nothing', () => {
    expect(parse('?search=%20%20').filters.search).toBeUndefined()
  })

  it('reads the role that was asked for', () => {
    expect(parse('?role=MANAGER').filters.role).toBe('MANAGER')
  })

  it('drops a role it does not know', () => {
    expect(parse('?role=CHEFE').filters.role).toBeUndefined()
  })

  it('leaves the role unset when it is absent, so nothing is filtered', () => {
    expect(parse('').filters.role).toBeUndefined()
  })

  it('ignores a status it does not know', () => {
    expect(parse('?status=maybe').filters.status).toBeUndefined()
  })

  it('reads the status the person chose', () => {
    expect(parse('?status=all').filters.status).toBe('all')
    expect(parse('?status=inactive').filters.status).toBe('inactive')
  })

  it('reads the code, the name and the e-mail', () => {
    const filters = parse('?id=abc&name=Ana&email=ana%40example.com').filters

    expect(filters).toMatchObject({ id: 'abc', name: 'Ana', email: 'ana@example.com' })
  })
})
