#!/usr/bin/env node
/**
 * Test script to reproduce newline handling issue #4
 * This script creates a task with multiline description to test the issue
 */

import { TaskFlowServer } from './dist/index.js';

async function testNewlineHandling() {
  console.log('🧪 Testing newline handling issue #4...');
  
  // Create a test description with newlines like what @drmikecrowe reported
  const testDescription = `Follow the instructions in memory-bank/prompts/design-review/request-2-instructions.md

Files to analyze:
- src/components/ (entire directory)
- src/pages/ (all pages)
- src/utils/ (utility functions)`;
  
  console.log('\n📝 Original description:');
  console.log(testDescription);
  
  // Create a test task plan
  const testPlan = {
    originalRequest: 'Test newline handling in descriptions',
    tasks: [{
      title: 'Test task with multiline description',
      description: testDescription
    }]
  };
  
  try {
    const taskFlowServer = new TaskFlowServer();
    const result = await taskFlowServer.planTask(testPlan);
    
    console.log('\n✅ Task created successfully!');
    console.log('Request ID:', result.requestId);
    
    // Now read the raw JSON to see how it's stored
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const os = await import('node:os');
    
    const TASK_FILE_PATH = process.env.TASK_MANAGER_FILE_PATH || 
                          path.join(os.homedir(), 'Documents', 'tasks.json');
    
    const rawData = await fs.readFile(TASK_FILE_PATH, 'utf-8');
    const parsedData = JSON.parse(rawData);
    
    // Find our test task
    const testRequest = parsedData.requests.find(r => 
      r.originalRequest === 'Test newline handling in descriptions'
    );
    
    if (testRequest && testRequest.tasks.length > 0) {
      const storedDescription = testRequest.tasks[0].description;
      
      console.log('\n🔍 Description as stored in JSON:');
      console.log('Raw JSON string:', JSON.stringify(storedDescription));
      console.log('\n📄 Parsed description:');
      console.log(storedDescription);
      
      // Check if the issue exists
      const hasNewlineIssue = storedDescription.includes('nn') || 
                             storedDescription.includes('n-') ||
                             !storedDescription.includes('\n');
      
      if (hasNewlineIssue) {
        console.log('\n❌ ISSUE REPRODUCED: Newlines are corrupted!');
        console.log('Expected newlines (\\n) but found malformed characters.');
      } else {
        console.log('\n✅ No newline issue detected in this test.');
      }
      
      // Show what the JSON.stringify process does
      console.log('\n🔧 JSON.stringify behavior:');
      console.log('With null, 2:', JSON.stringify({test: testDescription}, null, 2));
      
    } else {
      console.log('\n❌ Could not find test task in saved data');
    }
    
  } catch (error) {
    console.error('\n❌ Error during test:', error);
  }
}

// Run the test
testNewlineHandling().catch(console.error);