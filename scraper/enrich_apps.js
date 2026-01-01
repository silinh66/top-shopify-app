
const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    // 1. Load topApps.json
    if (!fs.existsSync('topApps.json')) {
        console.error('topApps.json not found. Run crawl_categories.js first.');
        process.exit(1);
    }
    const apps = JSON.parse(fs.readFileSync('topApps.json', 'utf8'));
    console.log(`Loaded ${apps.length} apps to enrich.`);

    // 2. Launch Browser
    const browser = await puppeteer.launch({ headless: 'new' });

    // 3. Concurrency Limit
    const CONCURRENCY = 5; // Moderate concurrency
    const augmentedApps = [];

    // Chunk array
    const chunk = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));
    const chunks = chunk(apps, CONCURRENCY);

    let processedCount = 0;

    for (const batch of chunks) {
        await Promise.all(batch.map(async (app) => {
            const page = await browser.newPage();
            // Block resources/images for speed
            await page.setRequestInterception(true);
            page.on('request', (req) => {
                if (['image', 'stylesheet', 'font', 'other'].includes(req.resourceType())) req.abort();
                else req.continue();
            });

            const MAX_RETRIES = 3;
            let retries = 0;
            let success = false;

            while (retries < MAX_RETRIES && !success) {
                try {
                    // Random delay before starting to avoid simultaneous hits
                    await new Promise(r => setTimeout(r, Math.random() * 3000));

                    // Capture status code
                    let statusCode = 200;
                    page.on('response', res => {
                        if (res.url() === app.url) statusCode = res.status();
                    });

                    // console.log(`Processing: ${app.name} (Attempt ${retries + 1})`);
                    await page.goto(app.url, { waitUntil: 'domcontentloaded', timeout: 60000 });

                    // Check for Rate Limit explicitly
                    const isRateLimited = await page.evaluate(() => document.body.innerText.includes('Too many requests') || document.title.includes('429'));

                    if (statusCode === 429 || isRateLimited) {
                        throw new Error('RATE_LIMITED');
                    }

                    const launchDate = await page.evaluate(() => {
                        const allElements = Array.from(document.body.querySelectorAll('*'));

                        // Strategy 1: Find 'Launched' text node and traverse grid
                        const label = allElements.find(e =>
                            e.childNodes.length === 1 &&
                            e.textContent && e.textContent.trim() === 'Launched'
                        );

                        if (label) {
                            // Case A: Next Sibling
                            let sibling = label.nextElementSibling;
                            if (sibling && sibling.textContent.match(/[A-Z][a-z]+ \d{1,2}, \d{4}/)) {
                                return sibling.textContent.trim();
                            }
                            // Case B: Grid sibling
                            if (label.parentElement) {
                                const siblings = Array.from(label.parentElement.children);
                                const index = siblings.indexOf(label);
                                for (let i = index + 1; i < siblings.length; i++) {
                                    const text = siblings[i].textContent.trim();
                                    if (text.match(/^[A-Z][a-z]+ \d{1,2}, \d{4}$/)) { // Strict start/end to avoid partials
                                        return text;
                                    }
                                }
                            }
                        }

                        // Strategy 2: Relaxed regex
                        const bodyText = document.body.innerText;
                        const match = bodyText.match(/Launched\s*\n?\s*([A-Z][a-z]+ \d{1,2}, \d{4})/);
                        if (match) return match[1];

                        return null;
                    });

                    if (launchDate) {
                        console.log(`  + [${app.name}] Launched: ${launchDate}`);
                        augmentedApps.push({ ...app, launchDate });
                        success = true;
                    } else {
                        // Double check if it's a 404 or some other error page masquerading as 200
                        const pageTitle = await page.title();
                        if (pageTitle.includes('404') || pageTitle.includes('Not Found')) {
                            console.log(`  - [${app.name}] App not found (404)`);
                            augmentedApps.push({ ...app, launchDate: null, error: '404' });
                            success = true;
                        } else {
                            // Genuine missing date? Or weird layout?
                            console.log(`  - [${app.name}] Launch date not found (Retrying if attempt < max)`);
                            throw new Error('DATE_NOT_FOUND');
                        }
                    }

                } catch (err) {
                    if (err.message === 'RATE_LIMITED' || err.message === 'DATE_NOT_FOUND' || err.message.includes('Timeout')) {
                        console.log(`    ! [${app.name}] Retry reason: ${err.message}. Waiting...`);
                        const waitTime = (retries + 1) * 10000 + Math.random() * 5000; // Backoff: 10s, 20s, 30s...
                        await new Promise(r => setTimeout(r, waitTime));
                        retries++;
                    } else {
                        console.error(`  x [${app.name}] Fatal Error: ${err.message}`);
                        augmentedApps.push({ ...app, launchDate: null, error: err.message });
                        success = true; // Stop retrying on fatal errors
                    }
                }
            }

            if (!success && retries >= MAX_RETRIES) {
                console.error(`  x [${app.name}] Failed after ${MAX_RETRIES} attempts.`);
                augmentedApps.push({ ...app, launchDate: null, error: 'Max Retries Exceeded' });
            }

            await page.close();
            processedCount++;
        }));
        // console.log(`Processed ${processedCount}/${apps.length} apps...`);
    }

    await browser.close();

    // 5. Save topAppsRecent.json (All processed)
    fs.writeFileSync('topAppsRecent.json', JSON.stringify(augmentedApps, null, 2));
    console.log('Saved topAppsRecent.json');

    // 6. Filter final.json (< 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const finalApps = augmentedApps.filter(app => {
        if (!app.launchDate) return false;
        const date = new Date(app.launchDate);
        return date >= sixMonthsAgo;
    });

    fs.writeFileSync('final.json', JSON.stringify(finalApps, null, 2));
    console.log(`Saved final.json (${finalApps.length} apps)`);

})();
