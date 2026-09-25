# Basecamp Pass — Plan

ETHGlobal Tokyo 2026 · From Scratch track · hacking started 2026-09-25 21:00 JST

## Why (origin of the idea — Toru's own experience)
- Toru runs a guesthouse in Asakusa (STAY WORK). Long items like snowboards could not be stored for guests.
- Toru helped a working-holiday visitor from Uruguay: gave him an address (fixed-term lease), lent a phone,
  he opened a bank account, joined the local festival and neighborhood association, and is now job hunting.
- Plan: turn cheap vacant houses (akiya) in Japan into a **basecamp** for travelers and working-holiday people —
  stay, leave luggage, travel around Japan, come back. Friends can join, but **only people the host approved**.

## The trust moment (what World ID solves)
A stranger is about to get the key to a home. Japanese minpaku law also requires identity checks
and a guest register for **every** person who stays.

## Decisions (Toru, 2026-09-25)
- Demo focus: **invite a friend → friend verifies → time-limited pass → door entry**.
- Unhappy paths shown: unverified friend cannot enter, expired invite / expired pass is refused.
- Storage: **Neon Postgres** (so the deployed demo really works).
- Web app (no App Store): Next.js on Vercel. World ID via IDKit (QR on desktop, World App on phone).
- Japanese driver's license / My Number Card also work (confirmed at the World booth), so the same flow serves
  foreign travelers (passport) and residents.

## Assurance levels (right credential for each moment)
| Who / moment | Credential | Why this is enough |
|---|---|---|
| Host (contract holder) | Passport / NFC document + user presence | Signs the stay; minpaku law needs ID matched to the face |
| Friend who stays overnight | Passport / NFC document | Must be in the guest register |
| Door entry | Selfie Check session (same person as enrolled) | Fast re-check, no document needed every time |

## Build order
1. Host verifies → gets a pass (IDKit, backend verification, nullifier stored)
2. Host creates an invite (room, valid from/until) → share link / code
3. Friend opens invite → verifies → gets a time-limited, non-transferable pass
4. Door screen: verify → allow / deny, write entry log = guest register
5. Unhappy paths + deploy + demo video + World integration debrief

## Out of scope for the demo (explained only)
E-contract for fixed-term lease, card prepayment, luggage storage billing.

## Findings during the hackathon (for the World integration debrief)
- 22:00 Staging simulator: every identity (#2, #4) and every credential (passport, proof_of_human) returned the
  **same nullifier** → two different people cannot be tested in staging. Reported to the World team at the booth.
- Simulator cannot do `require_user_presence` ("Presence check failed") → presence only requested in production.
- 23:00 Production, real World App + **My Number Card**:
  - World ID 4.0 `any(passport, mnc)` constraints → `credential_unavailable`
  - `mnc` / legacy document preset → v3 `secure_document` proof, verified, **unique nullifier**
  - `require_user_presence` → World App showed the **live face check**, then succeeded (host check-in)
