import type {ApiResponse, ApiResult} from "#api-client/types";

export const errorResponse =<T>(response: ApiResponse): ApiResult<T> => {
  return {
    response,
    error: response.error as Error,
  }
}

export const successResponse = <T>(response: ApiResponse, data: T): ApiResult<T> => {
  return {
    response,
    data,
  }
}
