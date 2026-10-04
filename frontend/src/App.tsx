import { useEffect, useState } from "react";

import "./App.css";



const API_URL = "http://127.0.0.1:8000";



const STORAGE_KEY = "personalized_learning_completed_topics";

const QUIZ_STORAGE_KEY = "personalized_learning_quiz_scores";



interface Topic {

  step: number;

  topic_id: string;

  topic: string;

  explanation: string;

  estimated_minutes: number;

  practice_question: string;

}



interface LearningPathResponse {

  goal: string;

  current_level: string;

  minutes_per_day: number;

  estimated_total_minutes: number;

  estimated_days: number;

  roadmap: Topic[];

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



function App() {

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



  // --------------------------------

  // Progress State

  // --------------------------------



  const [completedTopics, setCompletedTopics] =

    useState<string[]>([]);



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


        `${API_URL}/quiz`,


        {


          method: "POST",


          headers: {


            "Content-Type": "application/json",


          },


          body: JSON.stringify({


            topic_id: topicId,


            user_answer: answer,


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




      const score = typeof data.score === "number" ? data.score : 0;

      setQuizScores((previous: { [topicId: string]: number }) => ({
        ...previous,
        [topicId]: score,
      }));




      if (data.correct) {


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



  const toggleTopicCompletion = (

    topicId: string

  ) => {

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



  const resetProgress = () => {

    const confirmed =

      window.confirm(

        "Are you sure you want to reset your learning progress and quiz scores?"

      );



    if (!confirmed) {

      return;

    }



    setCompletedTopics([]);

    setQuizScores({});

    setQuizResults({});

    setQuizAnswers({});



    localStorage.removeItem(

      STORAGE_KEY

    );



    localStorage.removeItem(

      QUIZ_STORAGE_KEY

    );



    setLearningPath(null);

  };



  // --------------------------------

  // Progress Calculations

  // --------------------------------



  const totalTopics =

    learningPath?.roadmap.length || 0;



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
            <div className="eyebrow">LEARNING MISSION CONTROL</div>
            <h1>Personalized Learning Assistant</h1>
            <p>
              A hybrid intelligent learning workspace that adapts your Python roadmap,
              practice, progress and knowledge support around your learning goal.
            </p>
          </div>
          <div className="system-pill">
            <span className="status-dot" />
            <span>Hybrid rule-based + knowledge-based assistant</span>
          </div>
        </div>
      </header>

      <section className="mission-hero" aria-label="Python learning universe">
        <div className="hero-copy">
          <span className="eyebrow">PYTHON LEARNING UNIVERSE</span>
          <h2>Build your path.<br /><span>Master one concept at a time.</span></h2>
          <p>
            Generate an adaptive roadmap and use your progress and quiz results to decide
            what to continue or review next.
          </p>
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

      <main className="container">



        {/* LEARNING PATH FORM */}



        <section className="card">



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

                (item) => {



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

                      className="topic"

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



                              {/* ADAPTIVE RECOMMENDATION */}



                              <div

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



                        <small>

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

            💬 Learning Assistant

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



      </main>



      {/* FOOTER */}



      <footer>

        <p>

          Hybrid Intelligent Personalized

          Learning Assistant

        </p>

      </footer>



    </div>

  );

}



export default App;