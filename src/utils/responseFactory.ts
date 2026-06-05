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
  error: (message: string = 'Error', errors: any = null, statusCode: number = 400): ApiResponse<null> => {
    let sanitizedMessage = message;
    let sanitizedErrors = errors;

    const sensitiveKeywords = [
      'mongo', 'database', 'connect', 'paystack', 'axios', 'jwt', 'token', 
      'undefined', 'null', 'referenceerror', 'typeerror', 'network', 'refused'
    ];
    
    const lowerMessage = message.toLowerCase();
    const containsSensitive = sensitiveKeywords.some(keyword => lowerMessage.includes(keyword));

    if (statusCode === 500 || containsSensitive) {
      sanitizedMessage = 'An unexpected internal server error occurred. Please contact system support.';
      sanitizedErrors = null; // Wipe out raw system details
    }

    return {
      success: false,
      message: sanitizedMessage,
      errors: sanitizedErrors,
      statusCode,
    };
  },
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
