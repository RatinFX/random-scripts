/**
 * Smoke tests for discord-embed-fixer.js
 * Run with: node browser-scripts/test/discord-embed-fixer.test.js
 */

// ── Inline implementation under test ──────────────────────────

function createRegex(link) {
  const regex = new RegExp(`(https?://)(?:www\\.)?(?:${link})\\.com(/.*)?`, 'i');
  console.log("[URL copy script] - createRegex | regex:", regex);
  return regex;
}

const siteRules = [
  {
    name: "twitter",
    regex: createRegex("x|twitter"),
    embedders: ['fixupx.com', 'fxtwitter.com', 'stupidpenisx.com'],
    transform(match, protocol, path) {
      return protocol + this.embedders[0] + (path || '');
    },
    allowedParams: undefined,
  },
  {
    name: "reddit",
    regex: createRegex("reddit"),
    embedders: ['rxddit.com'],
    transform(match, protocol, path) {
      return protocol + this.embedders[0] + (path || '');
    },
    allowedParams: undefined,
  },
  {
    name: "bilibili",
    regex: createRegex("bilibili"),
    embedders: ['vxbilibili.com'],
    transform(match, protocol, path) {
      return protocol + this.embedders[0] + (path || '');
    },
    allowedParams: ['t'],
  },
  {
    name: "instagram",
    regex: createRegex("instagram"),
    embedders: ['kkinstagram.com'],
    transform(match, protocol, path) {
      return protocol + this.embedders[0] + (path || '');
    },
    allowedParams: undefined,
  },
  {
    name: "facebook",
    regex: createRegex("facebook"),
    embedders: ['facebed.com'],
    transform(match, protocol, path) {
      return protocol + this.embedders[0] + (path || '');
    },
    allowedParams: ['fbid'],
  },
];

function stripTracking(urlString, rule) {
  try {
    const url = new URL(urlString);
    const params = url.searchParams;
    const allowed = rule?.allowedParams ? new Set(rule.allowedParams) : null;
    const keys = Array.from(params.keys());
    for (const key of keys) {
      if (!allowed || !allowed.has(key)) {
        params.delete(key);
      }
    }
    const query = params.toString();
    return url.origin + url.pathname + (query ? '?' + query : '') + url.hash;
  } catch (ex) {
    return urlString;
  }
}

function processLink(text) {
  for (const rule of siteRules) {
    if (rule.regex.test(text)) {
      const modified = text.replace(rule.regex, rule.transform.bind(rule));
      return stripTracking(modified, rule);
    }
  }
  return null;
}

// ── PRNG seed so embedder selection is deterministic for tests ──
let __randIndex = 0;
function processLinkDeterministic(text) {
  for (const rule of siteRules) {
    if (rule.regex.test(text)) {
      const domain = rule.embedders[__randIndex % rule.embedders.length];
      const modified = text.replace(
        rule.regex,
        (match, protocol, path) => protocol + domain + (path || '')
      );
      return stripTracking(modified, rule);
    }
  }
  return null;
}

// ─── Tests ────────────────────────────────────────────────────

let passed = 0, failed = 0;

function assert(name, condition) {
  if (condition) {
    console.log(`  ✓ ${name}`);
    passed++;
  } else {
    console.error(`  ✗ ${name}`);
    failed++;
  }
}

function assertContains(name, haystack, needle) {
  if (haystack.includes(needle)) {
    console.log(`  ✓ ${name}`);
    passed++;
  } else {
    console.error(`  ✗ ${name}`);
    console.error(`    expected to contain: ${needle}`);
    console.error(`    got: ${haystack}`);
    failed++;
  }
}

function assertNotContains(name, haystack, needle) {
  if (!haystack.includes(needle)) {
    console.log(`  ✓ ${name}`);
    passed++;
  } else {
    console.error(`  ✗ ${name}`);
    console.error(`    expected not to contain: ${needle}`);
    console.error(`    got: ${haystack}`);
    failed++;
  }
}

function assertEqual(name, actual, expected) {
  if (actual === expected) {
    console.log(`  ✓ ${name}`);
    passed++;
  } else {
    console.error(`  ✗ ${name}`);
    console.error(`    expected: ${expected}`);
    console.error(`    got:      ${actual}`);
    failed++;
  }
}

function siteRule(name) {
  return siteRules.find(s => s.name === name);
}

// ── createRegex tests ─────────────────────────────────────────
console.log('\ncreateRegex');
{
  const r = createRegex('x|twitter');
  assert('regex exists', !!r);
  assert('matches https://x.com/...', r.test('https://x.com/user/status/123'));
  assert('matches https://twitter.com/...', r.test('https://twitter.com/user/status/123'));
  assert('matches https://www.twitter.com/...', r.test('https://www.twitter.com/user/status'));
  assert('does NOT match non-site', !r.test('https://example.com/user'));
}

// ── stripTracking tests ───────────────────────────────────────
console.log('\nstripTracking');
{
  const tw = siteRule('twitter');

  assertEqual(
    'removes ?s=20 tracking param',
    stripTracking('https://stupidpenisx.com/user/status/123?s=20', tw),
    'https://stupidpenisx.com/user/status/123'
  );
  assertEqual(
    'removes multiple tracking params',
    stripTracking('https://stupidpenisx.com/user/status?s=20&utm_source=share', tw),
    'https://stupidpenisx.com/user/status'
  );
  assertEqual(
    'keeps #hash (url search before hash)',
    stripTracking('https://stupidpenisx.com/user/status?s=20#section', tw),
    'https://stupidpenisx.com/user/status#section'
  );
}

{
  const bl = siteRule('bilibili');
  assertEqual(
    'keeps ?t param (bilibili allowedParams)',
    stripTracking('https://vxbilibili.com/video/BV1xx?t=60', bl),
    'https://vxbilibili.com/video/BV1xx?t=60'
  );
  assertEqual(
    'removes non-?t params (bilibili)',
    stripTracking('https://vxbilibili.com/video?t=60&share_source=copy_web', bl),
    'https://vxbilibili.com/video?t=60'
  );
}

{
  const fb = siteRule('facebook');
  assertEqual(
    'keeps ?fbid param (facebook allowedParams)',
    stripTracking('https://facebed.com/photo?fbid=123456', fb),
    'https://facebed.com/photo?fbid=123456'
  );
  assertEqual(
    'removes non-?fbid params (facebook)',
    stripTracking('https://facebed.com/photo?set=abc&fbid=123', fb),
    'https://facebed.com/photo?fbid=123'
  );
}

{
  // When rule is undefined, allowed = null, so all params are stripped (correct for a bare URL)
  assertEqual(
    'strips all params when rule is undefined',
    stripTracking('https://x.com/user/status?s=20', undefined),
    'https://x.com/user/status'
  );
}

// ── processLink integration tests ─────────────────────────────
console.log('\nprocessLink');

{
  __randIndex = 0;                          // picks fixupx.com (embedders[0])
  const result = processLink('https://x.com/SenhorZiborro/status/2056519929789092136?s=20');
  assert('returns a string (not null)', typeof result === 'string');
  assertContains('domain replaced with embedder', result, 'https://fixupx.com');
  assertContains('path preserved', result, '/SenhorZiborro/status/2056519929789092136');
  assertNotContains('?s=20 stripped from result', result, '?s=20');
}

{
  __randIndex = 0;
  const result = processLink('https://twitter.com/user/status/123?s=20');
  assertContains('twitter.com -> embedder', result, 'https://fixupx.com');
  assertNotContains('?s=20 stripped', result, '?s=20');
}

{
  const result = processLink('https://reddit.com/r/programming/comments/abc123?utm_source=share');
  assertContains('reddit -> rxddit', result, 'https://rxddit.com');
  assertNotContains('utm_source stripped', result, 'utm_source');
}

{
  __randIndex = 0;
  const result = processLink('https://bilibili.com/video/BV1xx?t=60&share_source=copy_web');
  assertContains('bilibili -> vxbilibili', result, 'https://vxbilibili.com/video/BV1xx?t=60');
  assertNotContains('non-?t param stripped', result, 'share_source');
}

{
  assertEqual('returns null for non-matching URL', processLink('https://youtube.com/watch?v=dQw4w9WgXcQ'), null);
}
{
  assertEqual('returns null for empty string', processLink(''), null);
}

// ── Summary ──
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
