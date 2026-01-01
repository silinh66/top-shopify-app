import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const key = process.env.GEMINI_API_KEY;
console.log("Testing Key:", key ? "Present" : "Missing");

const genAI = new GoogleGenerativeAI(key);

async function test() {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

        console.log("Testing generation with gemini-2.0-flash-exp...");
        const result = await model.generateContent("Hello, does this work?");
        console.log("Success! Response:", await result.response.text());

    } catch (e) {
        console.error("Test Failed:", e.message);
    }
}

test();
