/** jsdom has no matchMedia; this fakes one so the responsive dialog can be tested. */
export function setScreen(kind: 'mobile' | 'desktop'): void {
  const matches = kind === 'mobile'

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string): MediaQueryList =>
      ({
        matches,
        media: query,
        onchange: null,
        addEventListener: (): void => undefined,
        removeEventListener: (): void => undefined,
        addListener: (): void => undefined,
        removeListener: (): void => undefined,
        dispatchEvent: (): boolean => false,
      }) as unknown as MediaQueryList,
  })
}
