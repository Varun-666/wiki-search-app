# WikiAtlas — Wikipedia Search API & Reader

A full-stack web application and custom REST API that lets users search Wikipedia and read full articles in a clean, distraction-free interface—without ever leaving the site.

🔗 **Live Website:** [https://your-app-name.onrender.com]([https://your-app-name.onrender.com](https://wiki-search-app.onrender.com/))  
*(Note: Hosted on Render's free tier, so the first load after inactivity may take ~30 seconds to wake up.)*

---

## Architecture

Instead of calling Wikipedia directly from the browser, the frontend communicates with a custom Node.js + Express backend API, which fetches, cleans, and structures data from the MediaWiki Action API:

```text
Browser (Frontend)  ──▶  Node.js / Express API  ──▶  Wikipedia Action API
                           (/api/search)
                           (/api/article)
