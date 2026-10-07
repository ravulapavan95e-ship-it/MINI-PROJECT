import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator


DATABASE_PATH = Path(__file__).resolve().parent / "data" / "learning_assistant.db"


def connect() -> sqlite3.Connection:
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DATABASE_PATH, timeout=10)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


@contextmanager
def database_connection() -> Iterator[sqlite3.Connection]:
    connection = connect()
    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def initialize_database() -> None:
    with database_connection() as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS learners (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                skill_level TEXT NOT NULL,
                learning_goal TEXT NOT NULL,
                study_time INTEGER NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS roadmaps (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                learner_id INTEGER NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                roadmap_data TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS topics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                roadmap_id INTEGER NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
                knowledge_topic_id TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                practice_question TEXT NOT NULL,
                estimated_minutes INTEGER NOT NULL,
                order_index INTEGER NOT NULL,
                completed INTEGER NOT NULL DEFAULT 0 CHECK (completed IN (0, 1)),
                UNIQUE (roadmap_id, knowledge_topic_id)
            );

            CREATE TABLE IF NOT EXISTS quiz_results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                learner_id INTEGER NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
                topic TEXT NOT NULL,
                knowledge_topic_id TEXT NOT NULL,
                score REAL NOT NULL CHECK (score >= 0 AND score <= 100),
                total_questions INTEGER NOT NULL CHECK (total_questions > 0),
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_roadmaps_learner_id
                ON roadmaps(learner_id);
            CREATE INDEX IF NOT EXISTS idx_topics_roadmap_id
                ON topics(roadmap_id);
            CREATE INDEX IF NOT EXISTS idx_quiz_results_learner_id
                ON quiz_results(learner_id);
            """
        )
