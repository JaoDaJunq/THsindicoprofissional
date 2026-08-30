'use client'

import { Drawer, Modal } from '@heroui/react'
import type { ReactElement, ReactNode } from 'react'
import { useIsMobile } from '@/hooks/use-is-mobile'

export interface ResponsiveDialogProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  title: string
  children: ReactNode
  footer?: ReactNode
}

/**
 * One dialog, two shapes: a centred modal on the desktop and a bottom drawer
 * on the phone, where a centred modal fights the on-screen keyboard.
 */
export function ResponsiveDialog({
  isOpen,
  onOpenChange,
  title,
  children,
  footer,
}: ResponsiveDialogProps): ReactElement {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <Drawer isOpen={isOpen} onOpenChange={onOpenChange}>
        <Drawer.Backdrop>
          <Drawer.Content placement="bottom">
            <Drawer.Dialog data-testid="filters-drawer">
              <Drawer.Header>
                <Drawer.Heading>{title}</Drawer.Heading>
              </Drawer.Header>
              <Drawer.Body>{children}</Drawer.Body>
              {footer && <Drawer.Footer>{footer}</Drawer.Footer>}
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </Drawer>
    )
  }

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog data-testid="filters-modal">
            <Modal.Header>
              <Modal.Heading>{title}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>{children}</Modal.Body>
            {footer && <Modal.Footer>{footer}</Modal.Footer>}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}
