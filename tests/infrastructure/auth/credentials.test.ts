import { readCredentials } from '@/infrastructure/auth/credentials'

describe('readCredentials', () => {
  it('accepts a username and password pair', () => {
    expect(readCredentials({ username: 'admin', password: 'admin' })).toEqual({
      username: 'admin',
      password: 'admin',
    })
  })

  it('trims the username, since people paste spaces', () => {
    expect(readCredentials({ username: '  admin ', password: 'admin' })?.username).toBe('admin')
  })

  it('never trims the password, where a space is a real character', () => {
    expect(readCredentials({ username: 'admin', password: ' a b ' })?.password).toBe(' a b ')
  })

  it('rejects a missing username', () => {
    expect(readCredentials({ password: 'admin' })).toBeNull()
  })

  it('rejects a missing password', () => {
    expect(readCredentials({ username: 'admin' })).toBeNull()
  })

  it('rejects a blank username', () => {
    expect(readCredentials({ username: '   ', password: 'admin' })).toBeNull()
  })

  it('rejects values that are not strings', () => {
    expect(readCredentials({ username: 42, password: true })).toBeNull()
  })

  it('rejects nothing at all', () => {
    expect(readCredentials(undefined)).toBeNull()
  })
})
