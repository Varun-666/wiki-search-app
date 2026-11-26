const express = require('express');
const path = require('path');

const app = express();
// Use the hosting platform's PORT when live, or 3000 locally
const PORT = process.env.PORT || 3000;

// 1. Serve the frontend files from the "public" folder
app.use(express.static(path.join(__dirname, 'public')));

// 2. Create your custom API endpoint: GET /api/search?q=your_query
app.get('/api/search', async (req, res) => {
  const query = req.query.q;

  // Validate input: return 400 Bad Request if search query is missing
  if (!query || query.trim() === '') {
    return res.status(400).json({ error: 'Please provide a search query (?q=...)' });
  }

  try {
    // Build the Wikipedia API URL safely
    const wikiUrl = new URL('https://en.wikipedia.org/w/api.php');
    wikiUrl.searchParams.set('action', 'query');
    wikiUrl.searchParams.set('generator', 'search');
    wikiUrl.searchParams.set('gsrsearch', query);
    wikiUrl.searchParams.set('gsrlimit', '10'); // Max 10 results
    wikiUrl.searchParams.set('prop', 'extracts|pageimages|info');
    wikiUrl.searchParams.set('inprop', 'url');
    wikiUrl.searchParams.set('exintro', '1');
    wikiUrl.searchParams.set('explaintext', '1');
    wikiUrl.searchParams.set('exsentences', '2');
    wikiUrl.searchParams.set('pithumbsize', '200');
    wikiUrl.searchParams.set('format', 'json');

    // Fetch data from Wikipedia (Wikimedia asks for a descriptive User-Agent header)
    const response = await fetch(wikiUrl.toString(), {
      headers: {
        'User-Agent': 'MyWikiSearchLearningApp/1.0 (https://github.com/yourusername)'
      }
    });

    if (!response.ok) {
      throw new Error(`Wikipedia API responded with status ${response.status}`);
    }

    const data = await response.json();

    // If no results were found, Wikipedia omits data.query
    if (!data.query || !data.query.pages) {
      return res.json({ query, count: 0, results: [] });
    }

    // Transform Wikipedia's object into a clean, sorted array
    const cleanResults = Object.values(data.query.pages)
      .sort((a, b) => a.index - b.index)
      .map((page) => ({
        id: page.pageid,
        title: page.title,
        summary: page.extract || 'No summary available.',
        thumbnail: page.thumbnail ? page.thumbnail.source : null,
        url: page.fullurl
      }));

    // Send the clean JSON back to whoever called your API
    res.json({
      query,
      count: cleanResults.length,
      results: cleanResults
    });

  } catch (error) {
    console.error('Error fetching from Wikipedia:', error);
    res.status(500).json({ error: 'Failed to fetch data from Wikipedia.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});

// 3. New endpoint: GET /api/article?id=11867 (fetches full article content)
app.get('/api/article', async (req, res) => {
  const pageId = req.query.id;

  if (!pageId) {
    return res.status(400).json({ error: 'Please provide an article id (?id=...)' });
  }

  try {
    const wikiUrl = new URL('https://en.wikipedia.org/w/api.php');
    wikiUrl.searchParams.set('action', 'query');
    wikiUrl.searchParams.set('pageids', pageId);
    // Notice: we removed exintro & explaintext so we get the FULL article in clean HTML
    wikiUrl.searchParams.set('prop', 'extracts|pageimages|categories');
    wikiUrl.searchParams.set('piprop', 'thumbnail');
    wikiUrl.searchParams.set('pithumbsize', '600');
    wikiUrl.searchParams.set('clshow', '!hidden'); // Only visible categories
    wikiUrl.searchParams.set('cllimit', '10');
    wikiUrl.searchParams.set('format', 'json');

    const response = await fetch(wikiUrl.toString(), {
      headers: {
        'User-Agent': 'MyWikiSearchLearningApp/1.0 (https://github.com/yourusername)'
      }
    });

    if (!response.ok) {
      throw new Error(`Wikipedia API responded with status ${response.status}`);
    }

    const data = await response.json();
    const page = data.query?.pages?.[pageId];

    if (!page || page.missing !== undefined) {
      return res.status(404).json({ error: 'Article not found.' });
    }

    // Clean up category names (remove the "Category:" prefix)
    const categories = (page.categories || []).map((cat) =>
      cat.title.replace(/^Category:/, '')
    );

    res.json({
      id: page.pageid,
      title: page.title,
      image: page.thumbnail ? page.thumbnail.source : null,
      contentHtml: page.extract || '<p>No content available.</p>',
      categories
    });
  } catch (error) {
    console.error('Error fetching article:', error);
    res.status(500).json({ error: 'Failed to load full article.' });
  }
});