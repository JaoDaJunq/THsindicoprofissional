import { listUsers } from '@/application/use-cases/list-users'
import { InMemoryUserRepository } from '@/tests/support/in-memory-user-repository'

async function repositoryWithPeople(): Promise<InMemoryUserRepository> {
  const repository = new InMemoryUserRepository()
  await repository.create({ email: 'ana@example.com', name: 'Ana Souza', image: null })
  await repository.create({ email: 'bruno@example.com', name: 'Bruno Lima', image: null })
  await repository.create({ email: 'carla@example.com', name: 'Carla Dias', image: null })
  return repository
}

describe('listUsers', () => {
  it('returns every active person by default', async () => {
    const result = await listUsers(await repositoryWithPeople(), {}, { page: 1, pageSize: 10 })

    expect(result.ok && result.value.total).toBe(3)
  })

  it('searches by name', async () => {
    const result = await listUsers(
      await repositoryWithPeople(),
      { search: 'bruno' },
      { page: 1, pageSize: 10 },
    )

    expect(result.ok && result.value.items.map((user) => user.email)).toEqual([
      'bruno@example.com',
    ])
  })

  it('searches by e-mail', async () => {
    const result = await listUsers(
      await repositoryWithPeople(),
      { search: 'carla@' },
      { page: 1, pageSize: 10 },
    )

    expect(result.ok && result.value.total).toBe(1)
  })

  it('hides people who were soft deleted', async () => {
    const repository = await repositoryWithPeople()
    const all = await repository.list({}, { page: 1, pageSize: 10 })
    const first = all.items[0]
    if (!first) throw new Error('fixture failed')
    await repository.softDelete(first.id)

    const result = await listUsers(repository, {}, { page: 1, pageSize: 10 })

    expect(result.ok && result.value.total).toBe(2)
  })

  it('splits the result into pages', async () => {
    const result = await listUsers(await repositoryWithPeople(), {}, { page: 1, pageSize: 2 })

    expect(result.ok && result.value.items).toHaveLength(2)
    expect(result.ok && result.value.pageCount).toBe(2)
  })

  it('refuses a page below one', async () => {
    const result = await listUsers(await repositoryWithPeople(), {}, { page: 0, pageSize: 10 })

    expect(result).toEqual({ ok: false, error: 'invalid-page' })
  })

  it('refuses a page size beyond the maximum, which would dump the table', async () => {
    const result = await listUsers(await repositoryWithPeople(), {}, { page: 1, pageSize: 5000 })

    expect(result).toEqual({ ok: false, error: 'invalid-page-size' })
  })
})
