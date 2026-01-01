
const fs = require('fs');

const apps = JSON.parse(fs.readFileSync('topAppsRecent.json', 'utf8'));
const years = {};
let notFound = 0;

apps.forEach(app => {
    if (!app.launchDate) {
        notFound++;
        return;
    }
    const match = app.launchDate.match(/\d{4}/);
    if (match) {
        const year = match[0];
        years[year] = (years[year] || 0) + 1;
    }
});

console.log('Total Apps:', apps.length);
console.log('Launch Date Not Found:', notFound);
console.log('Distribution by Year:');
console.table(years);
