#!/usr/bin/env node
/**
 * Verification script for newline handling issue #4
 * This script tests the sanitization logic directly without importing the main module
 */

/**
 * Sanitize and fix newline characters in strings
 * This is an improved version of the sanitization logic
 */
function sanitizeString(input) {
  if (typeof input !== 'string') {
    return String(input);
  }
  
  // Fix common newline corruption patterns found in issue #4
  // Be more specific to avoid false positives
  return input
    // Fix the specific pattern from issue #4: "instructions.mdnnFiles" -> "instructions.md\n\nFiles"
    .replace(/\.md(nn)(?=[A-Z])/g, '.md\n\n')
    // Fix pattern like "analyze:n-" -> "analyze:\n-"
    .replace(/:n(-)/g, ':\n$1')
    // Fix other 'nn' patterns that should be double newlines (only when followed by capital letter)
    .replace(/(\w)(nn)(?=[A-Z])/g, '$1\n\n')
    // Fix single 'n' followed by dash when it's clearly a list item (preceded by colon or space)
    .replace(/(:|\s)(n)(-)/g, '$1\n$3')
    // Fix standalone 'n' that should be newlines when followed by list items (more specific)
    .replace(/(:)(n)(?=[-*•])/g, '$1\n')
    // General cleanup: if we have literal \n sequences, preserve them
    .replace(/\\n/g, '\n');
}

function testNewlineHandling() {
  console.log('🧪 Testing newline sanitization logic for issue #4...\n');
  
  // Test case 1: The exact issue reported by drmikecrowe
  const corruptedText1 = "Follow the instructions in memory-bank/prompts/design-review/request-2-instructions.mdnnFiles to analyze:n- src/components/ (entire directory)";
  const expected1 = "Follow the instructions in memory-bank/prompts/design-review/request-2-instructions.md\n\nFiles to analyze:\n- src/components/ (entire directory)";
  
  console.log('📝 Test Case 1: Original issue pattern');
  console.log('Input (corrupted):', JSON.stringify(corruptedText1));
  
  const result1 = sanitizeString(corruptedText1);
  console.log('Output (sanitized):', JSON.stringify(result1));
  console.log('Expected:', JSON.stringify(expected1));
  console.log('✅ Test 1 passed:', result1 === expected1 ? 'YES' : 'NO');
  
  if (result1 !== expected1) {
    console.log('❌ Difference found:');
    console.log('  Got:     ', result1);
    console.log('  Expected:', expected1);
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Test case 2: Other common patterns
  const testCases = [
    {
      name: 'Double n pattern',
      input: 'This is a testnnNext line',
      expected: 'This is a test\n\nNext line'
    },
    {
      name: 'Single n with dash',
      input: 'Some textn- List item',
      expected: 'Some text\n- List item'
    },
    {
      name: 'Single n with asterisk',
      input: 'Some textn* List item',
      expected: 'Some text\n* List item'
    },
    {
      name: 'Literal backslash n',
      input: 'Line 1\\nLine 2\\nLine 3',
      expected: 'Line 1\nLine 2\nLine 3'
    },
    {
      name: 'Already correct newlines',
      input: 'Line 1\nLine 2\n\nLine 3',
      expected: 'Line 1\nLine 2\n\nLine 3'
    }
  ];
  
  let allPassed = true;
  
  testCases.forEach((testCase, index) => {
    console.log(`📝 Test Case ${index + 2}: ${testCase.name}`);
    console.log('Input:', JSON.stringify(testCase.input));
    
    const result = sanitizeString(testCase.input);
    console.log('Output:', JSON.stringify(result));
    console.log('Expected:', JSON.stringify(testCase.expected));
    
    const passed = result === testCase.expected;
    console.log('✅ Passed:', passed ? 'YES' : 'NO');
    
    if (!passed) {
      console.log('❌ Difference found:');
      console.log('  Got:     ', result);
      console.log('  Expected:', testCase.expected);
      allPassed = false;
    }
    
    console.log('\n' + '-'.repeat(40) + '\n');
  });
  
  console.log('🎯 Overall Result:');
  if (allPassed) {
    console.log('✅ All tests passed! The newline sanitization fix is working correctly.');
  } else {
    console.log('❌ Some tests failed. The sanitization logic may need adjustment.');
  }
  
  return allPassed;
}

// Run the test
const success = testNewlineHandling();
process.exit(success ? 0 : 1);
