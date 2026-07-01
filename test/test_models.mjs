async function run() {
  try {
    const start = Date.now();
    console.log('Fetching models from gen.pollinations.ai...');
    const res = await fetch('https://gen.pollinations.ai/v1/models');
    console.log(`Status: ${res.status} (${Date.now() - start}ms)`);
    if (res.ok) {
      const data = await res.json();
      console.log('Successfully fetched models! Total models:', data.length);
      console.log('Sample model:', data[0]);
    } else {
      console.log('Error status:', res.status, await res.text());
    }
  } catch (error) {
    console.error('Fetch failed with error:', error);
  }
}

run();
