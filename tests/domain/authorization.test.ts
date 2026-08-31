import {
  administers,
  assignsRole,
  editsProfileOf,
  impersonates,
  isAdmin,
} from '@/domain/authorization'
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

describe('editsProfileOf', () => {
  it('deixa a pessoa editar o próprio cadastro', () => {
    expect(editsProfileOf(resident, resident.id)).toBe(true)
  })

  it('não deixa o morador editar o cadastro de outra pessoa', () => {
    expect(editsProfileOf(resident, 'outra-pessoa')).toBe(false)
  })

  it('deixa o síndico editar outra pessoa', () => {
    expect(editsProfileOf(manager, 'outra-pessoa')).toBe(true)
  })

  it('deixa o administrador editar outra pessoa', () => {
    expect(editsProfileOf(admin, 'outra-pessoa')).toBe(true)
  })
})

describe('assignsRole', () => {
  it('deixa só o administrador definir papel', () => {
    expect(assignsRole(admin)).toBe(true)
  })

  it('não deixa o síndico definir papel', () => {
    expect(assignsRole(manager)).toBe(false)
  })

  it('não deixa o morador se promover', () => {
    expect(assignsRole(resident)).toBe(false)
  })
})

describe('impersonates', () => {
  it('deixa o administrador entrar na pele de um morador', () => {
    expect(impersonates(admin, resident)).toBe(true)
  })

  it('deixa o administrador entrar na pele de um síndico', () => {
    expect(impersonates(admin, manager)).toBe(true)
  })

  it('não deixa um administrador virar outro administrador', () => {
    expect(impersonates(admin, buildUser({ id: 'outro-admin', role: 'ADMIN' }))).toBe(false)
  })

  it('não deixa o administrador virar ele mesmo', () => {
    expect(impersonates(admin, admin)).toBe(false)
  })

  it('não deixa o síndico impersonar ninguém', () => {
    expect(impersonates(manager, resident)).toBe(false)
  })

  it('não deixa o morador impersonar ninguém', () => {
    expect(impersonates(resident, manager)).toBe(false)
  })
})
