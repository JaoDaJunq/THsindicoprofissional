import type { NextConfig } from 'next'

const configuration: NextConfig = {
  // Native module: must stay a real Node require, never bundled for the browser.
  serverExternalPackages: ['argon2'],
}

export default configuration
