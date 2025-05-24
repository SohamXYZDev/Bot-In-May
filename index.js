// CHANGE THESE VARIABLES
const DELAY = 0 // im milliseconds, no quotes
const TOKEN=""; // put inside double quotes

import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    protocolTimeout: 0,
    timeout: 0,
    ...(process.platform === "linux" && {
      args: ["--no-sandbox"],
      executablePath: "/usr/bin/chromium-browser",
    }),
    devtools: false,
  });

  const page = await browser.newPage();

  await page.exposeFunction("logFromPage", (msg) => {
    console.log("[Browser Log]:", msg);
  });

  await page.setRequestInterception(true);
  page.on("request", (request) => {
    const url = request.url();
    if (url.startsWith("https://revolt.onech.at/cdn-cgi")) {
      request.abort();
    } else {
      request.continue();
    }
  });

  await page.goto("https://revolt.onech.at/", { waitUntil: "networkidle2" });

  await page.evaluate(
    async (token, delay) => {    
      const REVOLT_API_BASE_URL = "https://revolt-api.onech.at";

      window.logFromPage("[DEBUG] Token: " + token);
      window.logFromPage("Establishing socket!");

      const ws = new WebSocket(`wss://revolt-ws.onech.at?token=${token}`);

      return await new Promise((resolve) => {
        ws.addEventListener("message", (event) => {
          let data;
          try {
            data = JSON.parse(event.data);
          } catch {
            return;
          }
          const keyword = `if you'd like to close this`;


          if (
            data.type === "Message" &&
            data.content &&
            typeof data.content === "string" &&
            data.content.toLowerCase().includes(keyword)
          ) {
            const channelId = data.channel;
            fetch(`${REVOLT_API_BASE_URL}/channels/${channelId}`, {
              headers: { "X-Session-Token": token }
            })
          .then(res => res.json())
          .then(channelInfo => {

            const gra = () => {
              const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
              let result = "";
              for (let i = 0; i < 1; i++) {
                const randomIndex = Math.floor(Math.random() * characters.length);
                result += characters[randomIndex];
              }
              return result;
            };
            const gtn = () => {
              const match = channelInfo.name.match(/^ticket-(\d+)$/);
              return match ? match[1] : null;
            }
          
            // Define claim messages inside browser context
            const serverClaimMessages = {
              "01JDKH82R0RHG2VF9YDWKEFHC5": "/claim", 
              "01JDKH7HVTBZ2SDTYMTESVDEZA": "/claim", 
              "01JDKRRS1JA2N0114C24PJ1C09": "/claim",
              "01JDKJ2C7GRNTP9KCQZJWWQ6S0": "/claim",
              "01JDKZ9Y7AEPQQDA7BVQA10DZ7": () => gtn(),
              "01JDRTWWDQ7VM1ZEEKP58EBPQA": () => gtn(),
              "01JDKAFHS1W2BTPSS9YDB6WNEP": () => gra(),
              "01JDPY161J6H6B1KBV74QWKCDM": () => gra() 
            };



            const serverId = channelInfo.server;
            let claimMsg = serverClaimMessages[serverId];
            if (typeof claimMsg === "function") claimMsg = claimMsg(); // Generate new letter each time
            if (!claimMsg) return;
            const body = JSON.stringify({ content: claimMsg });
            window.logFromPage("[DEBUG] Body: " + body);
            const requestOptions = {
              method: "POST",
              headers: {
                "content-type": "application/json",
                "X-Session-Token": token,
              },
              body,
            };
            const start = performance.now();
            setTimeout(() => {
              fetch(`${REVOLT_API_BASE_URL}/channels/${channelId}/messages`, requestOptions).then(() => {
                const elapsed = performance.now() - start;
                window.logFromPage(`Sent /claim in ${elapsed.toFixed(2)} ms`);
              });
            }, delay);
          });
          }
        });

        ws.addEventListener("close", () => {
            resolve("Socket closed");
        });

        ws.addEventListener("error", () => {
            resolve("Error occurred");
        });
      });
    },
    TOKEN,
    DELAY
  );

  // await browser.close();
})();
