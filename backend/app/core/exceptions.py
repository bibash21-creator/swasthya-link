"""Custom exceptions and exception handlers for the application."""

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from jose.exceptions import JWTError
import logging

logger = logging.getLogger(__name__)


class MedConnectException(Exception):
    """Base exception for MedConnect application."""
    
    def __init__(self, message: str, status_code: int = 500, details: dict = None):
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


class AuthenticationError(MedConnectException):
    """Raised when authentication fails."""
    
    def __init__(self, message: str = "Authentication failed", details: dict = None):
        super().__init__(message, status.HTTP_401_UNAUTHORIZED, details)


class AuthorizationError(MedConnectException):
    """Raised when user is not authorized to perform an action."""
    
    def __init__(self, message: str = "Not authorized", details: dict = None):
        super().__init__(message, status.HTTP_403_FORBIDDEN, details)


class ResourceNotFoundError(MedConnectException):
    """Raised when a requested resource is not found."""
    
    def __init__(self, resource: str = "Resource", details: dict = None):
        message = f"{resource} not found"
        super().__init__(message, status.HTTP_404_NOT_FOUND, details)


class ValidationError(MedConnectException):
    """Raised when input validation fails."""
    
    def __init__(self, message: str = "Validation error", details: dict = None):
        super().__init__(message, status.HTTP_400_BAD_REQUEST, details)


class ConflictError(MedConnectException):
    """Raised when there's a conflict with existing data."""
    
    def __init__(self, message: str = "Conflict error", details: dict = None):
        super().__init__(message, status.HTTP_409_CONFLICT, details)


class RateLimitError(MedConnectException):
    """Raised when rate limit is exceeded."""
    
    def __init__(self, message: str = "Rate limit exceeded", details: dict = None):
        super().__init__(message, status.HTTP_429_TOO_MANY_REQUESTS, details)


def setup_exception_handlers(app: FastAPI) -> None:
    """Configure exception handlers for the FastAPI application."""
    
    @app.exception_handler(MedConnectException)
    async def medconnect_exception_handler(request: Request, exc: MedConnectException):
        """Handle custom MedConnect exceptions."""
        logger.warning(f"MedConnectException: {exc.message}", extra={
            "path": request.url.path,
            "status_code": exc.status_code,
            "details": exc.details
        })
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": exc.__class__.__name__,
                    "message": exc.message,
                    "details": exc.details
                }
            }
        )
    
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        """Handle FastAPI request validation errors."""
        errors = []
        for error in exc.errors():
            errors.append({
                "field": ".".join(str(x) for x in error["loc"]),
                "message": error["msg"],
                "type": error["type"]
            })
        
        logger.warning(f"Validation error: {errors}", extra={"path": request.url.path})
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "error": {
                    "code": "ValidationError",
                    "message": "Request validation failed",
                    "details": {"errors": errors}
                }
            }
        )
    
    @app.exception_handler(IntegrityError)
    async def integrity_error_handler(request: Request, exc: IntegrityError):
        """Handle database integrity errors."""
        logger.error(f"Database integrity error: {str(exc)}", extra={"path": request.url.path})
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={
                "error": {
                    "code": "ConflictError",
                    "message": "Data conflict occurred",
                    "details": {"description": "The operation conflicts with existing data"}
                }
            }
        )
    
    @app.exception_handler(SQLAlchemyError)
    async def sqlalchemy_error_handler(request: Request, exc: SQLAlchemyError):
        """Handle general database errors."""
        logger.error(f"Database error: {str(exc)}", extra={"path": request.url.path})
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": {
                    "code": "DatabaseError",
                    "message": "An error occurred while processing your request",
                    "details": {}
                }
            }
        )
    
    @app.exception_handler(JWTError)
    async def jwt_error_handler(request: Request, exc: JWTError):
        """Handle JWT token errors."""
        logger.warning(f"JWT error: {str(exc)}", extra={"path": request.url.path})
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={
                "error": {
                    "code": "AuthenticationError",
                    "message": "Invalid or expired token",
                    "details": {}
                }
            }
        )
    
    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        """Handle all unhandled exceptions."""
        logger.exception(f"Unhandled exception: {str(exc)}", extra={"path": request.url.path})
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": {
                    "code": "InternalServerError",
                    "message": "An unexpected error occurred",
                    "details": {}
                }
            }
        )
