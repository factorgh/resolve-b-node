export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  errors?: any;
  statusCode: number;
}

export const responseFactory = {
  success: <T>(data: T, message: string = 'Success', statusCode: number = 200): ApiResponse<T> => ({
    success: true,
    message,
    data,
    statusCode,
  }),
  error: (message: string = 'Error', errors: any = null, statusCode: number = 400): ApiResponse<null> => ({
    success: false,
    message,
    errors,
    statusCode,
  }),
  unauthorized: (message: string = 'Unauthorized'): ApiResponse<null> => ({
    success: false,
    message,
    statusCode: 401,
  }),
  notFound: (message: string = 'Not Found'): ApiResponse<null> => ({
    success: false,
    message,
    statusCode: 404,
  }),
};
