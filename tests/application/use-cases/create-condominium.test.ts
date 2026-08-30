import { createCondominium } from '@/application/use-cases/create-condominium'
import { InMemoryCondominiumRepository } from '@/tests/support/in-memory-condominium-repository'

const input = {
  name: 'Residencial Aurora',
  address: 'Rua das Flores, 100',
  cnpj: '12345678000199',
}

describe('createCondominium', () => {
  it('stores a condominium', async () => {
    const repository = new InMemoryCondominiumRepository()

    const result = await createCondominium(repository, input)

    expect(result.ok && result.value.name).toBe('Residencial Aurora')
  })

  it('trims the name before storing it', async () => {
    const repository = new InMemoryCondominiumRepository()

    const result = await createCondominium(repository, { ...input, name: '  Aurora  ' })

    expect(result.ok && result.value.name).toBe('Aurora')
  })

  it('refuses a blank name', async () => {
    const repository = new InMemoryCondominiumRepository()

    const result = await createCondominium(repository, { ...input, name: '   ' })

    expect(result).toEqual({ ok: false, error: 'invalid-name' })
  })

  it('refuses a blank address', async () => {
    const repository = new InMemoryCondominiumRepository()

    const result = await createCondominium(repository, { ...input, address: '' })

    expect(result).toEqual({ ok: false, error: 'invalid-address' })
  })

  it('keeps only the digits of the cnpj', async () => {
    const repository = new InMemoryCondominiumRepository()

    const result = await createCondominium(repository, {
      ...input,
      cnpj: '12.345.678/0001-99',
    })

    expect(result.ok && result.value.cnpj).toBe('12345678000199')
  })

  it('refuses a cnpj that does not have fourteen digits', async () => {
    const repository = new InMemoryCondominiumRepository()

    const result = await createCondominium(repository, { ...input, cnpj: '123' })

    expect(result).toEqual({ ok: false, error: 'invalid-cnpj' })
  })

  it('stores a condominium without a cnpj', async () => {
    const repository = new InMemoryCondominiumRepository()

    const result = await createCondominium(repository, { ...input, cnpj: '' })

    expect(result.ok && result.value.cnpj).toBeNull()
  })

  it('refuses a duplicate cnpj instead of creating a second condominium', async () => {
    const repository = new InMemoryCondominiumRepository()
    await createCondominium(repository, input)

    const result = await createCondominium(repository, { ...input, name: 'Outro' })

    expect(result).toEqual({ ok: false, error: 'cnpj-already-registered' })
  })

  it('refuses a negative unit count', async () => {
    const repository = new InMemoryCondominiumRepository()

    const result = await createCondominium(repository, { ...input, unitsCount: -1 })

    expect(result).toEqual({ ok: false, error: 'invalid-count' })
  })

  it('stores a condominium without a phone', async () => {
    const repository = new InMemoryCondominiumRepository()

    const result = await createCondominium(repository, { ...input, phone: '  ' })

    expect(result.ok && result.value.phone).toBeNull()
  })

  it('lowercases the e-mail', async () => {
    const repository = new InMemoryCondominiumRepository()

    const result = await createCondominium(repository, { ...input, email: 'AURORA@X.COM' })

    expect(result.ok && result.value.email).toBe('aurora@x.com')
  })

  it('stores a condominium without an e-mail', async () => {
    const repository = new InMemoryCondominiumRepository()

    const result = await createCondominium(repository, { ...input, email: '' })

    expect(result.ok && result.value.email).toBeNull()
  })

  it('refuses an e-mail without an at sign', async () => {
    const repository = new InMemoryCondominiumRepository()

    const result = await createCondominium(repository, { ...input, email: 'nao-e-email' })

    expect(result).toEqual({ ok: false, error: 'invalid-email' })
  })
})
