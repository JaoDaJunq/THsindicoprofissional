'use client'

import { Button, SearchField } from '@heroui/react'
import { useState } from 'react'
import type { ReactElement } from 'react'
import { DeactivateCondominiumDialog } from '@/components/condominium/deactivate-dialog'
import { CondominiumFiltersDialog } from '@/components/condominium/filters-dialog'
import { CondominiumFormDialog } from '@/components/condominium/form-dialog'
import { CondominiumList } from '@/components/condominium/list'
import { FilterButton } from '@/components/list/filter-button'
import { ListPagination } from '@/components/list/pagination'
import { isAdmin } from '@/domain/authorization'
import { useAccount } from '@/hooks/use-account'
import { useCondominiums } from '@/hooks/use-condominiums'
import type { Condominium, CondominiumFilters } from '@/shared/types'

/** Null means nothing is being edited; a condominium (or `'new'`) opens the form. */
type FormTarget = Condominium | 'new' | null

export default function CondominiumsPage(): ReactElement {
  const [filters, setFilters] = useState<CondominiumFilters>({})
  const [page, setPage] = useState(1)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [form, setForm] = useState<FormTarget>(null)
  const [toDeactivate, setToDeactivate] = useState<Condominium | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const { page: result, isLoading, error } = useCondominiums(filters, page, reloadToken)
  const { account } = useAccount(true)
  const canCreate = account !== null && isAdmin(account)

  function reload(): void {
    setReloadToken((token) => token + 1)
  }

  function search(term: string): void {
    setPage(1)
    setFilters((current) => ({ ...current, search: term || undefined }))
  }

  function applyFilters(next: CondominiumFilters): void {
    setPage(1)
    setFilters(next)
  }

  async function activate(condominium: Condominium): Promise<void> {
    await fetch(`/api/condominiums/${condominium.id}/restore`, { method: 'POST' })
    reload()
  }

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">Condomínios</h1>

      <div className="flex items-center gap-2">
        <SearchField aria-label="Buscar condomínios" className="flex-1" onChange={search}>
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder="escreva para busca..." />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>

        <FilterButton onPress={() => setIsFilterOpen(true)} />
      </div>

      {canCreate && (
        <Button
          variant="primary"
          className="w-full sm:w-auto sm:self-start"
          onPress={() => setForm('new')}
        >
          Novo condomínio
        </Button>
      )}

      {error && (
        <p role="alert" className="text-danger text-sm">
          {error}
        </p>
      )}

      {isLoading && !result ? (
        <p className="text-default-500 text-sm">Carregando…</p>
      ) : result && result.items.length === 0 ? (
        <p className="text-default-500 text-sm">Nenhum condomínio encontrado.</p>
      ) : (
        result && (
          <CondominiumList
            condominiums={result.items}
            firstIndex={(result.page - 1) * result.pageSize}
            onEdit={setForm}
            onDeactivate={setToDeactivate}
            onActivate={(condominium) => void activate(condominium)}
          />
        )
      )}

      {result && result.pageCount > 1 && (
        <ListPagination page={result.page} pageCount={result.pageCount} onPageChange={setPage} />
      )}

      {form && (
        <CondominiumFormDialog
          isOpen
          condominium={form === 'new' ? null : form}
          onOpenChange={(isOpen) => !isOpen && setForm(null)}
          onSaved={reload}
        />
      )}

      <DeactivateCondominiumDialog
        condominium={toDeactivate}
        onOpenChange={(isOpen) => !isOpen && setToDeactivate(null)}
        onDeleted={reload}
      />

      <CondominiumFiltersDialog
        isOpen={isFilterOpen}
        onOpenChange={setIsFilterOpen}
        filters={filters}
        onApply={applyFilters}
      />
    </main>
  )
}
