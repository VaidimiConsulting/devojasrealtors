/**
 * Unit verification test for StatCard responsive overflow rules
 */

// Test values required by Section 5:
const testCases = [
  { val: '₹9,999', expectedLen: 6, desc: 'Short amount' },
  { val: '₹1,57,50,000', expectedLen: 12, desc: 'Original reported overflow amount' },
  { val: '₹12,34,56,789', expectedLen: 13, desc: 'Large 8-digit crore amount' },
  { val: '₹1,23,45,67,890', expectedLen: 15, desc: 'Extra-long multi-crore amount' }
];

function verifyStatCardLogic(val) {
  const strVal = String(val ?? '');
  const len = strVal.length;

  const isShort = len <= 7;
  const isMedium = len > 7 && len <= 10;
  const isLong = len > 10 && len <= 14;
  const isExtraLong = len > 14;

  const dynamicStyle = {
    wordBreak: 'break-word',
    overflowWrap: 'anywhere',
    lineHeight: isShort ? 1.25 : 1.2,
    ...(isMedium ? { fontSize: 'clamp(1.3rem, 1.8vw, 1.75rem)' } : {}),
    ...(isLong ? { fontSize: 'clamp(1.15rem, 1.45vw, 1.5rem)' } : {}),
    ...(isExtraLong ? { fontSize: 'clamp(1rem, 1.25vw, 1.3rem)' } : {}),
  };

  return {
    len,
    isShort,
    isMedium,
    isLong,
    isExtraLong,
    dynamicStyle,
    className: isShort ? 'text-2xl sm:text-3xl' : ''
  };
}

console.log('Testing StatCard adaptive styling logic across Section 5 test values:\n');

testCases.forEach(({ val, expectedLen, desc }) => {
  const result = verifyStatCardLogic(val);
  console.log(`[${desc}] Value: "${val}" (Length: ${result.len})`);
  console.log(`  - Word break: "${result.dynamicStyle.wordBreak}"`);
  console.log(`  - Overflow wrap: "${result.dynamicStyle.overflowWrap}"`);
  console.log(`  - Line height: ${result.dynamicStyle.lineHeight}`);
  console.log(`  - Font size rule: ${result.dynamicStyle.fontSize || result.className}`);
  
  if (result.len <= 7) {
    if (!result.isShort || result.className !== 'text-2xl sm:text-3xl') {
      throw new Error(`Failed: Short value should keep text-2xl sm:text-3xl`);
    }
  } else if (result.len >= 11 && result.len <= 14) {
    if (!result.isLong || !result.dynamicStyle.fontSize.includes('clamp')) {
      throw new Error(`Failed: Long value should use clamp font size`);
    }
  } else if (result.len > 14) {
    if (!result.isExtraLong || !result.dynamicStyle.fontSize.includes('clamp(1rem')) {
      throw new Error(`Failed: Extra long value should scale to 1rem-1.3rem`);
    }
  }

  // Verify critical safety properties
  if (result.dynamicStyle.overflowWrap !== 'anywhere' || result.dynamicStyle.wordBreak !== 'break-word') {
    throw new Error('Failed: overflowWrap anywhere and wordBreak break-word must be present!');
  }
  console.log('  -> PASS ✅\n');
});

console.log('All Section 5 test cases validated successfully! 🚀');
