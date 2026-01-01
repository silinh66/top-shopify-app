
const fs = require('fs');

const sixMonthsAgo = new Date();
sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
console.log(`Filtering for apps launched after: ${sixMonthsAgo.toDateString()}`);

if (!fs.existsSync('topAppsRecent.json')) {
    console.error('topAppsRecent.json not found!');
    process.exit(1);
}

const apps = JSON.parse(fs.readFileSync('topAppsRecent.json', 'utf8'));
const finalApps = [];

for (const app of apps) {
    if (!app.launchDate) continue;

    // Extract date string
    const match = app.launchDate.match(/[A-Z][a-z]+ \d{1,2}, \d{4}/);
    if (match) {
        const dateStr = match[0];
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
            if (date >= sixMonthsAgo) {
                finalApps.push({ ...app, cleanLaunchDate: dateStr });
            }
        }
    }
}

console.log(`Found ${finalApps.length} recent apps out of ${apps.length}.`);
fs.writeFileSync('final.json', JSON.stringify(finalApps, null, 2));
console.log('Saved final.json');
