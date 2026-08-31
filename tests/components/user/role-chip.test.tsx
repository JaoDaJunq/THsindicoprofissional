import { render, screen } from '@testing-library/react'
import { RoleChip } from '@/components/user/role-chip'

describe('RoleChip', () => {
  it('nomeia o administrador do sistema', () => {
    render(<RoleChip role="ADMIN" />)

    expect(screen.getByText('Administrador')).toBeInTheDocument()
  })

  it('nomeia o síndico', () => {
    render(<RoleChip role="MANAGER" />)

    expect(screen.getByText('Síndico')).toBeInTheDocument()
  })

  it('nomeia o morador', () => {
    render(<RoleChip role="RESIDENT" />)

    expect(screen.getByText('Morador')).toBeInTheDocument()
  })
})
