import { getGeminiJSONModel } from '../config/ai.config.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import { sendResponse } from '../utils/sendResponse.js';

const buildPrompt = (text) => `You are an expert travel fact-checker with deep knowledge of world geography,
culture, climate, and tourism.

Analyze the following travel-related text. Split it into individual factual claims (sentences or phrases).
For each claim, determine its accuracy based on your knowledge.

Text: "${text}"

Return a JSON array with this exact structure:
[
  {
    "claim": "the exact sentence or phrase from the text",
    "status": "Verified" or "Not Found" or "Pending",
    "reason": "one sentence explanation of why"
  }
]

Status rules:
- "Verified"  = claim is factually accurate and well-established
- "Not Found" = claim is inaccurate, misleading, or contradicts known facts
- "Pending"   = claim is subjective, ambiguous, or cannot be confirmed/denied

Return ONLY the JSON array. No extra text.`;

export const verifyFact = catchAsync(async (req, res, next) => {
  const { text } = req.body;

  if (!text) {
    return next(new AppError(400, 'Text to fact-check is required.'));
  }

  if (text.trim().length < 10) {
    return next(new AppError(400, 'Text is too short to fact-check.'));
  }

  // Native JSON mode — Gemini returns valid JSON without markdown fences
  const model = getGeminiJSONModel();
  const result = await model.generateContent(buildPrompt(text));
  const raw = result.response.text();

  let results;
  try {
    results = JSON.parse(raw);
    if (!Array.isArray(results)) throw new Error('Not an array');
  } catch {
    return next(new AppError(500, 'Failed to parse fact-check results. Please try again.'));
  }

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Fact check completed.',
    data: { totalClaims: results.length, results },
  });
});
