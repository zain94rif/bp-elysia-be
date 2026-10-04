export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number = 400
  ) {
    super(message);
    this.name = "AppError";
  }

  static badRequest(message: string, code = "VALIDATION_ERROR") {
    return new AppError(code, message, 400);
  }

  static unauthorized(message = "unauthorized", code = "UNAUTHORIZED") {
    return new AppError(code, message, 401);
  }

  static forbidden(message = "forbidden", code = "FORBIDDEN") {
    return new AppError(code, message, 403);
  }

  static notFound(message = "resource not found", code = "NOT_FOUND") {
    return new AppError(code, message, 404);
  }

  static conflict(message: string, code = "CONFLICT") {
    return new AppError(code, message, 409);
  }

  static internal(message = "internal server error", code = "INTERNAL_ERROR") {
    return new AppError(code, message, 500);
  }
}
