export class SpotifyApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public retryAfter?: number,
  ) {
    super(message)
    this.name = 'SpotifyApiError'
  }
}

export const isAuthError = (e: unknown) => e instanceof SpotifyApiError && e.status === 401
export const isForbidden = (e: unknown) => e instanceof SpotifyApiError && e.status === 403
