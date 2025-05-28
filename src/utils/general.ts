import { addNewStreamClient as AddCRUDclient, removeStreamClient as removeCRUDclient } from "./sse/executionCRUD";
import { Response } from 'express';
import { addNewStreamClient as AddStatusClient, removeStreamClient as removeStatusClient } from "./sse/executionStatus";


export function addNewStreamListener(res: Response, eventType: 'crud' | 'status') {
  switch (eventType) {
    case 'crud':
      AddCRUDclient(res);
      break;
    case 'status':
      AddStatusClient(res);
      break;
  }
}
export function removeStreamListener(res: Response, eventType: 'crud' | 'status') {
  switch (eventType) {
    case 'crud':
      removeCRUDclient(res);
      break;
    case 'status':
      removeStatusClient(res);
      break;
  }
}

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
    console.log('🔱', JSON.stringify(response, null, 2))
    if (!response.ok) {
      const errorBody = await response.text(); // or try response.json() if you expect JSON
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
