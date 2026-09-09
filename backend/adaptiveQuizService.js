const crypto = require("crypto");
const { GoogleGenAI } = require("@google/genai");

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const BATCH_SIZE = 5;
const GEMINI_MAX_RETRIES = 3;
const GEMINI_RETRYABLE_STATUS_CODES = new Set([429, 503]);
const geminiApiKey = String(process.env.GEMINI_API_KEY || "").trim();
const geminiEndpoint = `v1beta/models/${GEMINI_MODEL}:generateContent`;
const geminiClient = geminiApiKey ? new GoogleGenAI({ apiKey: geminiApiKey }) : null;
const generatedQuestions = new Map();
const PERSONA_CONTEXT = {
  scientist: { name: "Scientist", tagline: "Hypothesize. Test. Conclude.", traits: "evidence-based, analytical, precise" },
  detective: { name: "Detective", tagline: "Every clue leads somewhere.", traits: "deductive, observant, clue-focused" },
  wizard: { name: "Wizard", tagline: "Ancient wisdom speaks through you.", traits: "creative, metaphorical, imaginative" },
  warrior: { name: "Warrior", tagline: "No hesitation. Strike fast.", traits: "direct, decisive, action-oriented" },
  sage: { name: "Sage", tagline: "True wisdom is teaching others.", traits: "clear, patient, beginner-friendly" },
};

if (!geminiApiKey) {
  console.warn("No GEMINI_API_KEY set — AI question generation disabled. Using questions.json fallback.");
} else {
  console.log(`Gemini configured with model ${GEMINI_MODEL}.`);
}

const QUIZ_SCHEMA = {
  questions: [
    {
      id: "q1",
      question: "",
      options: [],
      correctAnswerIndex: 0,
      hint: "",
      explanation: "",
    },
  ],
};

function optionText(option) {
  if (typeof option === "string") return option.trim();
  return String(option?.text ?? option?.label ?? "").trim();
}

function normalizeQuestion(question, index, subtopicId, difficulty) {
  if (!question || typeof question.question !== "string" || !Array.isArray(question.options)) {
    return null;
  }

  const options = question.options.map(optionText).filter(Boolean).slice(0, 4);
  const correctAnswerIndex = Number(question.correctAnswerIndex);
  if (
    options.length < 2 ||
    !Number.isInteger(correctAnswerIndex) ||
    correctAnswerIndex < 0 ||
    correctAnswerIndex >= options.length
  ) {
    return null;
  }

  return {
    id: String(question.id || `ai-${subtopicId || "quiz"}-${index}-${crypto.randomUUID()}`),
    subtopicId: question.subtopicId || subtopicId || null,
    difficulty,
    question: question.question.trim(),
    options,
    correctAnswerIndex,
    hint: String(question.hint || "").trim(),
    explanation: String(question.explanation || "").trim(),
  };
}

function parseJson(text) {
  const cleaned = text
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
  return JSON.parse(cleaned);
}

function retryDelayMs(retryNumber) {
  const exponentialDelay = 2000 * (2 ** retryNumber);
  const jitter = Math.floor(Math.random() * 500);
  return exponentialDelay + jitter;
}

function fallbackQuestions(questions, subtopicId, difficulty) {
  if (!questions || !questions.length) return [];

  const subtopicMatching = subtopicId
    ? questions.filter((q) => q.subtopicId === subtopicId)
    : [];

  // Start with shuffled subtopic matching questions
  const selectedPool = [...subtopicMatching].sort(() => Math.random() - 0.5);

  // If subtopic matching has fewer than BATCH_SIZE, fill remaining from same topic or general pool
  if (selectedPool.length < BATCH_SIZE) {
    const selectedIds = new Set(selectedPool.map((q) => q.id));
    const targetTopicId = subtopicMatching[0]?.topicId;

    const sameTopicPool = targetTopicId
      ? questions.filter((q) => q.topicId === targetTopicId && !selectedIds.has(q.id))
      : [];
    const shuffledSameTopic = [...sameTopicPool].sort(() => Math.random() - 0.5);

    for (const q of shuffledSameTopic) {
      if (selectedPool.length >= BATCH_SIZE) break;
      selectedPool.push(q);
      selectedIds.add(q.id);
    }

    // If still less than BATCH_SIZE, fill from remaining general questions
    if (selectedPool.length < BATCH_SIZE) {
      const generalPool = questions.filter((q) => !selectedIds.has(q.id));
      const shuffledGeneral = [...generalPool].sort(() => Math.random() - 0.5);
      for (const q of shuffledGeneral) {
        if (selectedPool.length >= BATCH_SIZE) break;
        selectedPool.push(q);
        selectedIds.add(q.id);
      }
    }
  }

  const optionIds = ["A", "B", "C", "D"];

  return selectedPool.slice(0, BATCH_SIZE).map((question, index) => {
    const options = Array.isArray(question.options)
      ? question.options.map(optionText).filter(Boolean)
      : [];
    const correctAnswerIndex = Math.max(0, optionIds.indexOf(String(question.correctOption || "").toUpperCase()));
    return {
      id: `fallback-${question.id}-${index}`,
      subtopicId: question.subtopicId || subtopicId || null,
      difficulty,
      question: question.question,
      options,
      correctAnswerIndex: Math.min(correctAnswerIndex, Math.max(options.length - 1, 0)),
      hint: question.hint || "",
      explanation: question.explanation || "",
      // Preserve fields needed by submit-batch scoring
      correctOption: question.correctOption || null,
      concept: question.concept || "",
      topicId: question.topicId || null,
      topicName: question.topicName || null,
      subtopicName: question.subtopicName || null,
    };
  });
}

async function generateWithGemini({ subtopicId, subtopicName, difficulty, persona, count = BATCH_SIZE, questionIndex, requestId }) {
  if (!geminiClient) return null;

  const personaKey = typeof persona === "string" ? persona.toLowerCase() : persona?.id?.toLowerCase();
  const activePersona = PERSONA_CONTEXT[personaKey] || PERSONA_CONTEXT.scientist;
  const personaInstruction = `You are acting as the persona: ${activePersona.name} (${activePersona.tagline}). Adopt a ${activePersona.traits} tone and vocabulary.`;
  const schema = count === 1
    ? { question: "", options: [], correctAnswerIndex: 0, hint: "", explanation: "" }
    : QUIZ_SCHEMA;
  const freshness = count === 1 ? `This is question ${questionIndex || 1}; create a fresh question different from earlier requests. Request id: ${requestId || "none"}.` : "";
  const prompt = `${personaInstruction} Create ${count} quiz question${count === 1 ? "" : "s"} for the topic or sub-topic "${subtopicName || subtopicId || "general programming"}" at ${difficulty} difficulty. ${freshness} Frame the question as a scenario fitting this persona, write four options, and keep the explanation strictly in character. Return only valid JSON matching this schema, with no markdown or extra keys: ${JSON.stringify(schema)}. ${count === 1 ? "Return one object." : "Return an object with a questions array containing exactly five questions."}`;
  const request = {
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      temperature: 0.5,
      responseMimeType: "application/json",
      systemInstruction: personaInstruction,
    },
  };

  for (let retryNumber = 0; retryNumber <= GEMINI_MAX_RETRIES; retryNumber += 1) {
    console.info("Gemini request", {
      endpoint: geminiEndpoint,
      model: GEMINI_MODEL,
      request: {
        model: request.model,
        contents: request.contents,
        config: request.config,
      },
      attempt: retryNumber + 1,
    });

    try {
      const response = await geminiClient.models.generateContent(request);
      console.info("Gemini response", {
        endpoint: geminiEndpoint,
        status: 200,
        finishReason: response.candidates?.[0]?.finishReason || "unknown",
      });

      const candidate = response.candidates?.[0];
      const finishReason = candidate?.finishReason;
      if (["SAFETY", "RECITATION", "BLOCKLIST", "PROHIBITED_CONTENT"].includes(finishReason)) {
        throw new Error(`Gemini response blocked with finishReason ${finishReason}`);
      }

      const text = typeof response.text === "string" ? response.text.trim() : "";
      if (!text) {
        throw new Error(`Gemini returned no usable text${finishReason ? ` (finishReason: ${finishReason})` : ""}`);
      }

      const parsed = parseJson(text);
      if (count === 1) return [parsed];
      if (!Array.isArray(parsed.questions)) throw new Error("Gemini response did not contain a questions array");
      return parsed.questions;
    } catch (error) {
      const status = Number(error.status || error.code || error.response?.status || 0);
      console.warn("Gemini response", {
        endpoint: geminiEndpoint,
        status: status || "unknown",
        error: error.message,
      });
      if (GEMINI_RETRYABLE_STATUS_CODES.has(status) && retryNumber < GEMINI_MAX_RETRIES) {
        const delay = retryDelayMs(retryNumber);
        console.warn(`Gemini returned HTTP ${status}; retrying in ${delay}ms.`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw new Error(`Gemini request failed${status ? ` (${status})` : ""}: ${error.message}`);
    }
  }

  throw new Error("Gemini request exhausted its retry budget");
}

async function getQuestionBatch({ questions, subtopicId, subtopicName, difficulty = "Beginner" }) {
  try {
    const generated = await generateWithGemini({ subtopicId, subtopicName, difficulty });
    const normalized = generated
      .map((question, index) => normalizeQuestion(question, index, subtopicId, difficulty))
      .filter(Boolean)
      .slice(0, BATCH_SIZE);
    if (normalized.length === BATCH_SIZE) {
      normalized.forEach(rememberQuestion);
      return { questions: normalized, source: "gemini", difficulty };
    }
    throw new Error("Gemini returned an invalid question batch");
  } catch (error) {
    if (geminiApiKey) {
      console.warn(`Gemini unavailable; using questions.json fallback: ${error.message}`);
    }
    const batch = fallbackQuestions(questions, subtopicId, difficulty);
    batch.forEach(rememberQuestion);
    return { questions: batch, source: "fallback", difficulty };
  }
}

async function getPersonaQuestion({ questions, stageId, topic, persona, difficulty = "Beginner", questionIndex, requestId }) {
  try {
    const generated = await generateWithGemini({ subtopicId: stageId, subtopicName: topic, difficulty, persona, count: 1, questionIndex, requestId });
    const normalized = normalizeQuestion(generated[0], 0, stageId, difficulty);
    if (!normalized) throw new Error("Gemini returned an invalid persona question");
    return {
      ...normalized,
      options: normalized.options.map((text, index) => ({ id: String.fromCharCode(65 + index), text })),
      correctOption: String.fromCharCode(65 + normalized.correctAnswerIndex),
      source: "gemini",
    };
  } catch (error) {
    if (geminiApiKey) console.warn(`Persona Gemini question unavailable; using questions.json fallback: ${error.message}`);
    const topicPool = questions.filter((question) =>
      question.topicName === topic ||
      question.topicId === topic ||
      question.subtopicName === topic ||
      question.subtopicId === topic
    );
    const stagePool = questions.filter((question) => question.stageId === stageId);
    const fallbackPool = topicPool.length ? topicPool : stagePool.length ? stagePool : questions;
    const fallback = fallbackPool.length
      ? fallbackPool[(Math.max(Number(questionIndex) || 1, 1) - 1) % fallbackPool.length]
      : null;
    return fallback
      ? { ...fallback, id: `fallback-persona-${fallback.id}-${questionIndex || 1}-${crypto.randomUUID()}`, source: "fallback" }
      : null;
  }
}

function rememberQuestion(question) {
  if (question?.id != null) generatedQuestions.set(String(question.id), question);
  return question;
}

function findQuestion(questionId, questions) {
  return generatedQuestions.get(String(questionId))
    || questions.find((question) => String(question.id) === String(questionId));
}

module.exports = { getQuestionBatch, getPersonaQuestion, findQuestion, rememberQuestion };
