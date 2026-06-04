class ApiError extends Error {
  constructor(status = 500, message = "Error", details = null, code = null) {
    super(message);

    this.name = this.constructor.name;
    this.status = status;
    this.message = message;
    this.details = details;
    this.code = code;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export default ApiError;
