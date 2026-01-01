import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Debug: Check if dependencies loaded
console.log("Dependencies loaded. Using Local LLM Proxy at port 8317.");

process.on('exit', (code) => {
    console.log(`About to exit with code: ${code}`);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

const app = express();
const PORT = 5244;
const LLM_API_URL = "https://gemini.vibita.io/v1/chat/completions";


// Middleware
app.use(cors());
app.use(bodyParser.json());

const CACHE_DIR = path.join(__dirname, 'cache');
if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR);
}

// Helper: Scrape text from URL
async function scrapeAppContent(url) {
    try {
        const fetchUrl = url.startsWith('http') ? url : `https://${url}`;
        console.log(`Scraping: ${fetchUrl}`);

        const response = await fetch(fetchUrl);
        const html = await response.text();
        const $ = cheerio.load(html);

        // Remove script, style, and irrelevant tags
        $('script').remove();
        $('style').remove();
        $('nav').remove();
        $('footer').remove();

        const title = $('h1').text().trim();
        const description = $('#app-details').text().trim() || $('body').text().replace(/\s+/g, ' ').slice(0, 5000);
        const pricing = $('#ad-pricing-section').text().trim();

        const cleanText = `
            Title: ${title}
            Description (Snippet): ${description}
            Pricing: ${pricing}
        `;
        return cleanText;
    } catch (error) {
        console.error("Scraping Logic Error:", error);
        return null; // Return null but proceed to ask LLM with minimal context
    }
}

// API Endpoint
app.post('/api/analyze', async (req, res) => {
    const { url, appId, appName } = req.body;

    if (!url || !appId) {
        return res.status(400).json({ error: "Missing url or appId" });
    }

    const cacheFile = path.join(CACHE_DIR, `analysis_${appId}.json`);

    // 1. Check Cache
    if (fs.existsSync(cacheFile)) {
        console.log(`Serving from cache: ${appId}`);
        try {
            const cachedData = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
            return res.json(cachedData);
        } catch (e) {
            console.error("Cache read error, ignoring cache");
        }
    }

    // 2. Process New Request
    try {
        console.log(`Analyzing: ${appName} (${url}) via Local Proxy`);

        // Step A: Scrape Context
        const pageContext = await scrapeAppContent(url);

        // Step B: Call Local LLM Proxy (OpenAI Format)
        const promptSystem = `You are an expert Shopify App Store analyst.`;
        const promptUser = `
        Analyze the following Shopify App based on the name and scraped content.
        
        App Name: ${appName}
        URL: ${url}
        Context:
        ${pageContext || "Content could not be scraped. Analyze based on your knowledge."}

        Please provide a detailed analysis in Vietnamese (Tiếng Việt).
        Return the response strictly in JSON format. Do not surround with markdown code blocks.

        Format:
        {
            "main_features": "Liệt kê các tính năng chính",
            "pricing_model": "Phân tích chiến lược giá",
            "pros": "Điểm mạnh / Tính năng ăn tiền",
            "cons": "Điểm yếu / Hạn chế",
            "monetization_strategy": "Cách họ kiếm tiền",
            "similar_app_strategy": "Lời khuyên nếu tôi muốn làm app tương tự",
            "implementation_challenges": "Khó khăn kỹ thuật hoặc thị trường"
        }
        `;



        const payload = {
            model: "gemini-2.5-pro", // Confirmed available on remote
            messages: [
                { role: "system", content: promptSystem },
                { role: "user", content: promptUser }
            ],
            stream: false
        };

        console.log("Sending request to LLM Mux...");
        const llmResponse = await fetch(LLM_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer unused" // Unused key
            },
            body: JSON.stringify(payload)
        });

        if (!llmResponse.ok) {
            const errText = await llmResponse.text();
            throw new Error(`LLM API Error: ${llmResponse.status} - ${errText}`);
        }

        const llmData = await llmResponse.json();
        // OpenAI format response: choices[0].message.content
        let text = llmData.choices?.[0]?.message?.content;

        if (!text) {
            // Fallback for some proxies that might return non-standard format? 
            // But llm-mux claims OpenAI format.
            console.error("Unexpected LLM Response:", JSON.stringify(llmData));
            throw new Error("No content received from LLM");
        }

        // Clean JSON format (sometimes models add markdown)
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();

        // Parse JSON
        let analysisJson;
        try {
            analysisJson = JSON.parse(text);
        } catch (jsonErr) {
            console.error("JSON Parse Error:", text);
            return res.status(500).json({ error: "AI response was not valid JSON", raw: text });
        }

        // 3. Save to Cache
        fs.writeFileSync(cacheFile, JSON.stringify(analysisJson, null, 2));

        return res.json(analysisJson);

    } catch (error) {
        console.error("Analysis Error Details:", error);
        return res.status(500).json({
            error: "Analysis failed",
            message: error.message,
            details: error.toString()
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    // Keep process alive hack
    setInterval(() => { }, 10000);
});
