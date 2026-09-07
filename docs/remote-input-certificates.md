# Remote input: one-time phone certificate setup

Remote input needs HTTPS for browser microphone access. OpenLess generates a
private certificate authority (CA) on each computer and a separate server
certificate covering that computer's LAN addresses. The phone installs the
public CA certificate. The CA private key stays in the computer's user data.

## iPhone and iPad

1. Enable remote input on the computer. Use the address shown in settings, on
   the same network as the computer. Settings also has a **Copy iPhone
   certificate link** button for each address.
2. Open the address in Safari. On the initial certificate warning, check the
   address against the computer, then use **Show Details → Visit This Website**
   to reach your own computer's setup page. This exception is only a bootstrap
   step, not the persistent trust setup.
3. Expand **First-time setup: trust this computer** and choose **iPhone:
   download profile**. Alternatively, open the copied `/cert.mobileconfig` link
   directly in Safari.
4. Install the downloaded profile in **Settings → General → VPN & Device
   Management**.
5. In **Settings → General → About → Certificate Trust Settings**, enable full
   trust for **OpenLess Remote Input CA**. Return to Safari and reload the page.
6. Enter the pairing code and allow microphone access when Safari asks.

Installing a profile and enabling full SSL trust are separate steps. Apple
requires the latter for profiles downloaded from a website; a desktop app
cannot silently approve it on a personal iPhone. See
[Apple's certificate trust instructions](https://support.apple.com/en-gb/102390).
This setup removes certificate warnings after trust is established; browser
microphone permissions and the pairing code remain separate controls.

Only install a CA from your own computer. A CA can issue certificates, so its
private key is sensitive. Remove the OpenLess profile from the phone when you
no longer use it. The certificate fingerprint in each profile identifier keeps
profiles for different computers from replacing one another.

## Android

Download `/cert.cer` using the **Android: download CA** link. Install it through
the system's **Install a certificate → CA certificate** settings, then return
to the browser. Menu names and browser support for user-installed CAs vary by
device. The download contains only the public root certificate.

## What OpenLess automates

- Creates and atomically persists a unique CA and server identity on first use.
- Reuses the same CA and server certificate after restarts and upgrades that
  preserve application data.
- Reissues the server certificate when required LAN or virtual-adapter IPs
  change, keeping the same CA and therefore the phone's trust.
- Renews the server certificate on service startup when less than 30 days
  remain. Leaves are valid for at most 366 days including clock-skew allowance;
  a continuously running service must restart before its leaf expires.
- Serves the public CA as a `.cer` file or iOS configuration profile on both
  Tauri desktop and Linux egui hosts. The private keys are never downloaded.
- Refuses to start with a damaged, unreadable, mismatched, or expiring CA rather
  than silently replacing the phone's trust anchor.

## Upgrades, reinstalling, and recovery

Older releases used a directly self-signed leaf (`remote-cert-v4.der`) and
regenerated it whenever a newly observed IP was absent from a sidecar SAN list.
Even a virtual-adapter change could invalidate the certificate trusted by the
phone. Some releases also hid certificate setup and packaged the non-CA leaf
as a root profile. Upgrading from this format requires the one-time setup above.
Old files are left intact for rollback; they are not promoted to a CA.

Keep `remote-tls-identity-v1.json` with the application's user configuration
when backing up or reinstalling. On Windows it is in
`%APPDATA%\com.openless.app`; on Tauri macOS it is in the application's config
directory; on Linux egui it is in the host data directory's `remote-input`
subdirectory. This file contains private keys: do not publish it, send it to a
phone, or copy it to another computer. Unix files are owner-readable/writable
only; Windows files inherit the user's application-data ACL.

If this file is damaged, restore the computer's own backup. If it is lost, or
the CA expires (ten years), explicitly back up/remove the old identity while
OpenLess is stopped, restart, and install/trust the newly generated CA on each
phone. Deleting all application data necessarily loses the old trust identity.

## Regression checks

```sh
cargo test --manifest-path openless-all/app/src-tauri/backend-tests/Cargo.toml --test remote_tls
node openless-all/app/scripts/remote-input-audio-queue.test.mjs
```

The TLS tests exercise real rustls handshakes with only the downloaded CA as a
trust anchor, IP changes, restart reuse, renewal, corrupted keys, persistence
failure, migration, and separation between two computers. iOS installation and
microphone recording still require a physical-device smoke test.
