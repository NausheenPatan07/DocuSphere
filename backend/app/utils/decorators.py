
from functools import wraps
from flask import jsonify, request
from flask_jwt_extended import get_jwt


def role_required(*allowed_roles):
    """
    Restrict access to users with specific roles.
    Use this together with @jwt_required().
    """

    def decorator(function):
        @wraps(function)
        def wrapper(*args, **kwargs):

            claims = get_jwt()
            user_role = claims.get("role")

            if user_role not in allowed_roles:
                return jsonify({
                    "status": "error",
                    "message": "You do not have permission to access this resource"
                }), 403

            return function(*args, **kwargs)

        return wrapper

    return decorator


def division_required(function):
    """
    Allow access only to users belonging to the requested division.
    The division ID is supplied through the division_id query parameter.
    """

    @wraps(function)
    def wrapper(*args, **kwargs):

        claims = get_jwt()
        user_division = claims.get("division_id")

        requested_division = request.args.get("division_id")

        if not requested_division:
            return jsonify({
                "status": "error",
                "message": "Division ID is required"
            }), 400

        if user_division != requested_division:
            return jsonify({
                "status": "error",
                "message": "You cannot access documents from another division"
            }), 403

        return function(*args, **kwargs)

    return wrapper

