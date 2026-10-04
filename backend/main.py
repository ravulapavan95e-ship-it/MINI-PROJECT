from pathlib import Path
from typing import List

import json

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from chatbot import find_best_topic


app = FastAPI(
    title="Personalized Learning Assistant",
    version="1.0.0",
    description="Hybrid intelligent learning assistant"
)


# -----------------------------
# CORS
# -----------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://mini-project-1-sex1.onrender.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -----------------------------
# Knowledge Base
# -----------------------------

BASE_DIR = Path(__file__).resolve().parent
KNOWLEDGE_FILE = BASE_DIR / "knowledge" / "python.json"


def load_knowledge():
    if not KNOWLEDGE_FILE.exists():
        return {
            "subject": "Python",
            "topics": []
        }

    with open(KNOWLEDGE_FILE, "r", encoding="utf-8") as file:
        return json.load(file)


# -----------------------------
# Request Models
# -----------------------------

class ChatRequest(BaseModel):
    question: str


class LearningPathRequest(BaseModel):
    goal: str
    current_level: str
    minutes_per_day: int = Field(ge=10, le=480)
    completed_topics: List[str] = Field(default_factory=list)


class QuizRequest(BaseModel):
    topic_id: str
    user_answer: str = Field(min_length=1, max_length=500)


# -----------------------------
# Basic Routes
# -----------------------------

@app.get("/")
def home():
    return {
        "message": "Personalized Learning Assistant API is running"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }


@app.get("/topics")
def get_topics():
    knowledge = load_knowledge()

    return {
        "subject": knowledge.get("subject", "Python"),
        "topics": knowledge.get("topics", [])
    }


# -----------------------------
# Chatbot
# -----------------------------

@app.post("/chat")
def chat(request: ChatRequest):

    result = find_best_topic(request.question)

    if result is None:
        return {
            "success": False,
            "message": "Sorry, I could not find a matching topic in my knowledge base."
        }

    return {
        "success": True,
        "response": result
    }


# -----------------------------
# Personalized Learning Path
# -----------------------------

@app.post("/learning-path")
def generate_learning_path(request: LearningPathRequest):

    knowledge = load_knowledge()
    all_topics = knowledge.get("topics", [])

    requested_level = request.current_level.strip().lower()

    completed = {
        topic_id.strip().lower()
        for topic_id in request.completed_topics
    }

    # Select topics according to level
    level_topics = [
        topic
        for topic in all_topics
        if topic.get("level", "").lower() == requested_level
    ]

    # If level does not exist, use all topics
    if not level_topics:
        level_topics = all_topics

    # -----------------------------
    # Goal matching
    # -----------------------------

    goal = request.goal.strip().lower()

    goal_words = set(
        goal
        .replace(",", " ")
        .replace(".", " ")
        .split()
    )

    matched_topics = []

    for topic in level_topics:

        text = " ".join([
            topic.get("title", ""),
            topic.get("id", ""),
            " ".join(topic.get("keywords", [])),
        ]).lower()

        if (
            any(
                word in text
                for word in goal_words
                if len(word) > 2
            )
            or "python" in goal
        ):
            matched_topics.append(topic)

    if not matched_topics:
        matched_topics = level_topics

    # -----------------------------
    # Remove completed topics
    # -----------------------------

    remaining_topics = [
        topic
        for topic in matched_topics
        if topic.get("id", "").lower() not in completed
    ]

    # -----------------------------
    # Add prerequisites
    # -----------------------------

    ordered_topics = []
    added_ids = set()

    def add_topic_with_prerequisites(topic):

        topic_id = topic.get("id")

        if not topic_id or topic_id in added_ids:
            return

        prerequisites = topic.get("prerequisites", [])

        for prerequisite in prerequisites:

            prerequisite_topic = next(
                (
                    item
                    for item in all_topics
                    if item.get("id") == prerequisite
                ),
                None
            )

            if (
                prerequisite_topic
                and prerequisite_topic.get("id") not in completed
            ):
                add_topic_with_prerequisites(
                    prerequisite_topic
                )

        if topic_id not in completed:

            ordered_topics.append(topic)
            added_ids.add(topic_id)

    for topic in remaining_topics:
        add_topic_with_prerequisites(topic)

    # -----------------------------
    # Remove duplicates
    # -----------------------------

    final_topics = []

    seen = set()

    for topic in ordered_topics:

        topic_id = topic.get("id")

        if topic_id and topic_id not in seen:

            final_topics.append(topic)
            seen.add(topic_id)

    # -----------------------------
    # Create roadmap
    # -----------------------------

    roadmap = []

    estimated_minutes_per_topic = 60

    for index, topic in enumerate(final_topics, start=1):

        roadmap.append({
            "step": index,
            "topic_id": topic.get("id"),
            "topic": topic.get(
                "title",
                "Unknown Topic"
            ),
            "explanation": topic.get(
                "explanation",
                ""
            ),
            "estimated_minutes": estimated_minutes_per_topic,
            "practice_question": topic.get(
                "practice_question",
                ""
            )
        })

    # -----------------------------
    # Estimate study duration
    # -----------------------------

    total_minutes = (
        len(roadmap)
        * estimated_minutes_per_topic
    )

    estimated_days = 0

    if request.minutes_per_day > 0:

        estimated_days = (
            total_minutes
            + request.minutes_per_day
            - 1
        ) // request.minutes_per_day

    return {
        "goal": request.goal,
        "current_level": request.current_level,
        "minutes_per_day": request.minutes_per_day,
        "estimated_total_minutes": total_minutes,
        "estimated_days": estimated_days,
        "completed_topics": request.completed_topics,
        "remaining_topics": len(roadmap),
        "roadmap": roadmap
    }


# -----------------------------
# Practice Quiz
# -----------------------------

def normalize_answer(answer: str) -> str:

    return " ".join(
        answer
        .lower()
        .strip()
        .split()
    )


@app.post("/quiz")
def submit_quiz(request: QuizRequest):

    knowledge = load_knowledge()

    topics = knowledge.get("topics", [])

    # Find requested topic
    topic = next(
        (
            item
            for item in topics
            if item.get("id", "").lower()
            == request.topic_id.lower()
        ),
        None
    )

    if topic is None:

        return {
            "success": False,
            "message": "Topic not found."
        }

    correct_answer = topic.get(
        "answer",
        ""
    )

    user_answer = normalize_answer(
        request.user_answer
    )

    expected_answer = normalize_answer(
        correct_answer
    )

    # Exact normalized comparison
    is_correct = (
        user_answer == expected_answer
    )

    if is_correct:

        return {
            "success": True,
            "correct": True,
            "score": 100,
            "topic_id": topic.get("id"),
            "topic": topic.get("title"),
            "correct_answer": correct_answer,
            "message": "Correct! You can continue to the next topic.",
            "recommendation": "continue"
        }

    return {
        "success": True,
        "correct": False,
        "score": 0,
        "topic_id": topic.get("id"),
        "topic": topic.get("title"),
        "correct_answer": correct_answer,
        "message": "Not quite. Review this topic and try again.",
        "recommendation": "review"
    }