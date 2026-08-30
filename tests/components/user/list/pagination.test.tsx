import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UsersPagination, pageNumbers } from '@/components/user/list/pagination'

const onPageChange = vi.fn()
beforeEach(() => onPageChange.mockReset())

describe('pageNumbers', () => {
  it('lists every page starting at one', () => {
    expect(pageNumbers(3)).toEqual([1, 2, 3])
  })
})

describe('UsersPagination', () => {
  it('shows one link per page', () => {
    render(<UsersPagination page={1} pageCount={3} onPageChange={onPageChange} />)

    expect(screen.getByRole('button', { name: 'Página 2' })).toBeInTheDocument()
  })

  it('moves to the chosen page', async () => {
    render(<UsersPagination page={1} pageCount={3} onPageChange={onPageChange} />)

    await userEvent.click(screen.getByRole('button', { name: 'Página 3' }))

    expect(onPageChange).toHaveBeenCalledWith(3)
  })

  it('cannot go back from the first page', () => {
    render(<UsersPagination page={1} pageCount={3} onPageChange={onPageChange} />)

    expect(screen.getByRole('button', { name: 'Página anterior' })).toBeDisabled()
  })

  it('cannot go forward from the last page', () => {
    render(<UsersPagination page={3} pageCount={3} onPageChange={onPageChange} />)

    expect(screen.getByRole('button', { name: 'Próxima página' })).toBeDisabled()
  })
  it('goes back one page', async () => {
    render(<UsersPagination page={2} pageCount={3} onPageChange={onPageChange} />)

    await userEvent.click(screen.getByRole('button', { name: 'Página anterior' }))

    expect(onPageChange).toHaveBeenCalledWith(1)
  })

  it('goes forward one page', async () => {
    render(<UsersPagination page={2} pageCount={3} onPageChange={onPageChange} />)

    await userEvent.click(screen.getByRole('button', { name: 'Próxima página' }))

    expect(onPageChange).toHaveBeenCalledWith(3)
  })
})
