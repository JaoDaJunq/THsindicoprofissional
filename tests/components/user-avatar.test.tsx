import { render, screen } from '@testing-library/react'
import { UserAvatar } from '@/components/user-avatar'
import { buildUser } from '@/tests/support/build-user'

describe('UserAvatar', () => {
  it('names the photo after the person', () => {
    render(<UserAvatar user={buildUser()} />)

    expect(screen.getByLabelText('Foto de Ana Souza')).toBeInTheDocument()
  })

  it('falls back to the e-mail when the person has no name', () => {
    render(<UserAvatar user={buildUser({ name: null })} />)

    expect(screen.getByLabelText('Foto de ana@example.com')).toBeInTheDocument()
  })

  it('shows the initials while the photo has not loaded', () => {
    render(<UserAvatar user={buildUser({ image: 'https://example.com/ana.png' })} />)

    expect(screen.getByText('AS')).toBeInTheDocument()
  })
})
