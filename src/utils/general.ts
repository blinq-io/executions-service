export const createRun = async (name: string, TOKEN: string, env: string) => {
  const baseUrl = env === 'app' ? `https://api.blinq.io/api/runs/cucumber-runs/create` : `https://${env}.api.blinq.io/api/runs/cucumber-runs/create`;
  try {
    const response = await fetch(
      baseUrl,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${TOKEN}`,
          'x-source': 'cucumber_js',
        },
        body: JSON.stringify({ name }),
      }
    );
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`❌ HTTP error! status: ${response.status}`);
      console.error(`❌ Response body:`, errorBody);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.run._id;
  } catch (error) {
    console.error('❌ Error creating run:', error);
    console.error('❌ values used', { name, TOKEN });
    return false;
  }
};
