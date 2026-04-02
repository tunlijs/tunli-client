export class UserFacingError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UserFacingError'
  }
}

export class VersionIncompatibleError extends UserFacingError {
  constructor(message: string) {
    super(message)
    this.name = 'VersionIncompatibleError'
  }
}

export class ServerTooOldError extends UserFacingError {
  constructor(message: string) {
    super(message)
    this.name = 'ServerTooOldError'
  }
}
