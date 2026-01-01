import express from 'express';
const app = express();
app.listen(3000, () => console.log('Minimal server running on 3000'));
console.log('Setup complete');
setInterval(() => { console.log('Heartbeat'); }, 5000);
