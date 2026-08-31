export interface PageRequest {
  page: number
  pageSize: number
}

export interface Page<TItem> {
  items: readonly TItem[]
  total: number
  page: number
  pageSize: number
  pageCount: number
}

export const DEFAULT_PAGE_SIZE = 10
export const MAX_PAGE_SIZE = 100
