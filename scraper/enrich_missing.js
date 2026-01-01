
const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    // 1. Load existing data
    if (!fs.existsSync('topAppsRecent.json')) {
        console.error('topAppsRecent.json not found!');
        process.exit(1);
    }
    const allApps = JSON.parse(fs.readFileSync('topAppsRecent.json', 'utf8'));

    // 2. Identify missing
    const missingApps = allApps.filter(app => !app.launchDate);
    console.log(`Total apps: ${allApps.length}`);
    console.log(`Missing launch date: ${missingApps.length}`);

    if (missingApps.length === 0) {
        console.log('No missing apps to retry.');
        process.exit(0);
    }

    // 3. Launch Browser
    const browser = await puppeteer.launch({ headless: 'new' });

    // 4. Concurrency (Keep low to clear persistent rate limits)
    const CONCURRENCY = 2;

    // Chunk array
    const chunk = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));
    const chunks = chunk(missingApps, CONCURRENCY);

    let processedCount = 0;

    for (const batch of chunks) {
        await Promise.all(batch.map(async (app) => {
            const page = await browser.newPage();
            await page.setRequestInterception(true);
            page.on('request', (req) => {
                if (['image', 'stylesheet', 'font', 'other'].includes(req.resourceType())) req.abort();
                else req.continue();
            });

            const MAX_RETRIES = 5; // Increased retries for these stubborn ones
            let retries = 0;
            let success = false;
            let newDate = null;

            while (retries < MAX_RETRIES && !success) {
                try {
                    // Longer random delay
                    await new Promise(r => setTimeout(r, 2000 + Math.random() * 5000));

                    let statusCode = 200;
                    page.on('response', res => {
                        if (res.url() === app.url) statusCode = res.status();
                    });

                    await page.goto(app.url, { waitUntil: 'domcontentloaded', timeout: 60000 });

                    const isRateLimited = await page.evaluate(() => document.body.innerText.includes('Too many requests') || document.title.includes('429'));
                    if (statusCode === 429 || isRateLimited) throw new Error('RATE_LIMITED');

                    const launchDate = await page.evaluate(() => {
                        const allElements = Array.from(document.body.querySelectorAll('*'));
                        const label = allElements.find(e =>
                            e.childNodes.length === 1 &&
                            e.textContent && e.textContent.trim() === 'Launched'
                        );

                        // Strategy 1: Label traversal
                        if (label) {
                            let sibling = label.nextElementSibling;
                            if (sibling && sibling.textContent.match(/[A-Z][a-z]+ \d{1,2}, \d{4}/)) return sibling.textContent.trim();
                            if (label.parentElement) {
                                const siblings = Array.from(label.parentElement.children);
                                const index = siblings.indexOf(label);
                                for (let i = index + 1; i < siblings.length; i++) {
                                    const text = siblings[i].textContent.trim();
                                    if (text.match(/^[A-Z][a-z]+ \d{1,2}, \d{4}$/)) return text;
                                }
                            }
                        }

                        // Strategy 2: Loose Regex
                        const bodyText = document.body.innerText;
                        const match = bodyText.match(/Launched\s*\n?\s*([A-Z][a-z]+ \d{1,2}, \d{4})/);
                        if (match) return match[1];

                        return null;
                    });

                    if (launchDate) {
                        console.log(`  + [${app.name}] Recovered: ${launchDate}`);
                        newDate = launchDate;
                        success = true;
                    } else {
                        // Check 404
                        const title = await page.title();
                        if (title.includes('404') || title.includes('Not Found')) {
                            console.log(`  - [${app.name}] 404 Not Found`);
                            // Mark as '404' so we don't retry locally, but save as null or special val? 
                            // Keeping null but noting error is '404'
                            app.error = '404 Not Found';
                            success = true; // Stop retrying
                        } else {
                            throw new Error('DATE_NOT_FOUND');
                        }
                    }

                } catch (err) {
                    console.log(`    ! [${app.name}] Retry ${retries + 1}/${MAX_RETRIES}: ${err.message}`);
                    if (err.message === 'RATE_LIMITED' || err.message === 'DATE_NOT_FOUND') {
                        await new Promise(r => setTimeout(r, (retries + 1) * 5000));
                    }
                    retries++;
                    app.error = err.message;
                }
            }

            if (newDate) {
                app.launchDate = newDate;
                delete app.error;
            }

            await page.close();
            processedCount++;
        }));

        // Save progress periodically (overwrite file)
        fs.writeFileSync('topAppsRecent.json', JSON.stringify(allApps, null, 2));
        console.log(`Processed batch. Progress: ${missingApps.length - processedCount} remaining.`);
    }

    await browser.close();
    console.log('Recovery complete.');
})();
