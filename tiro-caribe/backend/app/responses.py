from flask import jsonify


def ok(data=None, status=200):
    return jsonify({"success": True, "data": data}), status


def fail(message, status=400):
    return jsonify({"success": False, "error": message}), status