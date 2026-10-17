# Privacy policy rewrite — publish checklist

Drafts live in `_drafts/` (ES, EN, and both delete-account pages). `_drafts/` is in
`.git/info/exclude`, so git never sees it and nothing can deploy by accident.
Base text: remote branch `origin/privacy-policy-audit-2026-10` (ES only), corrected against the app code and Supabase.

**Gate before publishing:** `grep -rn -E '\[\[|PRE-PUBLISH|DRAFT-ONLY' _drafts` must return nothing.

## A. Values only you can supply (`[[ ]]`)

| Placeholder | What to give | Note |
|---|---|---|
| Publication date | Day 2.0.5 is live in both stores | Never before — see B1 |
| ~~Full surnames / domicilio~~ | **Resolved 2026-10-17** from the RPC receipt: controller is RUMBO TECH LABS, S.A.S. (capital variable), Zona Cementos Atoyac, Calle 5 No. 28, C.P. 72023, Puebla, Puebla (folio SAS20261014133) | Both drafts now name the company + its registered address, so no personal home address is published. **Check:** the App Store seller still shows "Christian Garcia" (a persona física name) — align the seller / Apple Developer account name with the company or the policy and store listing will disagree |
| Firebase retention (2 or 14 months) | Firebase console → Analytics → Data settings → Data retention | Set it there first, then write the same number |

## B. App / backend work the draft text depends on (`PRE-PUBLISH`)

| # | Severity | What the draft says | What the code does today | Fix |
|---|---|---|---|---|
| B1 | CRITICAL | Two express consents, logged: core (goal, meal history + photos analysed by OpenAI; mandatory, at Welcome) and optional body metrics (inline, only if the user enters a value; says sex goes to OpenAI) | Live app: only a Terms/Privacy checkbox, no consent table. App branch `feat/consent-and-deletion` (~/caloriasDev) implements it, wording FINAL 2026-10-17, tests green; migration NOT applied, `kPrivacyPolicyVersion` still a placeholder | Set the policy-version date = publication date, apply migration, ship in 2.0.5, verify on device |
| B2 | HIGH | Deleting the account removes the RevenueCat record and revokes Sign in with Apple | Implemented + tested on the same branch (order: Apple revoke → delete user → RevenueCat). NOT live: function not deployed, the 4 `APPLE_*` secrets not set, no 2.0.5 build; old builds cannot revoke Apple | Deploy function, set secrets, test with a throwaway Apple ID, ship 2.0.5 |
| B3 | HIGH | Analytics is opt-in for EEA | Firebase Analytics starts for everyone (`setAnalyticsCollectionEnabled(!kDebugMode)`) | Add opt-in/off switch, or remove EU/EEA/UK storefronts and the GDPR bits |
| B4 | HIGH | Age 18+ | `terms.html` + `en/terms.html` say 13+; App Store rating is 9+ | Align Terms; decide age gate; review App Store age-rating answers |
| B5 | HIGH | App Privacy label matches the policy | Live label lists only Purchases, Email, User ID, Device ID, Product Interaction, Crash/Performance | Add Health & Fitness (and Photos), same for Play Data Safety |
| B6 | MEDIUM | No health data sent to ad platforms | Events `food_saved` / `scan_completed` carry `food_name` + `calories`; `first_scan` and `subscription_start` are labelled "ad platform" events; Android declares `AD_ID` | Confirm Firebase is not linked to Google Ads, or drop `food_name`/`calories` from events |
| B7 | MEDIUM | Per-device trial counter kept without time limit, disclosed | `device_scan_trials` has no TTL and survives account deletion (42 rows since 2026-05-01) | Keep and disclose (as drafted) or add a purge |
| B8 | MEDIUM | Website honors opt-out signals | `assets/cookie-banner.js` has no Global Privacy Control code | Draft no longer claims GPC; add code if you want to claim it |
| B9 | LOW | In-app policy matches the website | `lib/screens/privacy_policy_screen.dart` and the app repo's own `privacy-policy.html` / `_site` copies are separate | Update all copies on the same day |
| B10 | LOW | In-app deletion path | Policy says Profile → Delete my account; the old delete page said Settings → Account | Confirm in the shipped build (`PRE-PUBLISH` marker in delete pages) |

## C. For a lawyer (not decided in the drafts)

- Washington My Health My Data Act: needs a separate, linked "Consumer Health Data Privacy Policy" and its own consent flow.
- EU representative (GDPR Art. 27) if EU storefronts stay on.
- LFPDPPP 2025 text: confirm ARCO periods (drafted as 20 + 15 business days, the 2010-law figures) and the aviso simplificado / corto for the in-app consent screen.
- (Resolved) The policy now publishes the company's registered address instead of a personal one. Have the lawyer confirm the S.A.S. name/address wording.

## D. How the placeholders were resolved (sources)

| Item | Value | Source |
|---|---|---|
| Analytics / crash SDK | Firebase Analytics + Crashlytics (Google LLC, US) | `pubspec.yaml`, `docs/analytics_events_reference.md` |
| Photo path | App → `analyze-food` Edge Function → OpenAI (not stored) | `supabase/functions/analyze-food/index.ts`; no storage/upload calls found |
| OpenAI retention | Up to 30 days (abuse monitoring), no training by default | OpenAI "Data controls" docs, checked 2026-10-16 |
| Backups / logs | 7 days | Supabase org plan = Pro (via Supabase MCP) |
| Data region | us-east-1 (Virginia) | Supabase project `CalorIA-Scan` |
| Authority | Secretaría Anticorrupción y Buen Gobierno | Law published in DOF 2025-03-20; supervision moved from INAI |
| Seller name | Christian Garcia (App Store) vs controller RUMBO TECH LABS, S.A.S. (policy) | App Store listing id6761160287; RPC receipt 2026-03-23 — mismatch to resolve |
| Controller | RUMBO TECH LABS, S.A.S.; Zona Cementos Atoyac, Calle 5 No. 28, C.P. 72023, Puebla | RPC boleta de inscripción, folio SAS20261014133 |
| Withdrawal | Perfil → Más → Retirar consentimiento (body = erase data, keep account; nutrition = delete account) | app branch `feat/consent-and-deletion` |
| Microphone | Not recorded (`enableAudio: false`) | `camera_screen.dart` |
| Removed claim | "Credentials in Keychain/Keystore" | No secure-storage package in `pubspec.yaml` |
| Removed claim | "We respect GPC" | Not implemented on the site |
| Added disclosure | Anonymous device ID, pre-account scans, permanent trial counter | `device_fingerprint.dart`, `device_scan_trials` migration |
| Corrected claim | OpenAI does not get "only the photo": it also gets language, tip style and a gender hint (`user_sex`, used only to word tips); no name, email, weight, height or age | `analyze-food/index.ts` (`user_sex`, `agent_style`, `lang`) |
| Corrected claim | Body metrics are optional (skip link; generic 2000 kcal goal fallback) | `onboarding_screen.dart`, `daily_goal_provider.dart` |

## E. Publishing

Still blank (only you can supply): publication date (`[[FECHA DE PUBLICACIÓN]]` / `[[PUBLICATION DATE]]` — the SAME date goes into `kPrivacyPolicyVersion` in the app) and the Firebase retention number (`[[2 / 14]]`).


1. Ship 2.0.5 with B1–B2 (and B3 or the EU-storefront removal).
2. Tell Claude "publish the privacy drafts": it removes the `DRAFT-ONLY` blocks, copies the four files over the live ones, runs the gate grep, commits and pushes.
3. Same day: update the App Privacy label, Play Data Safety, in-app policy, and Terms age line.
