// Simple redirect tracer using Node.js built-in fetch
const startUrl = "https://memoway-production.up.railway.app/api/kakao/login?lang=ko&platform=web";

async function traceRedirect(url, maxSteps = 10) {
  console.log('='.repeat(80));
  console.log('🔍 Kakao Login Redirect Chain Tracer');
  console.log('='.repeat(80));
  console.log(`Start URL: ${url}`);
  console.log(`Max steps: ${maxSteps}`);
  console.log('='.repeat(80));
  console.log('');

  const visited = new Set();
  let currentUrl = url;
  const steps = [];

  for (let step = 0; step < maxSteps; step++) {
    if (visited.has(currentUrl)) {
      console.log(`\n❌ INFINITE LOOP DETECTED!`);
      console.log(`URL "${currentUrl}" was already visited!`);
      const firstVisit = steps.findIndex(s => s.url === currentUrl);
      console.log(`First visited at step ${firstVisit}, now at step ${step}`);
      break;
    }
    visited.add(currentUrl);

    try {
      console.log(`[Step ${step}] Fetching: ${currentUrl}`);
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      let response;
      try {
        response = await fetch(currentUrl, {
          method: 'GET',
          redirect: 'manual',
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
        });
        clearTimeout(timeout);
      } catch (fetchError) {
        clearTimeout(timeout);
        if (fetchError.name === 'AbortError') {
          console.error(`  ❌ Request timeout after 15 seconds`);
        } else {
          console.error(`  ❌ Fetch error: ${fetchError.message}`);
        }
        break;
      }

      const status = response.status;
      const location = response.headers.get('location') || response.headers.get('Location');
      
      console.log(`  → Status: ${status}`);
      console.log(`  → Location: ${location || '(none)'}`);

      steps.push({ step, url: currentUrl, status, location });

      // Check for redirect back to our server
      if (location) {
        try {
          const locationUrl = new URL(location, currentUrl);
          if (locationUrl.hostname.includes('railway.app')) {
            console.log(`  ⚠️  WARNING: Redirecting back to Railway server!`);
            if (locationUrl.pathname === '/api/kakao/login' || locationUrl.pathname.startsWith('/api/kakao/login')) {
              console.log(`  ❌ CRITICAL: Redirecting to /api/kakao/login - INFINITE LOOP!`);
            }
          }
        } catch (e) {
          // Invalid URL
        }
      }

      console.log('');

      // Stop if not a redirect
      if (status < 300 || status >= 400) {
        console.log(`✅ Final response: Status ${status}`);
        break;
      }

      // Follow redirect
      if (location) {
        try {
          currentUrl = new URL(location, currentUrl).href;
        } catch (e) {
          console.error(`  ❌ Invalid redirect URL: ${location}`);
          break;
        }
      } else {
        break;
      }
    } catch (error) {
      console.error(`  ❌ Error: ${error.message}`);
      break;
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('📊 Summary');
  console.log('='.repeat(80));
  steps.forEach((s, i) => {
    console.log(`${i}. [${s.status}] ${s.url}`);
    if (s.location) console.log(`   → ${s.location}`);
  });
}

traceRedirect(startUrl).catch(console.error);
