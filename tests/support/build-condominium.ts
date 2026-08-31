import type { Condominium } from '@/shared/types'

/**
 * One place that knows the shape of a Condominium in tests. When the model
 * gains a field, only this file changes — not every fixture.
 */
export function buildCondominium(overrides: Partial<Condominium> = {}): Condominium {
  return {
    id: '3f1a9c44-8e21-4d55-9b0a-6c7d8e9f0a1b',
    name: 'Residencial Aurora',
    address: 'Rua das Flores, 100 — Lajeado',
    cnpj: '12345678000199',
    phone: '5199999999',
    email: 'aurora@example.com',
    unitsCount: 40,
    blocksCount: 2,
    residentsCount: 120,
    deletedAt: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-02'),
    ...overrides,
  }
}
