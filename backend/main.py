"""Render deployment shim that exposes the package app object.

Using `uvicorn main:app` from the backend root will work because this module
imports the actual FastAPI app from `app.main`.
"""

from app.main import app  # noqa: F401
