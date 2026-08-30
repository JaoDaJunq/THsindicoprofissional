import { parseCondominiumQuery } from '@/infrastructure/http/condominium-query'
import { DEFAULT_PAGE_SIZE } from '@/shared/types'

const parse = (query: string) =>
  parseCondominiumQuery(new URL(`http://x/api/condominiums${query}`).searchParams)

describe('parseCondominiumQuery', () => {
  it('defaults to the first page', () => {
    expect(parse('')).toEqual({
      filters: {},
      page: { page: 1, pageSize: DEFAULT_PAGE_SIZE },
    })
  })

  it('reads page and size', () => {
    expect(parse('?page=2&pageSize=25').page).toEqual({ page: 2, pageSize: 25 })
  })

  it('falls back to page one when the page is not a number', () => {
    expect(parse('?page=abc').page.page).toBe(1)
  })

  it('keeps the search term', () => {
    expect(parse('?search=aurora').filters.search).toBe('aurora')
  })

  it('ignores a blank search term instead of filtering by nothing', () => {
    expect(parse('?search=%20%20').filters.search).toBeUndefined()
  })

  it('keeps the name and cnpj filters', () => {
    expect(parse('?name=aurora&cnpj=123').filters).toEqual({ name: 'aurora', cnpj: '123' })
  })

  it('keeps a known status', () => {
    expect(parse('?status=inactive').filters.status).toBe('inactive')
  })

  it('drops a status it does not know', () => {
    expect(parse('?status=whatever').filters.status).toBeUndefined()
  })
})
