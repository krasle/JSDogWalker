'use strict';

let passed = 0, failed = 0;

function test(name, fn) {
  try { fn(); console.log(`  \u2713 ${name}`); passed++ }
  catch (e) { console.error(`  \u2717 ${name}\n    ${e.message}`); failed++ }
}

function expect(val) {
  return {
    toBe:       exp => { if (val !== exp) throw new Error(`Expected ${exp}, got ${val}`) },
    toContain:  exp => { if (!val.includes(exp)) throw new Error(`Expected to contain ${exp}`) },
    not: { toContain: exp => { if (val.includes(exp)) throw new Error(`Expected NOT to contain ${exp}`) } },
    toHaveLength: n  => { if (val.length !== n) throw new Error(`Expected length ${n}, got ${val.length}`) },
  }
}

// ── Billing ──
console.log('\nBilling - fee calculation')
const fee = n => 30 + (Math.max(n,1) - 1) * 10
test('1 dog = $30',  () => expect(fee(1)).toBe(30))
test('2 dogs = $40', () => expect(fee(2)).toBe(40))
test('3 dogs = $50', () => expect(fee(3)).toBe(50))
test('5 dogs = $70', () => expect(fee(5)).toBe(70))

// ── Valid slots ──
console.log('\nValid time slots')
const VALID_SLOTS = (() => {
  const s = []
  for (let h = 7; h <= 11; h++) { s.push(`${String(h).padStart(2,'0')}:00`); s.push(`${String(h).padStart(2,'0')}:30`) }
  for (let h = 13; h <= 18; h++) { s.push(`${String(h).padStart(2,'0')}:00`); s.push(`${String(h).padStart(2,'0')}:30`) }
  return s
})()
test('22 valid slots',        () => expect(VALID_SLOTS).toHaveLength(22))
test('starts at 07:00',       () => expect(VALID_SLOTS).toContain('07:00'))
test('includes 11:30',        () => expect(VALID_SLOTS).toContain('11:30'))
test('includes 13:00',        () => expect(VALID_SLOTS).toContain('13:00'))
test('ends at 18:30',         () => expect(VALID_SLOTS).toContain('18:30'))
test('no 12:00 (lunch)',       () => expect(VALID_SLOTS).not.toContain('12:00'))
test('no 19:00 (after last)', () => expect(VALID_SLOTS).not.toContain('19:00'))
test('no 06:30 (before open)',() => expect(VALID_SLOTS).not.toContain('06:30'))

// ── Scheduling ──
console.log('\nScheduling validation')
const valid = s => VALID_SLOTS.includes(s)
test('07:00 valid',       () => { if (!valid('07:00')) throw new Error('07:00 should be valid') })
test('11:30 valid',       () => { if (!valid('11:30')) throw new Error('11:30 should be valid') })
test('18:30 valid',       () => { if (!valid('18:30')) throw new Error('18:30 should be valid') })
test('12:00 invalid',     () => { if (valid('12:00'))  throw new Error('12:00 should be invalid') })
test('19:00 invalid',     () => { if (valid('19:00'))  throw new Error('19:00 should be invalid') })
test('06:30 invalid',     () => { if (valid('06:30'))  throw new Error('06:30 should be invalid') })

console.log(`\n  ${passed} passed, ${failed} failed\n`)
if (failed > 0) process.exit(1)
