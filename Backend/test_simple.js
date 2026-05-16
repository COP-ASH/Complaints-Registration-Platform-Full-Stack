import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

async function testSimple() {
    const apiKey = process.env.GEMINI_API_KEY;
    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        // Simple string argument instead of object
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); 
        // Wait, the documentation for 0.24.1 says:
        // const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        // is correct.
        
        const result = await model.generateContent("test");
        console.log("Success!");
    } catch (error) {
        console.error("Error:", error.message);
    }
}

testSimple();
