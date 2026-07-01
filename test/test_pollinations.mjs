import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testCase(name, authHeader, model, stream = false) {
  console.log(`\nTesting Case: ${name} (model: ${model}, stream: ${stream})`);
  const headers = { 'Content-Type': 'application/json' };
  if (authHeader) {
    headers['Authorization'] = authHeader;
  }
  
  const body = {
    model: model,
    messages: [{ role: 'user', content: 'Say hello in 3 words' }],
    temperature: 0.2,
    stream: stream
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    const start = Date.now();
    const res = await fetch('https://gen.pollinations.ai/v1/chat/completions', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    console.log(`Status: ${res.status} (${Date.now() - start}ms)`);
    if (!res.ok) {
      console.log('Error response:', await res.text());
      return;
    }

    if (stream) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let text = '';
      while (!done) {
        const { value, done: isDone } = await reader.read();
        done = isDone;
        if (value) {
          text += decoder.decode(value);
        }
      }
      console.log('Stream finished. Length:', text.length);
      console.log('Sample content:', text.slice(0, 150));
    } else {
      const json = await res.json();
      console.log('Response content:', json.choices?.[0]?.message?.content);
    }
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('❌ Failed:', error.name === 'AbortError' ? 'TIMEOUT (10s)' : error.message);
  }
}

async function run() {
  const key = process.env.POLLINATIONS_API_KEY;
  console.log('Loaded POLLINATIONS_API_KEY length:', key ? key.length : 0);
  
  // Case A: With local key, model openai, no stream
  await testCase('With local key, model openai, no stream', `Bearer ${key}`, 'openai', false);
  
  // Case B: Without key, model openai, no stream
  await testCase('Without key, model openai, no stream', null, 'openai', false);

  // Case C: Without key, model openai, with stream
  await testCase('Without key, model openai, with stream', null, 'openai', true);

  // Case D: With local key, model openai, with stream
  await testCase('With local key, model openai, with stream', `Bearer ${key}`, 'openai', true);
}

run();
