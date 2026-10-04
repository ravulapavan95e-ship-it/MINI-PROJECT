# Personalized Learning Assistant

## 1. Project Overview

The **Personalized Learning Assistant** is a web application designed to help learners study Python through personalized learning paths, topic-based practice, quizzes, and progress tracking.

The system allows learners to provide their learning goal, current skill level, available study time, and completed topics. Based on these inputs, the application generates an ordered learning roadmap using topic levels and prerequisite relationships from a local Python knowledge base.

The project combines a React-based user interface with a FastAPI backend to provide an interactive and structured learning experience.

## 2. Live Demo

**Live Application:**  
https://personalized-learning-assistant-v8hc.onrender.com

## 3. Objectives

- Generate an ordered Python learning roadmap based on the learner's goal and skill level.
- Consider the learner's available study time when estimating the roadmap duration.
- Provide topic explanations and practice questions from the local knowledge base.
- Support topic-based questions through the learning assistant.
- Provide quiz feedback and recommendations.
- Track completed topics and quiz scores.
- Provide learners with a simple and interactive learning interface.

## 4. Key Features

### Personalized Learning Paths

Generates a learning roadmap based on:

- Learning goal
- Skill level
- Available study time
- Previously completed topics

### Topic Sequencing

Uses topic levels and prerequisite relationships from the Python knowledge base to arrange topics in a logical learning order.

### Learning Assistant

Matches learner questions with relevant topics in the knowledge base and provides:

- Topic explanations
- Practice questions
- Answers
- Match information

### Topic Quizzes

Allows learners to:

- Attempt topic-based questions
- Submit answers
- Receive immediate feedback
- View scores
- Get recommendations for further learning

### Progress Tracking

Completed topics and quiz scores are stored in the browser using `localStorage`.

### Learning Analytics

Provides learning information such as:

- Roadmap progress
- Completed topics
- Quiz attempts
- Average quiz score
- Topics that may require additional review

## 5. Technology Stack

### Frontend

- React
- TypeScript
- Vite
- HTML
- CSS

### Backend

- Python
- FastAPI
- Pydantic
- Uvicorn

### Learning and Recommendation Logic

- Rule-based roadmap generation
- Prerequisite-based topic sequencing
- Keyword matching for learning assistant responses
- Normalized quiz answer comparison
- Local Python knowledge base

### Deployment

- Render
- Render Blueprint
- `render.yaml`

## 6. System Architecture

```text
                    ┌──────────────────────┐
                    │        User          │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ React + TypeScript   │
                    │       Frontend       │
                    │        (Vite)        │
                    └──────────┬───────────┘
                               │
                           HTTP / JSON
                               │
                               ▼
                    ┌──────────────────────┐
                    │      FastAPI         │
                    │       Backend        │
                    └──────────┬───────────┘
                               │
                ┌──────────────┴──────────────┐
                │                             │
                ▼                             ▼
       ┌──────────────────┐         ┌──────────────────┐
       │ Learning Path &  │         │ Learning Assistant│
       │ Quiz Logic       │         │ Keyword Matching │
       └────────┬─────────┘         └────────┬─────────┘
                │                            │
                └─────────────┬──────────────┘
                              ▼
                  ┌────────────────────────┐
                  │ Python Knowledge Base  │
                  │      python.json       │
                  └────────────────────────┘
