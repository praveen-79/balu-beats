export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const q = req.query.q || req.query.query || 'top hits';
  const limit = req.query.limit || '20';

  const directUrl =
    `https://www.jiosaavn.com/api.php?__call=search.getResults` +
    `&_format=json&_marker=0&api_version=4&ctx=web6dot0` +
    `&n=${encodeURIComponent(limit)}&p=1&q=${encodeURIComponent(q)}`;

  try {
    const response = await fetch(directUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-IN,en-US;q=0.9,en;q=0.8',
        'X-Forwarded-For': '103.160.27.65',
        'Cookie': 'geo=103.160.27.65%2CIN%2CTelangana%2CHyderabad%2C500061; L=english%2Ctelugu%2Chindi'
      }
    });

    if (response.ok) {
      const data = await response.json();
      if (data && Array.isArray(data.results) && data.results.length > 0) {
        return res.status(200).json(data);
      }
    }
  } catch (err) {
    // Fallback to mirror below
  }

  try {
    const mirrorUrl = `https://saavnx.vercel.app/api/search/songs?query=${encodeURIComponent(q)}&limit=${encodeURIComponent(limit)}`;
    const mirrorRes = await fetch(mirrorUrl);
    if (mirrorRes.ok) {
      const mirrorData = await mirrorRes.json();
      return res.status(200).json(mirrorData);
    }
  } catch (err2) {}

  return res.status(502).json({ error: 'Upstream music API unavailable' });
}
