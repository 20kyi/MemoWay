// Using Node.js built-in fetch (Node 18+)
// If you're using Node < 18, install node-fetch: npm install node-fetch@2

interface RedirectStep {
  step: number;
  url: string;
  status: number;
  location?: string;
  headers: Record<string, string>;
}

async function traceRedirect(startUrl: string, maxSteps: number = 10): Promise<void> {
  console.log('='.repeat(80));
  console.log('🔍 Kakao Login Redirect Chain Tracer');
  console.log('='.repeat(80));
  console.log(`Start URL: ${startUrl}`);
  console.log(`Max steps: ${maxSteps}`);
  console.log('='.repeat(80));
  console.log('');

  const visited = new Set<string>();
  let currentUrl = startUrl;
  const steps: RedirectStep[] = [];

  for (let step = 0; step < maxSteps; step++) {
    // Check for loops
    if (visited.has(currentUrl)) {
      console.log(`\n❌ INFINITE LOOP DETECTED!`);
      console.log(`URL "${currentUrl}" was already visited at step ${steps.findIndex(s => s.url === currentUrl)}`);
      break;
    }
    visited.add(currentUrl);

    try {
      console.log(`[Step ${step}] Fetching: ${currentUrl}`);
      
      // Use fetch with manual redirect handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      let response: Response;
      try {
        response = await fetch(currentUrl, {
          method: 'GET',
          redirect: 'manual', // Don't follow redirects automatically
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
        });
        clearTimeout(timeoutId);
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          console.error(`  ❌ Request timeout after 10 seconds`);
        } else {
          console.error(`  ❌ Fetch error: ${fetchError.message}`);
        }
        break;
      }

      const status = response.status;
      const location = response.headers.get('location') || response.headers.get('Location') || undefined;
      const headers: Record<string, string> = {};
      
      response.headers.forEach((value, key) => {
        headers[key.toLowerCase()] = value;
      });

      const stepInfo: RedirectStep = {
        step,
        url: currentUrl,
        status,
        location,
        headers,
      };

      steps.push(stepInfo);

      console.log(`  Status: ${status}`);
      console.log(`  Location: ${location || '(none)'}`);
      
      // Check if it's redirecting back to our server
      if (location) {
        try {
          const locationUrl = new URL(location, currentUrl);
          if (locationUrl.hostname.includes('memoway-production.up.railway.app') || 
              locationUrl.hostname.includes('railway.app')) {
            console.log(`  ⚠️  WARNING: Redirecting back to our server!`);
            if (locationUrl.pathname === '/api/kakao/login' || locationUrl.pathname.startsWith('/api/kakao/login')) {
              console.log(`  ❌ CRITICAL: Redirecting to /api/kakao/login - INFINITE LOOP!`);
            }
          }
        } catch (e) {
          // Invalid URL, ignore
        }
      }

      console.log('');

      // If not a redirect, stop
      if (status < 300 || status >= 400) {
        console.log(`✅ Final response (not a redirect): Status ${status}`);
        if (status === 200) {
          const contentType = headers['content-type'] || '';
          if (contentType.includes('text/html')) {
            console.log(`  Response is HTML (likely final page)`);
          } else if (contentType.includes('application/json')) {
            console.log(`  Response is JSON`);
          }
        }
        break;
      }

      // Follow redirect
      if (location) {
        try {
          // Handle relative URLs
          const nextUrl = new URL(location, currentUrl).href;
          currentUrl = nextUrl;
          console.log(`  → Following redirect to: ${currentUrl}`);
          console.log('');
        } catch (e) {
          console.error(`  ❌ Invalid redirect URL: ${location}`);
          break;
        }
      } else {
        console.log(`  ❌ Redirect status ${status} but no Location header`);
        break;
      }
    } catch (error: any) {
      console.error(`  ❌ Error fetching ${currentUrl}:`, error.message);
      break;
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('📊 Redirect Chain Summary');
  console.log('='.repeat(80));
  steps.forEach((step, index) => {
    console.log(`${index}. [${step.status}] ${step.url}`);
    if (step.location) {
      console.log(`   → ${step.location}`);
    }
  });
  console.log('='.repeat(80));

  // Check for loops
  const serverUrls = steps.filter(s => 
    s.url.includes('memoway-production.up.railway.app') || 
    s.url.includes('railway.app')
  );
  
  if (serverUrls.length > 2) {
    console.log('\n⚠️  WARNING: Multiple redirects to our server detected!');
    console.log('This might indicate an infinite loop.');
    serverUrls.forEach((step, index) => {
      console.log(`  ${index + 1}. Step ${step.step}: ${step.url}`);
    });
  }
}

// Main execution
const startUrl = "https://memoway-production.up.railway.app/api/kakao/login?lang=ko&platform=web";

traceRedirect(startUrl, 10)
  .then(() => {
    console.log('\n✅ Redirect tracing completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error during redirect tracing:', error);
    process.exit(1);
  });
