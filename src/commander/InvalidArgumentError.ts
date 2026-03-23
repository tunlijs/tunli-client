export class InvalidArgumentError extends Error {
  readonly code = 'commander.invalidArgument'

  constructor(message: string) {
    super(message)
    this.name = 'CommanderError'
  }
}
