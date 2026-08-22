## What changed?

<!-- Explain the user-visible or engineering change. -->

## Why?

<!-- What failure mode, limitation, or product goal does this address? -->

## Validation

- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] Relevant regression test added/updated
- [ ] Responsive/mobile behavior checked if UI changed

## Deduction safety

If this touches game logic:

- [ ] Does not allow premature/unconfirmed guesses
- [ ] Does not leak candidate names inside QUESTION turns
- [ ] Does not repeat rejected guesses
- [ ] Does not ask incompatible/redundant questions
- [ ] Does not give up earlier than policy allows
- [ ] External-service failure still degrades gracefully

## Database / environment

- [ ] No database change
- [ ] OR migration added under `supabase/migrations/`
- [ ] SBD schema isolation preserved
- [ ] No secrets committed
- [ ] Environment-variable/deployment changes documented

## Screenshots / notes

<!-- Add screenshots for UI changes, or explain why none are needed. -->
