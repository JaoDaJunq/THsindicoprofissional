import { render } from '@testing-library/react'
import HomePage from '@/app/page'

const replace = vi.fn()
const useSession = vi.fn()

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }))
vi.mock('next-auth/react', () => ({ useSession: () => useSession() }))

beforeEach(() => {
  replace.mockReset()
  useSession.mockReset()
})

describe('HomePage', () => {
  it('sends a signed-out visitor to the sign-in screen', () => {
    useSession.mockReturnValue({ status: 'unauthenticated' })

    render(<HomePage />)

    expect(replace).toHaveBeenCalledWith('/signin')
  })

  it('sends a signed-in visitor into the app', () => {
    useSession.mockReturnValue({ status: 'authenticated' })

    render(<HomePage />)

    expect(replace).toHaveBeenCalledWith('/users')
  })

  it('waits while the session is still loading', () => {
    useSession.mockReturnValue({ status: 'loading' })

    render(<HomePage />)

    expect(replace).not.toHaveBeenCalled()
  })
})
