# Privacy Policy for AgentRejoin

**Last Updated: August 26, 2026**

## Overview

AgentRejoin synchronizes coding-agent sessions between your connected devices. Sensitive synchronization content is encrypted on your device before it is sent through the relay. This policy describes the hosted AgentRejoin service; self-hosted operators are responsible for their own deployment and data practices.

## What We Collect

### Encrypted synchronization data

- **Messages and code:** Conversation content and code snippets sent through the relay are end-to-end encrypted. The hosted relay stores ciphertext and cannot read it.
- **Pairing data:** Account keys shared during device pairing are encrypted between your devices. The hosted relay cannot decrypt them.

### Unencrypted metadata

- Message IDs and timestamps used for ordering and synchronization
- Anonymous account, device, machine, and session identifiers
- Machine presence and connection status
- Push notification tokens when notifications are enabled

### Optional analytics

When analytics is configured, AgentRejoin may collect anonymous product-usage events. It does not include conversation content or code. You can disable analytics in Settings.

### Optional direct voice connection

AgentRejoin does not currently provide hosted or subscription voice service. If you configure your own ElevenLabs agent and enable Direct Connection, your device sends microphone audio and selected session context directly to ElevenLabs. That data is outside AgentRejoin's end-to-end encrypted relay and is governed by your ElevenLabs account and ElevenLabs' privacy policy.

## What We Do Not Collect Through the Hosted Relay

- Plaintext conversation content or code
- Email addresses for account creation
- Location data
- Voice audio or voice context when using Direct Connection

The AgentRejoin daemon and the coding-agent CLI run on your server and necessarily access the local files and session data required to perform the work you request.

## How We Use Data

- Encrypted content is stored and transmitted only to synchronize your connected devices.
- Metadata is used to authenticate devices, order updates, show machine presence, and route sessions.
- Push tokens are used only to deliver notifications.
- Anonymous analytics, when enabled, is used to improve the product.

## Security

- Sensitive synchronization content is encrypted before reaching the relay.
- Account keys remain on your devices and are exchanged through the encrypted pairing flow.
- The implementation is open source and can be audited or self-hosted.

No system is completely secure. Protect your account secret and the servers on which the AgentRejoin daemon and coding agents run.

## Retention and User Controls

- Relay data is retained while needed to provide synchronization and until it is removed through available product controls or operational cleanup.
- You can delete individual sessions and remove linked machines or push tokens where those controls are available in the app.
- You can back up your account secret from the account settings page.
- Full account deletion and full-data export are not currently self-service features. Do not post account secrets or private content in a public issue.

## Data Sharing

AgentRejoin shares data only with services needed for enabled features:

- **Expo:** push notification delivery, when notifications are enabled
- **PostHog:** anonymous analytics, when analytics is configured and enabled
- **ElevenLabs:** only when you explicitly configure and start Direct Connection using your own ElevenLabs agent

We do not sell personal data.

## Changes to This Policy

Material changes will be reflected by updating this document and its effective date.

## Contact

For privacy questions, open an issue at <https://github.com/Altman-conquer/agentrejoin/issues>. Do not include account secrets, private code, or conversation content.
