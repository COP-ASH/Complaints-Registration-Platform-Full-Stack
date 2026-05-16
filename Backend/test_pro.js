import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

async function testPro() {
    const apiKey = process.env.GEMINI_API_KEY;
    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent("test");
        console.log("Success with gemini-pro");
    } catch (error) {
        console.error("Error with gemini-pro:", error.message);
    }
}

testPro();
