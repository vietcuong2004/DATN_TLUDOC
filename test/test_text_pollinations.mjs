import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  try {
    const start = Date.now();
    const key = process.env.POLLINATIONS_API_KEY;
    console.log('Fetching chat completion from text.pollinations.ai (using key length:', key ? key.length : 0, ')...');
    
    const headers = { 'Content-Type': 'application/json' };
    if (key) {
      headers['Authorization'] = `Bearer ${key}`;
    }
    
    const res = await fetch('https://text.pollinations.ai/v1/chat/completions', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: 'openai',
        messages: [{ role: 'user', content: 'Say hello in 3 words' }],
        stream: true
      })
    });
    
    console.log(`Status: ${res.status} (${Date.now() - start}ms)`);
    if (res.ok) {
      console.log('Successfully opened stream!');
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
      console.log('Stream finished. Response:', text);
    } else {
      console.log('Error status:', res.status, await res.text());
    }
  } catch (error) {
    console.error('Fetch failed with error:', error);
  }
}

run();
