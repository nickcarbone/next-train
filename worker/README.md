# Next Train Worker (Cloudflare)

A small Cloudflare Worker that fetches data the page can't fetch itself. For now that's CTA Train Tracker (Chicago), which needs a private key and doesn't allow requests from web pages. It runs on Cloudflare's free plan.

## Set it up (about 10 minutes, all in the browser)

1. Sign in at [dash.cloudflare.com](https://dash.cloudflare.com) (a free account is fine).
2. Open **Compute → Workers & Pages**, choose **Create**, then **Start with Hello World**.
3. Name it `next-train` and choose **Deploy**.
4. Choose **Edit code**, delete everything in `worker.js`, paste in the contents of this folder's `worker.js`, and choose **Deploy**.
5. Go back to the Worker, open **Settings → Variables and Secrets**, choose **Add**, pick type **Secret**, name it `CTA_KEY`, paste your CTA key as the value, and choose **Deploy**.
6. Copy the Worker's address from its overview page. It looks like `https://next-train.<your-subdomain>.workers.dev`.
7. Check it: open `https://next-train.<your-subdomain>.workers.dev/cta/arrivals?mapid=40380`. You should see JSON with an `eta` list of trains at Clark/Lake.

Then either tell Claude the address so it goes into `data/systems.js`, or paste it into **Settings → Worker address** on the Next Train page. The settings box only affects that one browser.

The key stays in Cloudflare and never appears in this public repository. Answers are cached for 20 seconds, so even several open screens stay far inside CTA's daily request limit.
