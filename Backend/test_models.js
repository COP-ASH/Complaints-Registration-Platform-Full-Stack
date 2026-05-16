import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

async function listModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    try {
        // The listModels method is not directly on genAI in some versions.
        // It might be on a different service.
        // But let's try to see if we can get it.
        // Actually, let's just try gemini-1.5-flash again but maybe check the version of the SDK.
        
        const genAI = new GoogleGenerativeAI(apiKey);
        // Let's try gemini-pro (the older model) just to see if it works.
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
        const result = await model.generateContent("test");
        console.log("Success with gemini-1.5-flash-latest");
    } catch (error) {
        console.error("Error with gemini-1.5-flash-latest:", error.message);
        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-8b" });
            await model.generateContent("test");
            console.log("Success with gemini-1.5-flash-8b");
        } catch (e2) {
             console.error("Error with gemini-1.5-flash-8b:", e2.message);
        }
    }
}

listModels();
