# Deviations: quiet-booping-diffie

One deviation from the plan.

### Plan said: verify manually / via existing tests
The plan's verification section described manual testing and running existing tests. In practice, a new automated test (Test 13) was also added to cover the race condition directly, and a `page2IdsOverride` variable was added to the route handler in `test/test.js` to allow fine-grained control over the page 2 fixture per test. This is an addition, not a change to the core fix.
