import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

async function testGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log('API Key:', apiKey ? '[REDACTED]' : 'undefined');

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    // List available models
    const models = await genAI.listModels();
    console.log('Available models:', models.map(m => m.name));

    // Choose a model that exists (fallback to first if list is empty)
    const chosenModel = models.find(m => m.name.includes('gemini'))?.name || models[0]?.name;
    if (!chosenModel) {
      console.error('No models returned from API');
      return;
    }
    console.log('Using model:', chosenModel);

    const model = genAI.getGenerativeModel({ model: chosenModel });
    const prompt = "Say hello";
    const result = await model.generateContent(prompt);
    const response = await result.response;
    console.log('Gemini Response:', response.text());
  } catch (error) {
    console.error('Gemini Error Details:', error);
  }
}

testGemini();
