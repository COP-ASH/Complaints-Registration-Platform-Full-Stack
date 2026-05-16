import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const getAIQuestion = async (complaintText) => {
  try {
    // Changed to 'gemini-pro' as it is a verified stable model
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `You are a helpful assistant for a complaint registration platform. 
    A user has submitted the following complaint: "${complaintText}".
    Please provide exactly one short, relevant follow-up question to help clarify or get more details about the complaint. 
    Return ONLY the question text.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error('❌ Gemini API error in getAIQuestion:', error);
    return "Could you provide more details about this issue?"; // Fallback
  }
};
