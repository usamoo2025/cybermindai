import os

import psycopg
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()


def get_connection():

    # Read database configuration
    db_config = {
        "host": os.getenv("DB_HOST", "localhost"),
        "port": os.getenv("DB_PORT", "5432"),
        "dbname": os.getenv("DB_NAME"),
        "user": os.getenv("DB_USER"),
        "password": os.getenv("DB_PASSWORD")
    }

    # Check required configuration
    required_fields = ["dbname", "user", "password"]

    for field in required_fields:
        if not db_config[field]:
            raise ValueError(
                f"Missing database configuration: {field}"
            )

    # Connect to PostgreSQL
    connection = psycopg.connect(**db_config)

    return connection
