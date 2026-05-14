import { getGeminiModel } from '../config/ai.config.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import { sendResponse } from '../utils/sendResponse.js';

const VALID_CONTENT_TYPES = ['Overview', 'Highlights', 'Travel Tips'];

const prompts = {
  Overview: (dest) => `Generate a comprehensive travel overview for ${dest}.
    Include: general description, best time to visit, climate,
    local culture, and what makes it unique.
    Format as clear bullet points. Be accurate and informative.`,

  Highlights: (dest) => `List the top 7 travel highlights and must-see attractions for ${dest}.
    Include iconic landmarks, hidden gems, and unique experiences.
    Format as clear bullet points. Be specific with real place names.`,

  'Travel Tips': (dest) => `Provide 7 practical travel tips for visiting ${dest}.
    Cover: best time to visit, local transportation, currency,
    language tips, safety, cultural etiquette, and food recommendations.
    Format as clear bullet points with category labels like "Currency:", "Safety:", etc.`,
};

export const generateContent = catchAsync(async (req, res, next) => {
  const { destinationName, contentType } = req.body;

  if (!destinationName) {
    return next(new AppError(400, 'Destination name is required.'));
  }

  if (!VALID_CONTENT_TYPES.includes(contentType)) {
    return next(
      new AppError(400, `contentType must be one of: ${VALID_CONTENT_TYPES.join(', ')}`)
    );
  }

  const model = getGeminiModel();
  const result = await model.generateContent(prompts[contentType](destinationName));
  const content = result.response.text();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Content generated successfully.',
    data: { destinationName, contentType, content },
  });
});
