"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRun = void 0;
exports.addNewStreamListener = addNewStreamListener;
exports.removeStreamListener = removeStreamListener;
const executionCRUD_1 = require("./sse/executionCRUD");
const executionStatus_1 = require("./sse/executionStatus");
function addNewStreamListener(res, eventType) {
    switch (eventType) {
        case 'crud':
            (0, executionCRUD_1.addNewStreamClient)(res);
            break;
        case 'status':
            (0, executionStatus_1.addNewStreamClient)(res);
            break;
    }
}
function removeStreamListener(res, eventType) {
    switch (eventType) {
        case 'crud':
            (0, executionCRUD_1.removeStreamClient)(res);
            break;
        case 'status':
            (0, executionStatus_1.removeStreamClient)(res);
            break;
    }
}
const createRun = async (name, TOKEN, env) => {
    const baseUrl = env === 'app' ? `https://api.blinq.io/api/runs/cucumber-runs/create` : `https://${env}.api.blinq.io/api/runs/cucumber-runs/create`;
    try {
        const response = await fetch(baseUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${TOKEN}`,
                'x-source': 'cucumber_js',
            },
            body: JSON.stringify({ name }),
        });
        console.log('🔱', JSON.stringify(response, null, 2));
        if (!response.ok) {
            const errorBody = await response.text(); // or try response.json() if you expect JSON
            console.error(`❌ HTTP error! status: ${response.status}`);
            console.error(`❌ Response body:`, errorBody);
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data.run._id;
    }
    catch (error) {
        console.error('❌ Error creating run:', error);
        console.error('❌ values used', { name, TOKEN });
        return false;
    }
};
exports.createRun = createRun;
