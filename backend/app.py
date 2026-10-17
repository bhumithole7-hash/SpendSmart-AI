
from flask import Flask, jsonify, request
from flask_cors import CORS
import sqlite3
from pathlib import Path

app = Flask(__name__)
CORS(app)

DATABASE = Path(__file__).with_name("spendsmart.db")


def get_db_connection():
    connection = sqlite3.connect(DATABASE)
    connection.row_factory = sqlite3.Row
    return connection


def init_db():
    connection = get_db_connection()

    connection.execute("""
        CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            amount REAL NOT NULL,
            category TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    connection.commit()
    connection.close()


init_db()


@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "message": "Welcome to SpendSmart AI Backend!",
        "status": "success"
    })


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "healthy",
        "message": "SpendSmart AI API is running"
    })


@app.route("/api/expenses", methods=["GET"])
def get_expenses():
    connection = get_db_connection()

    rows = connection.execute(
        "SELECT * FROM expenses ORDER BY id DESC"
    ).fetchall()

    connection.close()

    expenses = [dict(row) for row in rows]

    return jsonify(expenses), 200


@app.route("/api/expenses", methods=["POST"])
def add_expense():
    data = request.get_json(silent=True) or {}

    title = data.get("title")
    amount = data.get("amount")
    category = data.get("category")

    if not isinstance(title, str) or not title.strip():
        return jsonify({
            "error": "Expense title is required"
        }), 400

    if isinstance(amount, bool) or amount is None:
        return jsonify({
            "error": "Amount must be a valid number"
        }), 400

    try:
        amount = float(amount)
    except (TypeError, ValueError):
        return jsonify({
            "error": "Amount must be a valid number"
        }), 400

    if amount <= 0:
        return jsonify({
            "error": "Amount must be greater than zero"
        }), 400

    if not amount.is_integer():
        return jsonify({
            "error": "Decimal amounts are not allowed. Enter a whole number."
        }), 400

    amount = int(amount)

    if not isinstance(category, str) or not category.strip():
        return jsonify({
            "error": "Expense category is required"
        }), 400

    connection = get_db_connection()

    cursor = connection.execute(
        """
        INSERT INTO expenses (title, amount, category)
        VALUES (?, ?, ?)
        """,
        (title.strip(), amount, category.strip())
    )

    connection.commit()

    row = connection.execute(
        "SELECT * FROM expenses WHERE id = ?",
        (cursor.lastrowid,)
    ).fetchone()

    connection.close()

    return jsonify(dict(row)), 201


@app.route("/api/expenses/<int:expense_id>", methods=["DELETE"])
def delete_expense(expense_id):
    connection = get_db_connection()

    cursor = connection.execute(
        "DELETE FROM expenses WHERE id = ?",
        (expense_id,)
    )

    connection.commit()
    deleted = cursor.rowcount

    connection.close()

    if deleted == 0:
        return jsonify({
            "error": "Expense not found"
        }), 404

    return jsonify({
        "message": "Expense deleted successfully"
    }), 200


if __name__ == "__main__":
    app.run(debug=True)