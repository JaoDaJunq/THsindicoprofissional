import { Argon2PasswordHasher } from '@/infrastructure/security/argon2-password-hasher'

const hasher = new Argon2PasswordHasher()

describe('Argon2PasswordHasher', () => {
  it('never stores the password in the clear', async () => {
    const hash = await hasher.hash('minha-senha')

    expect(hash).not.toContain('minha-senha')
    expect(hash.startsWith('$argon2id$')).toBe(true)
  })

  it('accepts the right password', async () => {
    const hash = await hasher.hash('minha-senha')

    expect(await hasher.verify(hash, 'minha-senha')).toBe(true)
  })

  it('rejects a wrong password', async () => {
    const hash = await hasher.hash('minha-senha')

    expect(await hasher.verify(hash, 'outra-senha')).toBe(false)
  })

  it('salts, so the same password hashes differently every time', async () => {
    expect(await hasher.hash('igual')).not.toBe(await hasher.hash('igual'))
  })

  it('treats a corrupted stored hash as a wrong password instead of crashing', async () => {
    expect(await hasher.verify('não-é-um-hash', 'qualquer')).toBe(false)
  })
})
