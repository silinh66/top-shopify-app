
const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    console.log('Starting scraper...');
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    // Set a large viewport to minimize scrolling issues
    await page.setViewport({ width: 1280, height: 1024 });

    console.log('Navigating to categories page...');
    await page.goto('https://sasi.heymantle.com/categories', { waitUntil: 'networkidle0' });

    // Step 1: Extract all category links
    console.log('Extracting category links...');
    try {
        await page.waitForSelector('a', { timeout: 10000 });
    } catch (e) {
        console.log('Timeout waiting for links');
    }

    const categories = await page.evaluate(() => {
        // Get all links
        const allLinks = Array.from(document.querySelectorAll('a'));
        // Filter for those containing /category/
        // Exclude those that are just paginations or random
        return allLinks
            .filter(a => a.href.includes('/category/'))
            .map(link => ({
                name: link.innerText.trim(),
                url: link.href
            }))
            .filter((v, i, a) => a.findIndex(t => t.url === v.url) === i) // Deduplicate
            .filter(c => c.name && c.url);
    });

    console.log(`Found ${categories.length} categories.`);
    if (categories.length === 0) {
        // Debug: print some links
        const exampleLinks = await page.evaluate(() => Array.from(document.querySelectorAll('a')).slice(0, 5).map(a => a.href));
        console.log('DEBUG: First 5 links on page:', exampleLinks);
    }

    console.log(`Found ${categories.length} categories.`);

    let allApps = [];
    const uniqueAppUrls = new Set();

    // Step 2: Iterate through each category
    for (const category of categories) {
        console.log(`Processing category: ${category.name} (${category.url})`);

        // Handling Pagination for each category
        let currentPage = 1;
        let hasNextPage = true;

        while (hasNextPage) {
            const pageUrl = currentPage === 1 ? category.url : `${category.url}?page=${currentPage}`;
            console.log(`  - Scraping page ${currentPage}...`);

            try {
                await page.goto(pageUrl, { waitUntil: 'domcontentloaded' }); // Use domcontentloaded for speed, then wait for selector

                // Wait for the list to load. 
                // Based on exploration, apps are likely in a table or list. 
                // We'll look for common app card elements.
                // If the list is empty, we stop.

                // A reliable wait anchor: wait for the footer or a specific known element, 
                // OR just wait a fixed time if the site is simple.
                // Let's try to wait for the app row selector.
                try {
                    await page.waitForSelector('div.grid, table tbody tr', { timeout: 5000 });
                } catch (e) {
                    console.log('    No content found or timeout. Ending category.');
                    hasNextPage = false;
                    break;
                }

                // Scrape apps on this page
                const appsOnPage = await page.evaluate(() => {
                    const params = new URLSearchParams(window.location.search);
                    // Check if we are really on the page we asked for (some sites redirect to p1 if pN is empty)
                    // But standard pagination usually just shows empty or 404.

                    // We need a specific selector for the app row. 
                    // From exploration, rows seemed to have details.
                    // Let's try to grab generic "card" like structures. 
                    // The screenshot showed a table-like structure with "App", "Rating", "Reviews".
                    // The rows likely have `a` tags to `apps.shopify.com`.

                    const rows = Array.from(document.querySelectorAll('div, tr')).filter(el => {
                        // Heuristic: has a link to apps.shopify.com
                        return el.querySelector('a[href*="apps.shopify.com"]');
                    });

                    // Remove duplicates (sometimes container + inner match)
                    // We'll map from the specific link to the closest main container if needed, 
                    // or just grabbing the link properties directly might be enough.

                    const appLinks = Array.from(document.querySelectorAll('a[href*="apps.shopify.com"]'));

                    return appLinks.map(link => {
                        // Traverse up to find the row container for context (reviews/ratings) is tricky without exact DOM.
                        // However, often the text nearby is the review count.
                        // Let's try to get the parent row text.

                        // Heuristic: Get the closest row-like parent
                        const row = link.closest('tr') || link.closest('.grid > div') || link.parentElement.parentElement;
                        const rowText = row ? row.innerText : '';

                        // Extract Review Count: Look for number followed by "reviews" or just a number at the end
                        // Extract Rating: Look for "★ 4.9" or similar.

                        // Let's refine based on the screenshot in exploration logs:
                        // It looked like a list: # | App | Rating | Reviews
                        // If it's a table rows are simpler.

                        let rating = 0;
                        let reviews = 0;

                        // Try to parse text content for rating/reviews
                        // Example text: "SuperApp 4.9 (123 reviews)"
                        // or columns. 

                        // Parse Reviews
                        // Look for digits at the end of the string or specifically in a 'Reviews' column
                        // Simple regex for large numbers?
                        // Let's assume the screenshot standard: a row with distinct cells.
                        // If `closest('tr')` works, we can index cells.

                        if (link.closest('tr')) {
                            const tds = Array.from(link.closest('tr').querySelectorAll('td'));
                            // Usually: Rank | App | ... | Rating | Reviews
                            // Let's try to grab the last two columns.
                            if (tds.length >= 3) {
                                const last = tds[tds.length - 1]?.innerText || '0';
                                const secondLast = tds[tds.length - 2]?.innerText || '0';

                                reviews = parseInt(last.replace(/,/g, ''), 10) || 0;
                                rating = parseFloat(secondLast) || 0;
                            }
                        } else {
                            // Fallback if not a table
                            const text = rowText.replace(/\n/g, ' ');
                            // Try to find star rating
                            const starMatch = text.match(/(\d(\.\d)?)\s*★/); // 4.9 ★ or ★ 4.9
                            if (starMatch) rating = parseFloat(starMatch[1]);

                            // Try to find reviews (often last number)
                            const numbers = text.match(/\d+/g);
                            if (numbers && numbers.length > 0) {
                                // Assume the largest integer that isn't the rating is the review count?
                                // Or the last integer?
                                reviews = parseInt(numbers[numbers.length - 1], 10);
                            }
                        }

                        return {
                            name: link.innerText.trim() || 'Unknown App',
                            url: link.href,
                            rating: rating,
                            reviews: reviews
                        };
                    });
                });

                if (appsOnPage.length === 0) {
                    console.log('    No apps found on this page. Stopping category.');
                    hasNextPage = false;
                } else {
                    let uniqueCount = 0;
                    for (const app of appsOnPage) {
                        // Normalize URL to handle tracking params
                        const cleanUrl = app.url.split('?')[0];
                        if (!uniqueAppUrls.has(cleanUrl)) {
                            uniqueAppUrls.add(cleanUrl);
                            allApps.push({ ...app, url: cleanUrl, category: category.name });
                            uniqueCount++;
                        }
                    }
                    console.log(`    Found ${appsOnPage.length} apps (${uniqueCount} new).`);

                    // Logic to Stop: if the page didn't have a "next" page equivalent.
                    // We can check if the URL redirected or if we hit an empty state from previous checks.
                    // But also, let's look for a "next" button disabled state.
                    const isNextEnabled = await page.evaluate(() => {
                        // Check for pagination buttons
                        // Heuristic: find a link with current page + 1
                        const params = new URLSearchParams(window.location.search);
                        const p = parseInt(params.get('page') || '1', 10);
                        const nextP = p + 1;
                        // Check if any link goes to page=nextP
                        return !!document.querySelector(`a[href*="page=${nextP}"]`);
                    });

                    if (!isNextEnabled) {
                        console.log('    No next page link found.');
                        hasNextPage = false;
                    } else {
                        currentPage++;
                    }
                }

            } catch (err) {
                console.error(`    Error scraping page ${currentPage}:`, err.message);
                hasNextPage = false;
            }

            // Safety break for testing/timeout prevention
            if (currentPage > 50) { // Limit depth per category to avoid infinite loops
                console.log('Reached page limit (50). Moving direct next.');
                hasNextPage = false;
            }
        }
    }

    console.log(`Total unique apps found: ${allApps.length}`);

    // Save allApp.json
    fs.writeFileSync('allApp.json', JSON.stringify(allApps, null, 2));
    console.log('Saved allApp.json');

    // Filter Top Apps (> 20 reviews) and save topApps.json
    const topApps = allApps.filter(app => app.reviews > 20);
    fs.writeFileSync('topApps.json', JSON.stringify(topApps, null, 2));
    console.log(`Saved topApps.json (${topApps.length} apps)`);

    await browser.close();
})();
