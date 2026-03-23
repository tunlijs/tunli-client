export type UpdateResult =
  | { status: 'progress'; message: string }
  | { status: 'success' }
  | { status: 'failed'; reason: string }
