import { administers, isAdmin } from '@/domain/authorization'
import { buildUser } from '@/tests/support/build-user'
import type { Membership } from '@/shared/types'

const admin = buildUser({ role: 'ADMIN' })
const manager = buildUser({ id: 'u1', role: 'MANAGER' })
const resident = buildUser({ id: 'u2', role: 'RESIDENT' })

function membership(role: Membership['role'], condominiumId = 'c1'): Membership {
  return {
    id: 'm1',
    role,
    user: { id: 'u1', name: 'Ana', email: 'ana@example.com' },
    condominium: { id: condominiumId, name: 'Aurora' },
  }
}

describe('isAdmin', () => {
  it('reconhece o administrador do sistema', () => {
    expect(isAdmin(admin)).toBe(true)
  })

  it('não confunde síndico com administrador', () => {
    expect(isAdmin(manager)).toBe(false)
  })
})

describe('administers', () => {
  it('deixa o administrador em qualquer condomínio', () => {
    expect(administers(admin, [], 'c1')).toBe(true)
  })

  it('deixa o síndico onde o vínculo diz que ele é síndico', () => {
    expect(administers(manager, [membership('MANAGER')], 'c1')).toBe(true)
  })

  it('barra o síndico no condomínio onde ele apenas mora', () => {
    expect(administers(manager, [membership('RESIDENT')], 'c1')).toBe(false)
  })

  it('barra o síndico em condomínio de que ele não participa', () => {
    expect(administers(manager, [membership('MANAGER', 'outro')], 'c1')).toBe(false)
  })

  it('barra o morador mesmo com vínculo de síndico', () => {
    expect(administers(resident, [membership('MANAGER')], 'c1')).toBe(false)
  })
})
