const assert = require('node:assert/strict');
const { test } = require('node:test');
const { buildEventConfig } = require('../src/services/campaign.service');

const offerEvents = [{ eventName: 'Install', payoutAmount: '200.00' }];

test('uses the offer payout and assigns the remainder to the publisher', () => {
  const config = buildEventConfig(
    [{ name: 'Install', maxPayout: 500, cashback: 50, referralCashback: 0 }],
    offerEvents,
    false
  );

  assert.deepEqual(config.Install, {
    user_cashback: 50,
    referral_cashback: 0,
    max_payout: 200,
    your_profit: 150,
  });
});

test('rejects user and referral rewards that exceed the offer payout', () => {
  assert.throws(
    () => buildEventConfig(
      [{ name: 'Install', cashback: 150, referralCashback: 50.01 }],
      offerEvents,
      true
    ),
    (error) => error.statusCode === 400 && /cannot exceed the offer payout/.test(error.message)
  );
});

test('rejects event names that are not part of the selected offer', () => {
  assert.throws(
    () => buildEventConfig([{ name: 'Signup', cashback: 50 }], offerEvents, false),
    (error) => error.statusCode === 400 && /not a unique event/.test(error.message)
  );
});
