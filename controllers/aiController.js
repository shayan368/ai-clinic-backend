import DiagnosisLog from "../models/DiagnosisLog.js";

// ─────────────────────────────────────────────
// GEMINI CONFIG
// ─────────────────────────────────────────────
const MODEL = "gemini-3.5-flash";
const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

// ─────────────────────────────────────────────
// LOW-LEVEL GEMINI CALL
// Returns { text, finishReason, data } or null on failure
// ─────────────────────────────────────────────
const callGeminiRaw = async (prompt, { maxOutputTokens = 2048, jsonMode = false } = {}) => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.warn("⚠️ GEMINI_API_KEY not set");
    return null;
  }

  console.log("Prompt:", prompt);

  const generationConfig = {
    temperature: 0.2,
    maxOutputTokens,
    // Disable internal reasoning so output tokens aren't spent on thinking
    thinkingConfig: { thinkingLevel: "minimal" },
  };

  if (jsonMode) {
    generationConfig.responseMimeType = "application/json";
  }

  try {
    const url = `${API_BASE}/${MODEL}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig,
      }),
    });

    console.log("Gemini Status:", response.status);

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini API error:", response.status, errText);
      return null;
    }

    const data = await response.json();
    console.log("Gemini Response:", JSON.stringify(data, null, 2));

    const candidate = data?.candidates?.[0];
    if (!candidate) {
      console.error("Gemini API returned no candidates:", JSON.stringify(data));
      return null;
    }

    const text = candidate?.content?.parts?.[0]?.text;
    const finishReason = candidate?.finishReason;

    console.log("Generated Text:", text);

    if (!text) {
      console.error("Gemini API candidate missing text:", JSON.stringify(candidate));
      return { text: null, finishReason, data };
    }

    return { text, finishReason, data };

  } catch (err) {
    console.error("Gemini fetch error:", err.message);
    return null;
  }
};

// ─────────────────────────────────────────────
// Extract JSON between first "{" and last "}" and parse
// ─────────────────────────────────────────────
const extractJSON = (text) => {
  if (!text) return null;

  try {
    let clean = text
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();

    const firstBrace = clean.indexOf("{");
    const lastBrace  = clean.lastIndexOf("}");

    if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
      console.error("extractJSON: no valid JSON braces found in text:", clean);
      return null;
    }

    clean = clean.slice(firstBrace, lastBrace + 1);

    return JSON.parse(clean);
  } catch (err) {
    console.error("extractJSON: failed to parse AI response:", err.message);
    return null;
  }
};

// ─────────────────────────────────────────────
// callGeminiJSON
// Calls Gemini, returns parsed JSON.
// - Retries once with a larger token budget if truncated (MAX_TOKENS)
// - Retries once if JSON parsing fails
// - Throws if valid JSON cannot be produced after retries
// ─────────────────────────────────────────────
async function callGeminiJSON(prompt) {
  let result = await callGeminiRaw(prompt, { maxOutputTokens: 2048, jsonMode: true });

  if (!result) {
    throw new Error("Gemini request failed (no response)");
  }

  if (result.finishReason === "MAX_TOKENS") {
    console.warn("Gemini hit MAX_TOKENS, retrying with larger output budget");
    result = await callGeminiRaw(prompt, { maxOutputTokens: 4096, jsonMode: true });
    if (!result) {
      throw new Error("Gemini retry request failed (no response)");
    }
  }

  let parsed = extractJSON(result.text);

  if (!parsed) {
    console.warn("Gemini JSON parse failed, retrying once");
    const retryResult = await callGeminiRaw(prompt, { maxOutputTokens: 4096, jsonMode: true });

    if (!retryResult) {
      throw new Error("Gemini retry request failed (no response)");
    }

    parsed = extractJSON(retryResult.text);
  }

  if (!parsed) {
    throw new Error("Gemini did not return valid JSON after retries");
  }

  return parsed;
}

// ─────────────────────────────────────────────
// callGeminiText
// Calls Gemini and returns plain generated text (used for
// prescription explanations, which are prose, not JSON)
// ─────────────────────────────────────────────
async function callGeminiText(prompt) {
  let result = await callGeminiRaw(prompt, { maxOutputTokens: 2048, jsonMode: false });

  if (!result) {
    return null;
  }

  if (result.finishReason === "MAX_TOKENS") {
    console.warn("Gemini hit MAX_TOKENS, retrying with larger output budget");
    result = await callGeminiRaw(prompt, { maxOutputTokens: 4096, jsonMode: false });
    if (!result) {
      return null;
    }
  }

  return result.text || null;
}

// ─────────────────────────────────────────────
// FALLBACK RESPONSES (when AI is unavailable)
// ─────────────────────────────────────────────
const FALLBACK_SYMPTOM = {
  riskLevel:          "low",
  urgency:            "routine",
  summary:            "AI analysis is currently unavailable. Please consult the doctor directly for a proper diagnosis.",
  possibleConditions: ["Unable to analyze — AI service unavailable"],
  suggestedTests:     [],
};

const FALLBACK_RISK = {
  overallRisk:      "low",
  alertMessage:     "AI risk analysis is currently unavailable.",
  riskFlags:        [],
  recommendations:  ["Please consult a doctor for proper evaluation."],
  chronicRisk:       false,
  repeatedInfections:false,
};

// ─────────────────────────────────────────────
// SYMPTOM CHECKER
// POST /api/ai/symptom-checker
// ─────────────────────────────────────────────
export const symptomChecker = async (req, res) => {
  try {
    const { symptoms, age, gender, history, patientId } = req.body;

    if (!symptoms) {
      return res.status(400).json({
        success: false,
        message: "Symptoms are required",
      });
    }

    const prompt = `
You are a clinical AI assistant helping doctors in Pakistan.
Analyze the following patient information and provide a structured medical assessment.

Patient Info:
- Age: ${age || "unknown"}
- Gender: ${gender || "unknown"}
- Symptoms: ${symptoms}
- Medical History: ${history || "none provided"}

Respond ONLY with a valid JSON object in this exact format (no extra text, no markdown):
{
  "riskLevel": "low" | "medium" | "high",
  "urgency": "routine" | "urgent" | "emergency",
  "summary": "2-3 sentence clinical summary",
  "possibleConditions": ["condition1", "condition2", "condition3"],
  "suggestedTests": ["test1", "test2"],
  "recommendations": ["recommendation1", "recommendation2"]
}
`;

    let parsed;
    try {
      parsed = await callGeminiJSON(prompt);
    } catch (err) {
      console.error("symptomChecker: callGeminiJSON failed:", err.message);
      parsed = null;
    }

    const result  = parsed || FALLBACK_SYMPTOM;
    const usedFallback = !parsed;

    // Determine risk level
    const riskLevel = result.riskLevel || "low";

    // Save diagnosis log
    const log = await DiagnosisLog.create({
      patientId:   patientId || null,
      doctorId:    req.user.id,
      symptoms,
      aiResponse:  JSON.stringify(result),
      riskLevel,
    });

    res.status(200).json({
      success: true,
      data: {
        logId:        log.id,
        result,
        usedFallback,
      },
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─────────────────────────────────────────────
// PRESCRIPTION EXPLANATION
// POST /api/ai/prescription-explanation
// ─────────────────────────────────────────────
export const prescriptionExplanation = async (req, res) => {
  try {
    const {
      medicines, instructions, language = "english", prescriptionId,
    } = req.body;

    if (!medicines || medicines.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Medicines list is required",
      });
    }

    const medicineList = medicines
      .map((m) =>
        `- ${m.name} ${m.dosage || ""} — ${m.frequency || ""} for ${m.duration || ""}`
      )
      .join("\n");

    const langInstruction = language === "urdu"
      ? "Respond in simple Urdu (Roman or Arabic script)."
      : "Respond in simple plain English that a patient can understand.";

    const prompt = `
You are a medical assistant explaining a prescription to a patient in Pakistan.
${langInstruction}

Medicines prescribed:
${medicineList}

Doctor's instructions: ${instructions || "none"}

Write a clear, friendly explanation (3-5 sentences) covering:
1. What each medicine does in simple terms
2. How and when to take them
3. Any important warnings or side effects
4. When to contact the doctor

Do NOT use medical jargon. Write as plain paragraph text, not a list.
Respond with a plain text explanation only — do not wrap it in JSON.
`;

    const aiText     = await callGeminiText(prompt);
    const explanation = aiText?.trim() ||
      "AI explanation is currently unavailable. Please ask your doctor or pharmacist to explain your prescription.";

    res.status(200).json({
      success: true,
      data: {
        explanation,
        prescriptionId: prescriptionId || null,
        language,
        usedFallback: !aiText,
      },
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─────────────────────────────────────────────
// RISK FLAGGING
// POST /api/ai/risk-flagging
// ─────────────────────────────────────────────
export const riskFlagging = async (req, res) => {
  try {
    const {
      currentSymptoms,
      patientAge,
      patientGender,
      diagnosisHistory,
    } = req.body;

    if (!currentSymptoms) {
      return res.status(400).json({
        success: false,
        message: "Current symptoms are required",
      });
    }

    const historyText = Array.isArray(diagnosisHistory)
      ? diagnosisHistory.map((h) =>
          typeof h === "string" ? h : h.condition || JSON.stringify(h)
        ).join(", ")
      : diagnosisHistory || "none";

    const prompt = `
You are a clinical risk assessment AI for a clinic in Pakistan.
Analyze the following patient data for risk patterns.

Patient:
- Age: ${patientAge || "unknown"}
- Gender: ${patientGender || "unknown"}
- Current Symptoms: ${currentSymptoms}
- Diagnosis History: ${historyText}

Respond ONLY with valid JSON (no markdown, no extra text):
{
  "overallRisk": "low" | "medium" | "high",
  "alertMessage": "one sentence alert if high risk, or empty string",
  "riskFlags": ["flag1", "flag2"],
  "recommendations": ["action1", "action2"],
  "chronicRisk": true | false,
  "repeatedInfections": true | false
}
`;

    let parsed;
    try {
      parsed = await callGeminiJSON(prompt);
    } catch (err) {
      console.error("riskFlagging: callGeminiJSON failed:", err.message);
      parsed = null;
    }

    const result = parsed || FALLBACK_RISK;

    res.status(200).json({
      success: true,
      data:    { ...result, usedFallback: !parsed },
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─────────────────────────────────────────────
// PREDICTIVE ANALYTICS
// POST /api/ai/predictive-analytics
// ─────────────────────────────────────────────
export const predictiveAnalytics = async (req, res) => {
  try {
    const { month, year, diagnosisLogs, appointmentData } = req.body;

    const prompt = `
You are a healthcare analytics AI for a clinic in Pakistan.
Based on the following clinic data, provide predictive insights.

Period: ${month || "current month"} ${year || ""}
Recent Appointment Counts: ${JSON.stringify(appointmentData || [])}
Diagnosis Patterns: ${JSON.stringify(diagnosisLogs || [])}

Respond ONLY with valid JSON (no markdown, no extra text):
{
  "mostCommonDisease": "disease name",
  "patientLoadForecast": "brief forecast sentence",
  "trends": ["trend1", "trend2", "trend3"],
  "recommendations": ["recommendation1", "recommendation2"]
}
`;

    let parsed;
    try {
      parsed = await callGeminiJSON(prompt);
    } catch (err) {
      console.error("predictiveAnalytics: callGeminiJSON failed:", err.message);
      parsed = null;
    }

    const result = parsed || {
      mostCommonDisease:    "Data insufficient",
      patientLoadForecast:  "AI analytics unavailable at this time.",
      trends:               [],
      recommendations:      ["Collect more data for better predictions."],
    };

    res.status(200).json({
      success: true,
      data:    { ...result, usedFallback: !parsed },
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─────────────────────────────────────────────
// GET ALL DIAGNOSIS LOGS
// GET /api/ai/logs
// ─────────────────────────────────────────────
export const getDiagnosisLogs = async (req, res) => {
  try {
    const logs = await DiagnosisLog.findAll({
      order: [["createdAt", "DESC"]],
    });
    res.status(200).json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// GET PATIENT DIAGNOSIS LOGS
// GET /api/ai/logs/patient/:patientId
// ─────────────────────────────────────────────
export const getPatientDiagnosisLogs = async (req, res) => {
  try {
    const logs = await DiagnosisLog.findAll({
      where: { patientId: parseInt(req.params.patientId) },
      order: [["createdAt", "DESC"]],
    });
    res.status(200).json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// GET DOCTOR DIAGNOSIS LOGS
// GET /api/ai/logs/doctor/:doctorId
// ─────────────────────────────────────────────
export const getDoctorDiagnosisLogs = async (req, res) => {
  try {
    const logs = await DiagnosisLog.findAll({
      where: { doctorId: parseInt(req.params.doctorId) },
      order: [["createdAt", "DESC"]],
    });
    res.status(200).json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// GET SINGLE DIAGNOSIS LOG
// GET /api/ai/logs/:id
// ─────────────────────────────────────────────
export const getSingleDiagnosisLog = async (req, res) => {
  try {
    const log = await DiagnosisLog.findByPk(req.params.id);
    if (!log) {
      return res.status(404).json({
        success: false,
        message: "Diagnosis log not found",
      });
    }
    res.status(200).json({ success: true, data: log });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};