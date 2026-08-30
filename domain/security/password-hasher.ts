/** Port. Keeps the hashing library out of the use cases. */
export interface PasswordHasher {
  hash(plain: string): Promise<string>
  verify(hash: string, plain: string): Promise<boolean>
}
