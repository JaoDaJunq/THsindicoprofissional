'use client'

import { Pagination } from '@heroui/react'
import type { ReactElement } from 'react'

export interface ListPaginationProps {
  page: number
  pageCount: number
  onPageChange: (page: number) => void
}

/** Page numbers as a plain list: the table never has enough pages to need windowing. */
export function pageNumbers(pageCount: number): number[] {
  return Array.from({ length: pageCount }, (_, index) => index + 1)
}

export function ListPagination({
  page,
  pageCount,
  onPageChange,
}: ListPaginationProps): ReactElement {
  return (
    <Pagination>
      <Pagination.Content>
        <Pagination.Item>
          <Pagination.Previous
            aria-label="Página anterior"
            isDisabled={page === 1}
            onPress={() => onPageChange(page - 1)}
          >
            Anterior
          </Pagination.Previous>
        </Pagination.Item>

        {pageNumbers(pageCount).map((number) => (
          <Pagination.Item key={number}>
            <Pagination.Link
              aria-label={`Página ${number}`}
              isActive={number === page}
              onPress={() => onPageChange(number)}
            >
              {number}
            </Pagination.Link>
          </Pagination.Item>
        ))}

        <Pagination.Item>
          <Pagination.Next
            aria-label="Próxima página"
            isDisabled={page === pageCount}
            onPress={() => onPageChange(page + 1)}
          >
            Próxima
          </Pagination.Next>
        </Pagination.Item>
      </Pagination.Content>
    </Pagination>
  )
}
