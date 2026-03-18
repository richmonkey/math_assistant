import argparse
import sys
from peewee import IntegrityError

from auth import hash_password
from database import User, close_database, init_database


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Create a new user in the database")
    parser.add_argument("--username", required=True, help="Username for the new user")
    parser.add_argument("--password", required=True, help="Password for the new user")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    username = args.username.strip()
    password = args.password

    if not username:
        print("Error: username cannot be empty", file=sys.stderr)
        return 2

    if not password:
        print("Error: password cannot be empty", file=sys.stderr)
        return 2

    init_database()
    try:
        user = User.create(username=username, password_hash=hash_password(password))
        print(f"User created successfully. id={user.id}, username={user.username}")
        return 0
    except IntegrityError:
        print(f"Error: username '{username}' already exists", file=sys.stderr)
        return 1
    finally:
        close_database()


if __name__ == "__main__":
    raise SystemExit(main())
