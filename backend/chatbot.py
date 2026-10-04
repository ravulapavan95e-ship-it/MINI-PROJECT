import json
from pathlib import Path

KNOWLEDGE_FILE = Path(__file__).parent / "knowledge" / "python.json"


def load_knowledge():
    with open(KNOWLEDGE_FILE, "r", encoding="utf-8") as file:
        return json.load(file)


def find_best_topic(question: str):
    knowledge = load_knowledge()
    topics = knowledge["topics"]

    question = question.lower()

    best_topic = None
    best_score = 0

    for topic in topics:
        score = 0

        for keyword in topic["keywords"]:
            if keyword.lower() in question:
                score += 1

        if score > best_score:
            best_score = score
            best_topic = topic

    if best_topic is None:
        return None

    return {
        "topic": best_topic["title"],
        "explanation": best_topic["explanation"],
        "practice_question": best_topic["practice_question"],
        "answer": best_topic["answer"],
        "confidence": best_score
    }