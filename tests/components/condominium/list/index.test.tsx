import { render, screen } from '@testing-library/react'
import { CondominiumList } from '@/components/condominium/list'
import { buildCondominium } from '@/tests/support/build-condominium'

const noop = (): void => undefined

describe('CondominiumList', () => {
  it('renders both shapes and lets the CSS pick one', () => {
    render(
      <CondominiumList
        condominiums={[buildCondominium()]}
        firstIndex={0}
        onEdit={noop}
        onDeactivate={noop}
        onActivate={noop}
      />,
    )

    expect(screen.getAllByText('Residencial Aurora').length).toBeGreaterThan(1)
  })
})
