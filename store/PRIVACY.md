# Touchline Fantasy — Privacy Policy

_Last updated: 7 September 2026_

This policy describes what Touchline Fantasy ("the app") collects and why. It
reflects what the code in this repository actually does. **Review it — and have
it reviewed — before publishing; it is a starting point written by the
development team, not legal advice.**

## Who runs the service

Touchline Fantasy is operated by the person or team who deploys this app's
backend. Replace this paragraph with your name and a contact email address
before publishing — Google Play requires a working contact.

Contact: `REPLACE-WITH-YOUR-EMAIL`

## What the app collects

The app only stores what you enter or generate while playing:

| Data | Why | Where it goes |
| --- | --- | --- |
| Team name and head coach name | Identifies you to the other managers in your league | Our backend database |
| Your email address | Identifies your account so you can sign back in | Our backend database |
| Your password | Proves the account is yours. Stored only as a scrypt hash with a per-account random salt, never as text, and never recoverable | Our backend database |
| Your league activity — squad, captain, transfers, auction bids, waiver claims, predictions | It is the game | Our backend database |
| League chat messages | Shown to the other managers in your league | Our backend database |
| A session token | Keeps you signed in | Stored on your device only |

The app does **not** collect location, contacts, photos, files, microphone or
camera data, advertising identifiers, or device fingerprints. It contains no
advertising SDK and no third-party analytics or tracking.

## How it is used

Your data is used only to run the game: to show your squad, score your team,
and let the managers in your league see standings and chat. It is not sold,
not shared with advertisers, and not used to build a profile of you.

## Who can see it

Other managers in a league you join can see your team name, coach name,
squad, results and chat messages. That is the point of a shared league. Nobody
outside your league sees it through the app.

## Retention and deletion

Data is kept while your account exists. To delete your account and everything
attached to it, email the contact address above; the account, squad, bids and
chat messages are removed from the database. Google Play requires this route to
exist, so keep the address monitored.

## Children

The app is not directed at children under 13 and does not knowingly collect
their data.

## Security

Traffic between the app and the backend uses HTTPS when the backend is deployed
behind TLS — do not run a production deployment over plain HTTP. Session tokens
are signed and expire after 30 days.

## Changes

If this policy changes, the "last updated" date above changes with it, and the
current version stays at this URL.
