import { useEffect, useState } from "react";

import "./App.css";



const API_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "");



const STORAGE_KEY = "personalized_learning_completed_topics";

const QUIZ_STORAGE_KEY = "personalized_learning_quiz_scores";
const LEARNER_STORAGE_KEY = "personalized_learning_learner_id";

function readStoredId(key: string): number | null {
  const value = Number(localStorage.getItem(key));
  return Number.isInteger(value) && value > 0 ? value : null;
}

interface Topic {

  step: number;

  topic_id: string;

  topic: string;

  explanation: string;

  estimated_minutes: number;

  practice_question: string;
  database_topic_id?: number;
  completed?: boolean;
}



interface LearningPathResponse {

  goal: string;

  current_level: string;

  minutes_per_day: number;

  estimated_total_minutes: number;

  estimated_days: number;

  roadmap: Topic[];
  roadmap_id: number;
  learner_id: number;
  title?: string;
  description?: string;
}



interface ChatResponse {

  success: boolean;

  response?: {

    topic: string;

    explanation: string;

    practice_question: string;

    answer: string;

    confidence: number;

  };

  message?: string;

}

interface AITutorResponse {
  response: string;
  remaining_requests: number;
  daily_limit: number;
}

interface AIRecommendationResponse {
  weak_topic: string;
  why_review: string;
  recommended_topic: string;
  suggested_study_minutes: number;
  practice_items: string[];
  decision: "review" | "continue";
  remaining_requests: number;
  daily_limit: number;
}

interface AITextResponse {
  response: string;
  remaining_requests: number;
  daily_limit: number;
}

interface LatestQuizAttempt {
  topicId: string;
  answer: string;
  score: number;
  correct: boolean;
}

interface QuizResponse {

  success: boolean;

  correct?: boolean;

  score?: number;

  topic_id?: string;

  topic?: string;

  correct_answer?: string;

  message?: string;

  recommendation?: string;

}

function isAIRecommendationResponse(
  value: unknown,
): value is AIRecommendationResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "weak_topic" in value &&
    typeof value.weak_topic === "string" &&
    "why_review" in value &&
    typeof value.why_review === "string" &&
    "recommended_topic" in value &&
    typeof value.recommended_topic === "string" &&
    "suggested_study_minutes" in value &&
    typeof value.suggested_study_minutes === "number" &&
    "practice_items" in value &&
    Array.isArray(value.practice_items) &&
    value.practice_items.every((item) => typeof item === "string") &&
    "decision" in value &&
    (value.decision === "review" || value.decision === "continue") &&
    "remaining_requests" in value &&
    typeof value.remaining_requests === "number" &&
    "daily_limit" in value &&
    typeof value.daily_limit === "number"
  );
}

function isAITextResponse(value: unknown): value is AITextResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "response" in value &&
    typeof value.response === "string" &&
    "remaining_requests" in value &&
    typeof value.remaining_requests === "number" &&
    "daily_limit" in value &&
    typeof value.daily_limit === "number"
  );
}

function isLearningPathResponse(
  value: Record<string, unknown>,
): value is Record<string, unknown> & LearningPathResponse {
  return (
    typeof value.goal === "string" &&
    typeof value.current_level === "string" &&
    typeof value.minutes_per_day === "number" &&
    typeof value.estimated_total_minutes === "number" &&
    typeof value.estimated_days === "number" &&
    typeof value.roadmap_id === "number" &&
    typeof value.learner_id === "number" &&
    Array.isArray(value.roadmap) &&
    value.roadmap.every(
      (topic) =>
        typeof topic === "object" &&
        topic !== null &&
        "topic_id" in topic &&
        typeof topic.topic_id === "string" &&
        "topic" in topic &&
        typeof topic.topic === "string" &&
        "explanation" in topic &&
        typeof topic.explanation === "string" &&
        "estimated_minutes" in topic &&
        typeof topic.estimated_minutes === "number" &&
        "practice_question" in topic &&
        typeof topic.practice_question === "string",
    )
  );
}

function isLearnerProfile(
  value: unknown,
): value is {
  name: string;
  skill_level: string;
  learning_goal: string;
  study_time: number;
} {
  return (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    typeof value.name === "string" &&
    "skill_level" in value &&
    typeof value.skill_level === "string" &&
    "learning_goal" in value &&
    typeof value.learning_goal === "string" &&
    "study_time" in value &&
    typeof value.study_time === "number"
  );
}

function isQuizScores(value: unknown): value is { [topicId: string]: number } {
  return (
    typeof value === "object" &&
    value !== null &&
    Object.values(value).every((score) => typeof score === "number")
  );
}

async function readApiResponse(
  response: Response,
): Promise<Record<string, unknown> | null> {
  const body = await response.text();
  if (!body.trim()) {
    return null;
  }

  try {
    const value: unknown = JSON.parse(body);
    return typeof value === "object" && value !== null && !Array.isArray(value)
      ? value as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function getAiRequestError(
  data: Record<string, unknown> | null,
  response: Response,
  fallback: string,
): string {
  if (typeof data?.detail === "string") {
    return data.detail;
  }
  if (response.status >= 500) {
    return "The AI service is temporarily unavailable. Please try again shortly.";
  }
  return fallback;
}

function extractTutorSection(response: string, heading: string): string {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const section = response.match(
    new RegExp(
      `(?:^|\\n)\\s*(?:#{1,6}\\s*)?${escapedHeading}\\s*:?\\s*\\n([\\s\\S]*?)(?=\\n\\s*#{1,6}\\s+|$)`,
      "i",
    ),
  );
  return section?.[1]?.trim() ?? "";
}


function App() {
  const [learnerName, setLearnerName] = useState("Learner");
  const [learnerId, setLearnerId] = useState<number | null>(() =>
    readStoredId(LEARNER_STORAGE_KEY),
  );
  const [workflowError, setWorkflowError] = useState("");
  const [downloadError, setDownloadError] = useState("");
  const [downloadingRoadmap, setDownloadingRoadmap] = useState(false);

  // --------------------------------

  // Learning Path State

  // --------------------------------



  const [goal, setGoal] = useState("Learn Python");

  const [level, setLevel] = useState("beginner");

  const [minutes, setMinutes] = useState(60);



  const [learningPath, setLearningPath] =

    useState<LearningPathResponse | null>(null);



  const [loadingPath, setLoadingPath] = useState(false);



  // --------------------------------

  // Chatbot State

  // --------------------------------



  const [question, setQuestion] = useState("");

  const [chatAnswer, setChatAnswer] =

    useState<ChatResponse | null>(null);



  const [loadingChat, setLoadingChat] = useState(false);

const [aiTutorQuestion, setAiTutorQuestion] = useState("");
const [aiTutorAnswer, setAiTutorAnswer] =
  useState<AITutorResponse | null>(null);
const [aiTutorError, setAiTutorError] = useState("");
const [loadingAiTutor, setLoadingAiTutor] = useState(false);
const [aiRecommendation, setAiRecommendation] =
  useState<AIRecommendationResponse | null>(null);
const [aiRecommendationError, setAiRecommendationError] = useState("");
const [loadingAiRecommendation, setLoadingAiRecommendation] = useState(false);
const [aiQuizExplanations, setAiQuizExplanations] = useState<{
  [topicId: string]: AITextResponse;
}>({});
const [aiQuizExplanationErrors, setAiQuizExplanationErrors] = useState<{
  [topicId: string]: string;
}>({});
const [loadingAiQuizExplanation, setLoadingAiQuizExplanation] = useState<{
  [topicId: string]: boolean;
}>({});
const [latestQuizAttempt, setLatestQuizAttempt] =
  useState<LatestQuizAttempt | null>(null);



  // --------------------------------

  // Progress State

  // --------------------------------



  const [completedTopics, setCompletedTopics] =

    useState<string[]>([]);

useEffect(() => {
  if (learnerId === null) {
    localStorage.removeItem(LEARNER_STORAGE_KEY);
    return;
  }
  localStorage.setItem(LEARNER_STORAGE_KEY, String(learnerId));
}, [learnerId]);

useEffect(() => {
  if (learnerId === null) return;
  let cancelled = false;

  const restoreProgress = async () => {
    try {
      const progressResponse = await fetch(
        `${API_URL}/api/progress/${learnerId}`,
      );
      const progressData = await readApiResponse(progressResponse);
      if (!progressResponse.ok || !progressData) {
        throw new Error(
          typeof progressData?.detail === "string"
            ? progressData.detail
            : "Saved learning progress could not be loaded.",
        );
      }
      if (cancelled) return;
      const learner = progressData.learner;
      if (!isLearnerProfile(learner)) {
        throw new Error("Saved learner profile returned an invalid response.");
      }
      setLearnerName(learner.name);
      setLevel(learner.skill_level);
      setGoal(learner.learning_goal);
      setMinutes(learner.study_time);
      const savedRoadmapId = progressData.roadmap_id;
      if (typeof savedRoadmapId === "number") {
        const roadmapResponse = await fetch(
          `${API_URL}/api/roadmap/${savedRoadmapId}`,
        );
        const roadmapData = await readApiResponse(roadmapResponse);
        if (
          !roadmapResponse.ok ||
          !roadmapData ||
          !isLearningPathResponse(roadmapData)
        ) {
          throw new Error(
            typeof roadmapData?.detail === "string"
              ? roadmapData.detail
              : "Saved roadmap returned an invalid response.",
          );
        }
        if (cancelled) return;
        setLearningPath(roadmapData);
        setCompletedTopics(
          roadmapData.roadmap
            .filter((topic) => topic.completed)
            .map((topic) => topic.topic_id),
        );
      }
      if (isQuizScores(progressData.quiz_scores)) {
        setQuizScores(progressData.quiz_scores);
      }
    } catch (error) {
      if (!cancelled) {
        setWorkflowError(
          error instanceof Error
            ? error.message
            : "Saved learning progress could not be loaded.",
        );
      }
    }
  };

  void restoreProgress();
  return () => {
    cancelled = true;
  };
}, [learnerId]);



  // --------------------------------

  // Quiz State

  // --------------------------------



  const [quizAnswers, setQuizAnswers] = useState<{

    [topicId: string]: string;

  }>({});



  const [quizResults, setQuizResults] = useState<{

    [topicId: string]: QuizResponse;

  }>({});



  const [quizScores, setQuizScores] = useState<{

    [topicId: string]: number;

  }>({});

const [submittedQuizAnswers, setSubmittedQuizAnswers] = useState<{
  [topicId: string]: string;
}>({});


  const [submittingQuiz, setSubmittingQuiz] = useState<{
    [topicId: string]: boolean;
  }>({});



  // --------------------------------

  // Load Saved Progress

  // --------------------------------



  useEffect(() => {

    const saved = localStorage.getItem(STORAGE_KEY);



    if (saved) {

      try {

        const parsed = JSON.parse(saved);



        if (Array.isArray(parsed)) {

          setCompletedTopics(parsed);

        }

      } catch {

        console.log("Unable to load saved progress.");

      }

    }

  }, []);



  // --------------------------------

  // Save Progress

  // --------------------------------



  useEffect(() => {

    localStorage.setItem(

      STORAGE_KEY,

      JSON.stringify(completedTopics)

    );

  }, [completedTopics]);



  // --------------------------------

  // Load Quiz Scores

  // --------------------------------



  useEffect(() => {

    const saved =

      localStorage.getItem(QUIZ_STORAGE_KEY);



    if (saved) {

      try {

        const parsed = JSON.parse(saved);



        if (

          parsed &&

          typeof parsed === "object"

        ) {

          setQuizScores(parsed);

        }

      } catch {

        console.log(

          "Unable to load saved quiz scores."

        );

      }

    }

  }, []);



  // --------------------------------

  // Save Quiz Scores

  // --------------------------------



  useEffect(() => {

    localStorage.setItem(

      QUIZ_STORAGE_KEY,

      JSON.stringify(quizScores)

    );

  }, [quizScores]);



  // --------------------------------

  // Generate Learning Path

  // --------------------------------



  const generatePath = async () => {

    if (!goal.trim()) {

      alert("Please enter your learning goal.");

      return;

    }



    setLoadingPath(true);
    setWorkflowError("");



    try {

      const response = await fetch(

        `${API_URL}/learning-path`,

        {

          method: "POST",

          headers: {

            "Content-Type": "application/json",

          },

          body: JSON.stringify({

            goal,

            current_level: level,

            minutes_per_day: minutes,

            completed_topics: completedTopics,
            learner_name: learnerName.trim() || "Learner",

          }),

        }

      );



      const data = await response.json();



      if (!response.ok) {

        alert(

          data.detail ||

            "Could not generate learning path."

        );

        return;

      }



      if (

        !data.roadmap ||

        data.roadmap.length === 0

      ) {

        alert(

          "You have completed all available topics for this level."

        );

      }



      setLearningPath(data);
      if (typeof data.learner_id === "number") {
        setLearnerId(data.learner_id);
      }

    } catch {

      alert(

        "Cannot connect to the backend. Make sure FastAPI is running on port 8000."

      );

    } finally {

      setLoadingPath(false);

    }

  };



  // --------------------------------

  // Chatbot

  // --------------------------------



  const askQuestion = async () => {

    if (!question.trim()) {

      alert("Please enter a question.");

      return;

    }



    setLoadingChat(true);



    try {

      const response = await fetch(

        `${API_URL}/chat`,

        {

          method: "POST",

          headers: {

            "Content-Type": "application/json",

          },

          body: JSON.stringify({

            question,

          }),

        }

      );



      const data = await response.json();



      setChatAnswer(data);

    } catch {

      alert(

        "Cannot connect to the backend. Make sure FastAPI is running on port 8000."

      );

    } finally {

      setLoadingChat(false);

    }
  };

  const getLearnerContext = (topicId?: string) => {
    const roadmap = learningPath?.roadmap ?? [];
    const activeIndex = roadmap.findIndex(
      (topic) => !completedTopics.includes(topic.topic_id),
    );
    const requestedIndex = topicId
      ? roadmap.findIndex((topic) => topic.topic_id === topicId)
      : activeIndex;
    const contextTopic = roadmap[requestedIndex] ?? roadmap[activeIndex];
    const latestScore =
      latestQuizAttempt?.score ??
      (contextTopic ? quizScores[contextTopic.topic_id] : undefined) ??
      Object.values(quizScores).slice(-1)[0] ??
      null;

    return {
      skill_level: learningPath?.current_level ?? level,
      minutes_per_day: learningPath?.minutes_per_day ?? minutes,
      current_topic: contextTopic?.topic_id ?? null,
      learning_goal: learningPath?.goal ?? goal,
      completed_topics: completedTopics,
      recent_quiz_score: latestScore,
      topics_to_review:
        roadmap
          .filter(
            (topic) =>
              quizScores[topic.topic_id] !== undefined &&
              quizScores[topic.topic_id] < 100,
          )
          .map((topic) => topic.topic_id),
      roadmap_topic_ids: roadmap.map((topic) => topic.topic_id),
      current_topic_position: requestedIndex >= 0 ? requestedIndex + 1 : null,
      roadmap_length: roadmap.length || null,
      quiz_scores: quizScores,
      latest_quiz_topic_id:
        latestQuizAttempt?.topicId ?? topicId ?? null,
    };
  };

  const askAiTutor = async () => {
    const learnerQuestion = aiTutorQuestion.trim();
    if (!learnerQuestion) {
      setAiTutorError("Please enter a question for the AI Learning Tutor.");
      setAiTutorAnswer(null);
      return;
    }

    setLoadingAiTutor(true);
    setAiTutorError("");
    setAiTutorAnswer(null);

    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: learnerQuestion,
          learner_id: learnerId,
          ...getLearnerContext(),
        }),
        signal: AbortSignal.timeout(65_000),
      });
      const data = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(
          getAiRequestError(
            data,
            response,
            "The AI Learning Tutor could not answer. Please try again.",
          ),
        );
      }

      if (
        !data ||
        typeof data.response !== "string" ||
        typeof data.remaining_requests !== "number" ||
        typeof data.daily_limit !== "number"
      ) {
        throw new Error("The AI Learning Tutor returned an invalid response.");
      }

      setAiTutorAnswer({
        response: data.response,
        remaining_requests: data.remaining_requests,
        daily_limit: data.daily_limit,
      });
    } catch (error) {
      setAiTutorError(
        error instanceof Error && error.name === "TimeoutError"
          ? "The AI Learning Tutor timed out. Please try again shortly."
          : error instanceof Error
          ? error.message
          : "Could not reach the AI Learning Tutor. Please try again.",
      );
    } finally {
      setLoadingAiTutor(false);
    }
  };

  const requestAiRecommendation = async () => {
    setLoadingAiRecommendation(true);
    setAiRecommendationError("");
    setAiRecommendation(null);

    try {
      const response = await fetch(`${API_URL}/ai-recommendation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...getLearnerContext(latestQuizAttempt?.topicId),
          latest_quiz_score: latestQuizAttempt?.score ?? null,
          incorrect_answers:
            latestQuizAttempt && !latestQuizAttempt.correct
              ? [latestQuizAttempt.answer]
              : [],
        }),
      });
      const data = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(
          getAiRequestError(
            data,
            response,
            "Could not get an AI study recommendation. Please try again.",
          ),
        );
      }

      if (!isAIRecommendationResponse(data)) {
        throw new Error("The AI recommendation returned an invalid response.");
      }
      setAiRecommendation(data);
    } catch (error) {
      setAiRecommendationError(
        error instanceof Error
          ? error.message
          : "Could not reach AI study recommendations. Please try again.",
      );
    } finally {
      setLoadingAiRecommendation(false);
    }
  };

  const explainQuizAnswer = async (topicId: string) => {
    const answer = submittedQuizAnswers[topicId];
    if (!answer) {
      setAiQuizExplanationErrors((previous) => ({
        ...previous,
        [topicId]: "Submit an answer before requesting an explanation.",
      }));
      return;
    }

    setLoadingAiQuizExplanation((previous) => ({
      ...previous,
      [topicId]: true,
    }));
    setAiQuizExplanationErrors((previous) => ({
      ...previous,
      [topicId]: "",
    }));

    try {
      const response = await fetch(`${API_URL}/ai-quiz-explanation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...getLearnerContext(topicId),
          topic_id: topicId,
          user_answer: answer,
        }),
      });
      const data = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(
          getAiRequestError(
            data,
            response,
            "Could not explain this answer. Please try again.",
          ),
        );
      }

      if (!isAITextResponse(data)) {
        throw new Error("The AI tutor returned an invalid explanation.");
      }
      setAiQuizExplanations((previous) => ({
        ...previous,
        [topicId]: data,
      }));
    } catch (error) {
      setAiQuizExplanationErrors((previous) => ({
        ...previous,
        [topicId]:
          error instanceof Error
            ? error.message
            : "Could not reach the AI tutor. Please try again.",
      }));
    } finally {
      setLoadingAiQuizExplanation((previous) => ({
        ...previous,
        [topicId]: false,
      }));
    }
  };

    const downloadRoadmap = async () => {
      const savedRoadmapId = learningPath?.roadmap_id;
      if (!savedRoadmapId) {
        setDownloadError("Generate and save a roadmap before downloading it.");
        return;
      }

      setDownloadingRoadmap(true);
      setDownloadError("");
      try {
        const response = await fetch(
          `${API_URL}/api/download/roadmap/${savedRoadmapId}`,
        );
        if (!response.ok) {
          const data = await readApiResponse(response);
          throw new Error(
            typeof data?.detail === "string"
              ? data.detail
              : "The roadmap PDF could not be downloaded.",
          );
        }

        const file = await response.blob();
        const objectUrl = URL.createObjectURL(file);
        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = `learning-roadmap-${savedRoadmapId}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      } catch (error) {
        setDownloadError(
          error instanceof Error
            ? error.message
            : "The roadmap PDF could not be downloaded.",
        );
      } finally {
        setDownloadingRoadmap(false);
      }
    };


    // --------------------------------

  // Adaptive Recommendation

  // --------------------------------



  const getQuizRecommendation = (

    result: QuizResponse

  ) => {

    if (

      result.correct &&

      result.score === 100

    ) {

      return {

        type: "continue",

        title:

          "🚀 Ready for the Next Topic",

        message:

          "You answered correctly. You can continue learning with the next topic.",

        background: "#dcfce7",

      };

    }



    return {

      type: "review",

      title: "📖 Review Recommended",

      message:

        "Review this topic and try the practice question again before continuing.",

      background: "#fef3c7",

    };

  };



  // --------------------------------

  // Submit Quiz

  // --------------------------------

  const persistTopicCompletion = async (
    topicId: string,
    completed: boolean,
  ): Promise<boolean> => {
    const databaseTopicId = learningPath?.roadmap.find(
      (topic) => topic.topic_id === topicId,
    )?.database_topic_id;
    if (learnerId === null || !databaseTopicId) return true;

    try {
      const response = await fetch(
        `${API_URL}/api/topics/${databaseTopicId}/complete`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ completed }),
        },
      );
      const data = await readApiResponse(response);
      if (!response.ok) {
        alert(
          typeof data?.detail === "string"
            ? data.detail
            : "Topic progress could not be saved.",
        );
        return false;
      }
      return true;
    } catch {
      alert("Cannot connect to the backend. Topic progress was not saved.");
      return false;
    }
  };


  const submitQuiz = async (


    topicId: string


  ) => {


    const answer = quizAnswers[topicId]?.trim();




    if (!answer) {


      alert("Please enter your answer.");


      return;


    }




    setSubmittingQuiz((previous) => ({


      ...previous,


      [topicId]: true,


    }));




    try {


      const response = await fetch(


        `${API_URL}${learnerId === null ? "/quiz" : "/api/quiz/submit"}`,


        {


          method: "POST",


          headers: {


            "Content-Type": "application/json",


          },


          body: JSON.stringify({

            topic_id: topicId,

            user_answer: answer,
            ...(learnerId === null ? {} : { learner_id: learnerId }),

          }),


        }


      );




      const raw = await response.text();


      let data: QuizResponse;




      try {


        data = raw ? JSON.parse(raw) : {};


      } catch {


        data = {


          success: false,


          message: raw || "The backend returned an invalid response.",


        };


      }




      if (!response.ok) {


        alert(


          data.message ||


            "Quiz submission failed."


        );


        return;


      }




      setQuizResults((previous) => ({


        ...previous,


        [topicId]: data,


      }));

      if (data.success) {
        const score = typeof data.score === "number" ? data.score : 0;
        setSubmittedQuizAnswers((previous) => ({
          ...previous,
          [topicId]: answer,
        }));
        setLatestQuizAttempt({
          topicId,
          answer,
          score,
          correct: data.correct === true,
        });
        setAiRecommendation(null);
        setAiRecommendationError("");
      }



      const score = typeof data.score === "number" ? data.score : 0;

      setQuizScores((previous: { [topicId: string]: number }) => ({
        ...previous,
        [topicId]: score,
      }));




      if (data.correct && (await persistTopicCompletion(topicId, true))) {


        setCompletedTopics((previous) => {


          if (previous.includes(topicId)) {


            return previous;


          }




          return [...previous, topicId];


        });


      }


    } catch (error) {


      console.error("Quiz submission error:", error);


      alert(


        "Cannot connect to the backend. Make sure FastAPI is running on http://127.0.0.1:8000."


      );


    } finally {


      setSubmittingQuiz((previous) => ({


        ...previous,


        [topicId]: false,


      }));


    }


  };


  // --------------------------------

  // Toggle Completion

  // --------------------------------



  const toggleTopicCompletion = async (

    topicId: string

  ) => {
    const completed = !completedTopics.includes(topicId);
    if (!(await persistTopicCompletion(topicId, completed))) return;

    setCompletedTopics((previous) => {

      if (previous.includes(topicId)) {

        return previous.filter(

          (id) => id !== topicId

        );

      }



      return [

        ...previous,

        topicId,

      ];

    });

  };



  // --------------------------------

  // Reset Progress

  // --------------------------------



  const resetProgress = async () => {

    const confirmed =

      window.confirm(

        "Are you sure you want to reset your learning progress and quiz scores?"

      );



    if (!confirmed) {

      return;

    }

    if (learnerId !== null) {
      try {
        const response = await fetch(
          `${API_URL}/api/progress/${learnerId}/reset`,
          { method: "POST" },
        );
        const data = await readApiResponse(response);
        if (!response.ok) {
          setWorkflowError(
            typeof data?.detail === "string"
              ? data.detail
              : "Progress could not be reset in the database.",
          );
          return;
        }
      } catch {
        setWorkflowError("Cannot connect to the backend. Progress was not reset.");
        return;
      }
    }

    setCompletedTopics([]);

    setQuizScores({});

    setQuizResults({});



    setQuizAnswers({});
    setSubmittedQuizAnswers({});
    setLatestQuizAttempt(null);
    setAiRecommendation(null);
    setAiRecommendationError("");
    setAiQuizExplanations({});
    setAiQuizExplanationErrors({});



    localStorage.removeItem(

      STORAGE_KEY

    );



    localStorage.removeItem(

      QUIZ_STORAGE_KEY

    );



    setLearningPath(null);
    setLearnerId(null);

  };



  // --------------------------------

  // Progress Calculations

  // --------------------------------



  const totalTopics =
    learningPath?.roadmap.length || 0;

  const currentTopicIndex =
    learningPath?.roadmap.findIndex(
      (topic) => !completedTopics.includes(topic.topic_id)
    ) ?? -1;



  const completedCount =

    learningPath?.roadmap.filter(

      (topic) =>

        completedTopics.includes(

          topic.topic_id

        )

    ).length || 0;



  const progressPercentage =

    totalTopics > 0

      ? Math.round(

          (completedCount /

            totalTopics) *

            100

        )

      : 0;



  const quizCompletedCount =

    Object.keys(quizScores).length;



  const totalQuizScore =

    Object.values(

      quizScores

    ).reduce(

      (total, score) =>

        total + score,

      0

    );



  const averageQuizScore =

    quizCompletedCount > 0

      ? Math.round(

          totalQuizScore /

            quizCompletedCount

        )

      : 0;



  // --------------------------------

  // Analytics

  // --------------------------------



  const reviewedTopics =

    learningPath?.roadmap.filter(

      (topic) =>

        quizScores[topic.topic_id] !==

          undefined &&

        quizScores[topic.topic_id] < 100

    ) || [];



  const lowestScoreTopic =

    reviewedTopics.length > 0

      ? reviewedTopics.reduce(

          (lowest, topic) => {

            const currentScore =

              quizScores[

                topic.topic_id

              ];



            const lowestScore =

              quizScores[

                lowest.topic_id

              ];



            return currentScore <

              lowestScore

              ? topic

              : lowest;

          },

          reviewedTopics[0]

        )

      : null;



  let analyticsRecommendation =

    "Start your first quiz to receive a personalized learning recommendation.";



  if (

    lowestScoreTopic &&

    quizScores[

      lowestScoreTopic.topic_id

    ] < 100

  ) {

    analyticsRecommendation =

      `Review "${lowestScoreTopic.topic}" before moving forward.`;

  } else if (

    completedCount > 0 &&

    completedCount < totalTopics

  ) {

    analyticsRecommendation =

      "Good progress! Continue with the next available topic.";

  } else if (

    totalTopics > 0 &&

    completedCount === totalTopics

  ) {

    analyticsRecommendation =

      "All topics in this learning path are completed.";

  }



  // --------------------------------

  // UI

  // --------------------------------



  return (

    <div className="app">

      {/* HEADER */}

      <header className="header">
        <div className="header-inner">
          <div className="brand-mark" aria-hidden="true">✦</div>
          <div className="brand-copy">
            <div className="eyebrow">PERSONALIZED LEARNING WORKSPACE</div>
            <h1>AI-Assisted Personalized Learning Assistant</h1>
            <p>
              Core learning tools work independently, with optional AI support when you ask.
            </p>
          </div>
          <div className="system-pill">
            <span className="status-dot" />
            <span>System Online</span>
          </div>
        </div>
      </header>

      <section className="mission-hero" aria-label="Python learning universe">
        <div className="hero-copy">
          <span className="eyebrow">YOUR PERSONALIZED LEARNING JOURNEY</span>
          <h2>Build your path.<br /><span>Master one concept at a time.</span></h2>
          <p>
            Generate an adaptive roadmap and use your progress and quiz results to decide
            what to continue or review next.
          </p>
          <form
            className="hero-form"
            onSubmit={(event) => {
              event.preventDefault();
              void generatePath();
            }}
          >
            <label htmlFor="learner-name">Your name</label>
            <input
              id="learner-name"
              type="text"
              maxLength={120}
              placeholder="Enter your name"
              value={learnerName}
              onChange={(event) => setLearnerName(event.target.value)}
            />
            <label htmlFor="learning-goal">Learning goal</label>
            <input
              id="learning-goal"
              type="text"
              placeholder="What would you like to learn?"
              value={goal}
              onChange={(event) => setGoal(event.target.value)}
            />
            <div className="hero-form-row">
              <div>
                <label htmlFor="learning-level">Skill level</label>
                <select
                  id="learning-level"
                  value={level}
                  onChange={(event) => setLevel(event.target.value)}
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
              <div>
                <label htmlFor="study-minutes">Study time per day</label>
                <div className="minutes-input">
                  <input
                    id="study-minutes"
                    type="number"
                    min="10"
                    max="480"
                    value={minutes}
                    onChange={(event) => setMinutes(Number(event.target.value))}
                  />
                  <span>min</span>
                </div>
              </div>
            </div>
            <button type="submit" disabled={loadingPath}>
              {loadingPath ? "Generating..." : "Generate Learning Path"}
              <span aria-hidden="true">→</span>
            </button>
          </form>
          <div className="hero-stats">
            <div><strong>{completedTopics.length}</strong><span>topics mastered</span></div>
            <div><strong>{Object.keys(quizScores).length}</strong><span>quiz attempts</span></div>
            <div><strong>{learningPath ? learningPath.roadmap.length : 0}</strong><span>roadmap topics</span></div>
          </div>
        </div>

        <div className="universe" aria-hidden="true">
          <div className="universe-glow" />
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="orbit orbit-three" />
          <div className="python-core">PYTHON<span>LEARNING CORE</span></div>
          <span className="universe-node n1">Variables</span>
          <span className="universe-node n2">Data Types</span>
          <span className="universe-node n3">Conditions</span>
          <span className="universe-node n4">Loops</span>
          <span className="universe-node n5">Functions</span>
          <span className="universe-node n6">Lists</span>
          <span className="universe-node n7">Dictionaries</span>
          <span className="universe-node n8">OOP</span>
          <span className="universe-node n9">Testing</span>
        </div>
      </section>

      <section className="stats-grid" aria-label="Learning statistics">
        <div className="stat-card">
          <span className="stat-icon">✓</span>
          <div><strong>{completedTopics.length}</strong><span>Topics mastered</span></div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">↗</span>
          <div><strong>{quizCompletedCount}</strong><span>Quiz attempts</span></div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">⌘</span>
          <div><strong>{totalTopics}</strong><span>Roadmap topics</span></div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">%</span>
          <div><strong>{averageQuizScore}%</strong><span>Average quiz score</span></div>
        </div>
      </section>

      <main className="container">

        <p className="eyebrow">CORE LEARNING FEATURES</p>

        {workflowError && (
          <p className="workflow-error" role="alert">
            {workflowError}
          </p>
        )}



        {/* LEARNING PATH FORM */}



<section className="card path-setup-card">



          <h2>

            🎯 Create Your Learning Path

          </h2>



          <label>

            Learning Goal

          </label>



          <input

            type="text"

            placeholder="Example: Learn Python programming"

            value={goal}

            onChange={(e) =>

              setGoal(e.target.value)

            }

          />



          <label>

            Current Skill Level

          </label>



          <select

            value={level}

            onChange={(e) =>

              setLevel(e.target.value)

            }

          >

            <option value="beginner">

              Beginner

            </option>



            <option value="intermediate">

              Intermediate

            </option>



            <option value="advanced">

              Advanced

            </option>

          </select>



          <label>

            Study Time Per Day

          </label>



          <input

            type="number"

            min="10"

            max="480"

            value={minutes}

            onChange={(e) =>

              setMinutes(

                Number(

                  e.target.value

                )

              )

            }

          />



          <button

            onClick={generatePath}

            disabled={loadingPath}

          >

            {loadingPath

              ? "Generating..."

              : "Generate Learning Path"}

          </button>



        </section>



        {/* LEARNING PATH */}



        {learningPath && (

          <section className="card">



            <h2>

              📚 Your Personalized Roadmap

            </h2>

              <div className="roadmap-download">
                <p>
                  Saved for {learnerName}. Download the roadmap with its current
                  progress and practice questions.
                </p>
                <button
                  type="button"
                  onClick={() => void downloadRoadmap()}
                  disabled={downloadingRoadmap}
                >
                  {downloadingRoadmap ? "Preparing PDF..." : "Download Roadmap PDF"}
                </button>
              </div>
              {downloadError && (
                <p className="workflow-error" role="alert">
                  {downloadError}
                </p>
              )}

            {/* SUMMARY */}



            <div className="summary">



              <div>

                <strong>

                  Goal

                </strong>



                <span>

                  {learningPath.goal}

                </span>

              </div>



              <div>

                <strong>

                  Level

                </strong>



                <span>

                  {

                    learningPath.current_level

                  }

                </span>

              </div>



              <div>

                <strong>

                  Study Time

                </strong>



                <span>

                  {

                    learningPath.minutes_per_day

                  }{" "}

                  min/day

                </span>

              </div>



              <div>

                <strong>

                  Estimated Duration

                </strong>



                <span>

                  {

                    learningPath.estimated_days

                  }{" "}

                  days

                </span>

              </div>



            </div>



            {/* LEARNING ANALYTICS DASHBOARD */}



            <div className="analytics-panel">



              <h2>

                📊 Learning Analytics

              </h2>



              <div

                style={{

                  display: "grid",

                  gridTemplateColumns:

                    "repeat(auto-fit, minmax(160px, 1fr))",

                  gap: "12px",

                  marginTop: "15px",

                }}

              >



                {/* Progress */}



                <div className="analytics-stat analytics-blue">

                  <div

                    style={{

                      fontSize: "28px",

                      fontWeight: "bold",

                    }}

                  >

                    {progressPercentage}%

                  </div>



                  <div>

                    Overall Progress

                  </div>

                </div>



                {/* Completed */}



                <div className="analytics-stat analytics-green">

                  <div

                    style={{

                      fontSize: "28px",

                      fontWeight: "bold",

                    }}

                  >

                    {completedCount}/

                    {totalTopics}

                  </div>



                  <div>

                    Topics Completed

                  </div>

                </div>



                {/* Quizzes */}



                <div className="analytics-stat analytics-purple">

                  <div

                    style={{

                      fontSize: "28px",

                      fontWeight: "bold",

                    }}

                  >

                    {quizCompletedCount}

                  </div>



                  <div>

                    Quizzes Attempted

                  </div>

                </div>



                {/* Average Score */}



                <div className="analytics-stat analytics-orange">

                  <div

                    style={{

                      fontSize: "28px",

                      fontWeight: "bold",

                    }}

                  >

                    {averageQuizScore}

                  </div>



                  <div>

                    Average Quiz Score

                  </div>

                </div>



              </div>



              {/* Progress Bar */}



              <div

                style={{

                  marginTop: "20px",

                }}

              >



                <strong>

                  Learning Progress

                </strong>



                <div className="learning-progress-bar">
                  <div
                    className="learning-progress-fill"
                    style={{
                      width: `${progressPercentage}%`,
                    }}
                  />
                </div>



              </div>



              {/* Topics Needing Review */}



              <div
                className={
                  reviewedTopics.length > 0
                    ? "review-status review-status-warning"
                    : "review-status review-status-good"
                }
              >



                <h3>

                  {reviewedTopics.length > 0

                    ? "📖 Topics Needing Review"

                    : "✅ Review Status"}

                </h3>



                {reviewedTopics.length >

                0 ? (

                  <>

                    <p>

                      {

                        reviewedTopics.length

                      }{" "}

                      topic(s) have quiz

                      scores below 100.

                    </p>



                    <ul>

                      {reviewedTopics.map(

                        (topic) => (

                          <li

                            key={

                              topic.topic_id

                            }

                          >

                            {topic.topic} —{" "}

                            <strong>

                              {

                                quizScores[

                                  topic.topic_id

                                ]

                              }

                              /100

                            </strong>

                          </li>

                        )

                      )}

                    </ul>

                  </>

                ) : (

                  <p>

                    No topics currently

                    require review.

                  </p>

                )}



              </div>



              {/* Recommendation */}



              <div className="recommendation-panel">



                <h3>

                  🤖 Current Recommendation

                </h3>



                <p>

                  {

                    analyticsRecommendation

                  }

                </p>



              </div>

              <section className="learner-status-panel" aria-labelledby="learner-status-heading">
                <div className="learner-status-heading">
                  <div>
                    <span className="eyebrow">PERSONALIZED LEARNING SNAPSHOT</span>
                    <h3 id="learner-status-heading">Your Learning Status</h3>
                  </div>
                  <span className="learner-status-progress">{progressPercentage}% complete</span>
                </div>
                <div className="learner-status-grid">
                  <div>
                    <span>Current topic</span>
                    <strong>
                      {currentTopicIndex >= 0
                        ? learningPath.roadmap[currentTopicIndex].topic
                        : "Roadmap complete"}
                    </strong>
                  </div>
                  <div>
                    <span>Latest quiz score</span>
                    <strong>
                      {latestQuizAttempt
                        ? `${latestQuizAttempt.score}%`
                        : "Not attempted yet"}
                    </strong>
                  </div>
                  <div>
                    <span>Topics to review</span>
                    <strong>
                      {reviewedTopics.length > 0
                        ? reviewedTopics.map((topic) => topic.topic).join(", ")
                        : "None identified"}
                    </strong>
                  </div>
                  <div>
                    <span>Study time</span>
                    <strong>{learningPath.minutes_per_day} min/day</strong>
                  </div>
                </div>
                <p className="eyebrow">OPTIONAL AI ASSISTANCE</p>
                <div className="learner-status-actions">
                  <button
                    type="button"
                    onClick={() =>
                      document.getElementById("ai-tutor-panel")?.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      })
                    }
                  >
                    Ask AI Tutor
                  </button>
                  <button
                    type="button"
                    onClick={() => void requestAiRecommendation()}
                    disabled={loadingAiRecommendation}
                  >
                    {loadingAiRecommendation
                      ? "Preparing recommendation..."
                      : "Get AI Recommendation"}
                  </button>
                </div>
                {aiRecommendationError && (
                  <p className="ai-tutor-error" role="alert">
                    {aiRecommendationError}
                  </p>
                )}
                {aiRecommendation && (
                  <div className="ai-recommendation-result" aria-live="polite">
                    <div className="ai-recommendation-result-heading">
                      <strong>
                        {aiRecommendation.decision === "review"
                          ? "Review recommended"
                          : "Recommended Next Step"}
                      </strong>
                      <span>
                        {aiRecommendation.remaining_requests} of{" "}
                        {aiRecommendation.daily_limit} AI requests remaining today
                      </span>
                    </div>
                    <p>
                      <strong>Weak topic:</strong> {aiRecommendation.weak_topic}
                    </p>
                    <p>
                      <strong>Why:</strong> {aiRecommendation.why_review}
                    </p>
                    <p>
                      <strong>Recommended topic:</strong>{" "}
                      {aiRecommendation.recommended_topic}
                    </p>
                    <p>
                      <strong>Suggested study time:</strong>{" "}
                      {aiRecommendation.suggested_study_minutes} minutes
                    </p>
                    <strong className="practice-list-heading">Practice next</strong>
                    <ul>
                      {aiRecommendation.practice_items.map((item, index) => (
                        <li key={`${index}-${item}`}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>


            </div>



            {/* PROGRESS */}



            <div className="learning-progress-panel">



              <h3>

                📈 Learning Progress

              </h3>



              <p>

                <strong>

                  {completedCount} /{" "}

                  {totalTopics}

                </strong>{" "}

                topics completed (

                {progressPercentage}%)

              </p>



              {completedCount > 0 && (

                <button

                  onClick={

                    resetProgress

                  }

                  style={{

                    marginTop:

                      "10px",

                    background:

                      "#dc2626",

                  }}

                >

                  Reset Progress

                </button>

              )}



            </div>



            {/* ROADMAP */}



            <div className="roadmap">



              {learningPath.roadmap.map(

(item, index) => {



                  const isCompleted =

                    completedTopics.includes(

                      item.topic_id

                    );



                  const quizResult =

                    quizResults[

                      item.topic_id

                    ];



                  return (

                    <div

className={
  isCompleted
    ? "topic completed"
    : index === currentTopicIndex
      ? "topic current"
      : "topic upcoming"
}

                      key={

                        item.topic_id

                      }

                      style={{

                        opacity:

                          isCompleted

                            ? 0.75

                            : 1,



                        borderLeft:

                          isCompleted

                            ? "5px solid #22c55e"

                            : "5px solid #2563eb",



                        paddingLeft:

                          "15px",



                        marginBottom:

                          "20px",

                      }}

                    >



                      <div

                        className="step"

                        style={{

                          background:

                            isCompleted

                              ? "#22c55e"

                              : "#2563eb",

                        }}

                      >

                        {isCompleted

                          ? "✓"

                          : item.step}

                      </div>



                      <div className="topic-content">



                        <h3

                          style={{

                            textDecoration:

                              isCompleted

                                ? "line-through"

                                : "none",

                          }}

                        >
                          {item.topic}
                        </h3>

                        <div className="topic-meta">
                          <span>{learningPath.current_level}</span>
                          <span>{item.estimated_minutes} min</span>
                          {quizScores[item.topic_id] !== undefined && (
                            <span>Quiz score {quizScores[item.topic_id]}%</span>
                          )}
                          <span className="topic-status">
                            {isCompleted
                              ? "Prerequisite complete"
                              : index === currentTopicIndex
                                ? "Current focus"
                                : "Up next"}
                          </span>
                        </div>



                        <p>

                          {

                            item.explanation

                          }

                        </p>



                        {/* QUIZ */}



                        <div className="practice">



                          <strong>

                            📝 Practice Question

                          </strong>



                          <p>

                            {

                              item.practice_question

                            }

                          </p>



                          <input

                            type="text"

                            placeholder="Type your answer..."

                            value={

                              quizAnswers[

                                item.topic_id

                              ] || ""

                            }

                            onChange={(e) =>

                              setQuizAnswers(

                                (

                                  previous

                                ) => ({

                                  ...previous,

                                  [item.topic_id]:

                                    e.target

                                      .value,

                                })

                              )

                            }

                            onKeyDown={(e) => {

                              if (

                                e.key ===

                                "Enter"

                              ) {

                                submitQuiz(

                                  item.topic_id

                                );

                              }

                            }}

                            style={{

                              width:

                                "100%",

                              padding:

                                "10px",

                              marginTop:

                                "10px",

                              border:

                                "1px solid #ccc",

                              borderRadius:

                                "6px",

                              boxSizing:

                                "border-box",

                            }}

                          />



                          <button


            type="button"


            className="quiz-submit-button"


            onClick={(event) => {


              event.preventDefault();


              void submitQuiz(item.topic_id);


            }}


            disabled={!!submittingQuiz[item.topic_id]}


            style={{


              marginTop: "10px",


              background: "#2563eb",


            }}


          >


            {submittingQuiz[item.topic_id] ? "Submitting..." : "Submit Answer"}


          </button>



                          {/* QUIZ RESULT */}



                          {quizResult && (
                            <div
                              className={
                                quizResult.correct
                                  ? "quiz-result quiz-result-correct"
                                  : "quiz-result quiz-result-incorrect"
                              }
                              style={{

                                marginTop:

                                  "12px",

                                padding:

                                  "12px",

                                borderRadius:

                                  "8px",

                                background:

                                  quizResult.correct

                                    ? "#dcfce7"

                                    : "#fee2e2",

                              }}

                            >



                              <strong>

                                {quizResult.correct

                                  ? "✅ Correct!"

                                  : "❌ Incorrect"}

                              </strong>



                              <p>

                                Score:{" "}

                                <strong>

                                  {

                                    quizResult.score

                                  }

                                  /100

                                </strong>

                              </p>



                              <p>

                                {

                                  quizResult.message

                                }

                              </p>



                              {!quizResult.correct &&

                                quizResult.correct_answer && (

                                  <p>

                                    <strong>

                                      Correct Answer:

                                    </strong>{" "}

                                    {

                                      quizResult.correct_answer

                                    }

                                  </p>

                                )}

                              {!quizResult.correct && (
                                <>
                                  <button
                                    type="button"
                                    className="ai-inline-button"
                                    onClick={() => void explainQuizAnswer(item.topic_id)}
                                    disabled={
                                      !!loadingAiQuizExplanation[item.topic_id]
                                    }
                                  >
                                    {loadingAiQuizExplanation[item.topic_id]
                                      ? "Preparing explanation..."
                                      : "Get AI Explanation"}
                                  </button>
                                  {aiQuizExplanationErrors[item.topic_id] && (
                                    <p className="ai-tutor-error" role="alert">
                                      {aiQuizExplanationErrors[item.topic_id]}
                                    </p>
                                  )}
                                  {aiQuizExplanations[item.topic_id] && (
                                    <div
                                      className="ai-quiz-explanation"
                                      aria-live="polite"
                                    >
                                      <div className="ai-recommendation-result-heading">
                                        <strong>AI answer explanation</strong>
                                        <span>
                                          {
                                            aiQuizExplanations[item.topic_id]
                                              .remaining_requests
                                          }{" "}
                                          of{" "}
                                          {
                                            aiQuizExplanations[item.topic_id]
                                              .daily_limit
                                          }{" "}
                                          AI requests remaining today
                                        </span>
                                      </div>
                                      <p>
                                        {
                                          aiQuizExplanations[item.topic_id]
                                            .response
                                        }
                                      </p>
                                    </div>
                                  )}
                                </>
                              )}

                              <button
                                type="button"
                                className="ai-inline-button"
                                onClick={() => void requestAiRecommendation()}
                                disabled={loadingAiRecommendation}
                              >
                                {loadingAiRecommendation
                                  ? "Preparing recommendation..."
                                  : "Get AI Study Recommendation"}
                              </button>

                              {/* ADAPTIVE RECOMMENDATION */}



                              <div
                                className="quiz-recommendation"
                                style={{

                                  marginTop:

                                    "12px",

                                  padding:

                                    "10px",

                                  borderRadius:

                                    "6px",

                                  background:

                                    getQuizRecommendation(

                                      quizResult

                                    ).background,

                                }}

                              >



                                <strong>

                                  {

                                    getQuizRecommendation(

                                      quizResult

                                    ).title

                                  }

                                </strong>



                                <p>

                                  {

                                    getQuizRecommendation(

                                      quizResult

                                    ).message

                                  }

                                </p>



                              </div>



                            </div>

                          )}



                        </div>



                        <small className="topic-estimate">
                          Estimated time:{" "}
                          {
                            item.estimated_minutes

                          }{" "}

                          minutes

                        </small>



                        {/* MANUAL COMPLETION */}



                        <div

                          style={{

                            marginTop:

                              "12px",

                          }}

                        >



                          <button

                            onClick={() =>

                              toggleTopicCompletion(

                                item.topic_id

                              )

                            }

                            style={{

                              background:

                                isCompleted

                                  ? "#64748b"

                                  : "#22c55e",

                            }}

                          >

                            {isCompleted

                              ? "✓ Completed — Mark Incomplete"

                              : "Mark as Completed"}

                          </button>



                        </div>



                      </div>



                    </div>

                  );

                }

              )}



            </div>



          </section>

        )}



        {/* CHATBOT */}



        <section className="card">



          <h2>

<span className="assistant-orb" aria-hidden="true">✦</span>
Learning Assistant

          </h2>



          <label>

            Ask a Question

          </label>



          <div className="chat-input">



            <input

              type="text"

              placeholder="Example: What are Python data types?"

              value={question}

              onChange={(e) =>

                setQuestion(

                  e.target.value

                )

              }

              onKeyDown={(e) => {

                if (

                  e.key === "Enter"

                ) {

                  askQuestion();

                }

              }}

            />



            <button

              onClick={

                askQuestion

              }

              disabled={

                loadingChat

              }

            >

              {loadingChat

                ? "..."

                : "Ask"}

            </button>



          </div>



          {chatAnswer && (
            <div className="chat-result">

              {chatAnswer.success && chatAnswer.response && (
                <div className="assistant-response-meta">
                  <span>Topic: {chatAnswer.response.topic}</span>
                  <span>
                    Confidence score: {chatAnswer.response.confidence}
                  </span>
                </div>
              )}


              {chatAnswer.success &&
              chatAnswer.response ? (

                <>



                  <h3>

                    {

                      chatAnswer

                        .response

                        .topic

                    }

                  </h3>



                  <p>

                    {

                      chatAnswer

                        .response

                        .explanation

                    }

                  </p>



                  <div className="practice">



                    <strong>

                      Practice Question

                    </strong>



                    <p>

                      {

                        chatAnswer

                          .response

                          .practice_question

                      }

                    </p>



                  </div>



                  <div className="answer">



                    <strong>

                      Answer

                    </strong>



                    <p>

                      {

                        chatAnswer

                          .response

                          .answer

                      }

                    </p>



                  </div>



                </>

              ) : (

                <p>

                  {

                    chatAnswer.message

                  }

                </p>

              )}



            </div>

          )}



        </section>

        <section
          id="ai-tutor-panel"
          className="card ai-tutor-card"
          aria-labelledby="ai-tutor-heading"
        >
          <div className="ai-tutor-heading">
            <span className="ai-tutor-orb" aria-hidden="true">✦</span>
            <div>
              <span className="eyebrow">OPTIONAL AI ASSISTANCE · PERSONALIZED SUPPORT</span>
              <h2 id="ai-tutor-heading">AI Learning Tutor</h2>
            </div>
          </div>
          <p className="ai-tutor-intro">
            Ask for an explanation, example, or study guidance. The tutor uses
            your learning level, goal, topic progress, and available quiz results
            to tailor its response.
          </p>
          <div className="ai-learner-context" aria-label="Current learning context">
            <span>Learning level: {learningPath?.current_level ?? level}</span>
            <span>
              Current topic:{" "}
              {currentTopicIndex >= 0
                ? learningPath?.roadmap[currentTopicIndex].topic
                : "Not selected"}
            </span>
            <span>
              Latest quiz score:{" "}
              {latestQuizAttempt ? `${latestQuizAttempt.score}%` : "Not attempted"}
            </span>
          </div>
          <form
            className="ai-tutor-form"
            onSubmit={(event) => {
              event.preventDefault();
              void askAiTutor();
            }}
          >
            <label htmlFor="ai-tutor-question">Your question</label>
            <textarea
              id="ai-tutor-question"
              rows={3}
              maxLength={2000}
              placeholder="For example: Explain Python loops like I am a beginner."
              value={aiTutorQuestion}
              onChange={(event) => setAiTutorQuestion(event.target.value)}
              disabled={loadingAiTutor}
            />
            <div className="ai-tutor-actions">
              <span>Personalized using your current learning progress</span>
              <button type="submit" disabled={loadingAiTutor}>
                {loadingAiTutor ? "Preparing your explanation..." : "Ask AI Tutor"}
              </button>
            </div>
          </form>
          {loadingAiTutor && (
            <p className="ai-tutor-status" role="status">
              The AI tutor is preparing a personalized response…
            </p>
          )}
          {aiTutorError && (
            <p className="ai-tutor-error" role="alert">
              {aiTutorError}
            </p>
          )}
          {aiTutorAnswer && (
            <div className="ai-tutor-response" aria-live="polite">
              <div className="ai-tutor-response-header">
                <strong>Your learning response</strong>
                <span>
                  {aiTutorAnswer.remaining_requests} of{" "}
                  {aiTutorAnswer.daily_limit} AI requests remaining today
                </span>
              </div>
              <p>{aiTutorAnswer.response}</p>
              {extractTutorSection(
                aiTutorAnswer.response,
                "Suggested next topic",
              ) && (
                <div className="ai-tutor-highlight">
                  <strong>Recommended next topic</strong>
                  <p>
                    {extractTutorSection(
                      aiTutorAnswer.response,
                      "Suggested next topic",
                    )}
                  </p>
                </div>
              )}
              {extractTutorSection(
                aiTutorAnswer.response,
                "Practice question",
              ) && (
                <div className="ai-tutor-highlight">
                  <strong>Practice question</strong>
                  <p>
                    {extractTutorSection(
                      aiTutorAnswer.response,
                      "Practice question",
                    )}
                  </p>
                </div>
              )}
            </div>
          )}
        </section>


      </main>



      {/* FOOTER */}



      <footer>
        <p>
          Personalized Learning Assistant <span>·</span> Learn with intention, one concept at a time.
        </p>
      </footer>



    </div>

  );

}



export default App;