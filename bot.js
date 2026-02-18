const http = require('http');
const puppeteer = require('puppeteer');

// 1. THE "KEEP ALIVE" WEB SERVER
http.createServer((req, res) => {
  res.write('Bot is running 24/7');
  res.end();
}).listen(process.env.PORT || 8080);

// 2. THE BOT LOGIC
async function runBot() {
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.goto('https://vectaria.io/');

    await page.evaluate(() => {
        // [PASTE YOUR FULL RED LIGHT GREEN LIGHT SCRIPT HERE]
        // Make sure the OWNER_NAME is your name!
    });
    console.log("Vectaria Bot is live on Render!");
}

runBot();