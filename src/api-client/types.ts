export type ApiResponse =
  | { isError: true; data: undefined; error: Error; status: number }
  | { isError: false; data: Record<string, unknown>; error: undefined; status: number }

export type ApiResult<T> = {
  data: T
  error?: undefined
  response: ApiResponse
} | {
  data?: undefined
  error: Error
  response: ApiResponse
}

export type RequestOptions = {
  override?: {
    server?: string
  }
}
