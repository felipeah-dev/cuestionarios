import { GoogleGenAI } from "@google/genai";
import { getGeminiProctoringModel } from "@/lib/proctoring/config";
import {
  proctoringAiResultSchema,
  proctoringResponseJsonSchema,
} from "@/lib/proctoring/schema";

export const PROCTORING_GEMINI_PROMPT = `You are an AI proctoring assistant analyzing a webcam snapshot from an online exam session.

Your task is to detect only clearly visible suspicious behaviors related to exam integrity.

Analyze the image carefully and conservatively. Do not guess. If something is unclear, mark it as low confidence.

Check for:
1. A visible mobile phone, tablet, notes, book, or second screen.
2. Another person visibly present in the room.
3. The student looking away from the screen in a suspicious way.
4. The student clearly looking down toward their lap, desk, hands, or below the camera line in a way that could indicate a hidden phone or notes, even if the object is not visible.
5. The student not being visible or the camera being obstructed.
6. Any obvious external assistance.

Important rules:
- Do not identify the person.
- Do not infer gender, age, ethnicity, emotion, or personal traits.
- Only report observable visual evidence.
- If the student is clearly looking down for a suspicious reason, set mirada_fuera_de_pantalla to true. Do not set celular_detectado to true unless a phone is actually visible.
- Do not accuse the student directly.
- If the image is blurry, dark, or ambiguous, reduce the alert level.
- Return only valid JSON matching the required schema.

Alert level rules:
- "bajo": no clear suspicious behavior.
- "medio": possible suspicious behavior, including clear downward gaze toward the lap or desk when a hidden phone or notes are plausible but not visible.
- "alto": clear visible evidence, such as a phone in hand, another person helping, visible notes, camera intentionally blocked, or an unmistakably suspicious downward posture with attention fully away from the exam.`;

export async function analyzeProctoringSnapshot(bytes: Buffer, mimeType: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY no esta configurada");
  }

  const model = getGeminiProctoringModel();
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        inlineData: {
          mimeType,
          data: bytes.toString("base64"),
        },
      },
      { text: PROCTORING_GEMINI_PROMPT },
    ],
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: proctoringResponseJsonSchema,
      temperature: 0,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Gemini no devolvio texto");
  }

  const parsed = proctoringAiResultSchema.parse(JSON.parse(text));

  return {
    model,
    result: parsed,
  };
}
