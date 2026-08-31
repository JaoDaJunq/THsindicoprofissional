import { navItemsFor } from '@/components/layout/nav-items'

describe('navItemsFor', () => {
  it('dá ao morador apenas o próprio início', () => {
    expect(navItemsFor('RESIDENT').map((item) => item.href)).toEqual(['/portal'])
  })

  it('dá ao síndico as telas que ele administra', () => {
    expect(navItemsFor('MANAGER').map((item) => item.href)).toEqual([
      '/portal',
      '/users',
      '/condominiums',
    ])
  })

  it('dá ao administrador o mesmo que ao síndico', () => {
    expect(navItemsFor('ADMIN').map((item) => item.href)).toEqual([
      '/portal',
      '/users',
      '/condominiums',
    ])
  })

  it('mostra o início a todo mundo', () => {
    for (const papel of ['ADMIN', 'MANAGER', 'RESIDENT'] as const) {
      expect(navItemsFor(papel).some((item) => item.href === '/portal')).toBe(true)
    }
  })
})
