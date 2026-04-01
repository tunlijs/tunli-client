# `tunli setup` — Interactive Setup Wizard

## Overview

`tunli setup` is a one-shot wizard that walks through all required configuration steps to get a tunnel running.

---

## Steps

### Step 1/5 — Relay

Checks whether an account already exists (server config with auth token).

- **No account found** → auto-registers with `tunli.app`, saves the auth token, generates an Ed25519 identity keypair
- **Account found** → confirms existing registration, continues

---

### Step 2/5 — Config location

Determines where profile config will be saved.

- **Local config found** in the current directory → uses it
- **No local config** → prompts: `Create one in the current directory? [y/N]`
    - Yes → creates `.tunli/config.json`, registers it in the global config
    - No → falls back to global config (`~/.tunli/config.json`)

---

### Step 3/5 — Profile

First asks: `Create a tunnel profile? [y/N]`

- **No** → setup completes here (relay and config location are saved); profile can be added later by re-running
  `tunli setup`
- **Yes** → prompts for a profile name (default: `default`)
    - Empty input → rejected, re-prompted
    - Profile already exists → asks `Overwrite? [y/N]`
        - No → re-prompts for a different name

---

### Step 4/5 — Target

Configures the local service to tunnel to.

| Prompt     | Default     | Validation                |
|------------|-------------|---------------------------|
| Protocol   | `http`      | must be `http` or `https` |
| Host       | `localhost` | —                         |
| Local port | —           | 1–65535                   |

Invalid protocol or port → error message, re-prompted.

---

### Step 5/5 — Access control (optional)

- `Restrict access by IP? [y/N]`
    - Yes → prompts for comma-separated CIDRs (e.g. `192.168.1.0/24,10.0.0.0/8`)
    - No / empty input → access control skipped

---

## After the wizard

1. Registers the proxy with the relay (`validateProfileConfig`)
2. Saves the profile config
3. Prints a summary:
   ```
   ✓ https://abc.tunli.app → http://localhost:3000
   Profile "default" saved to .tunli/config.json

   Start your tunnel:
     tunli use default

   Or start all profiles in this project:
     tunli up
   ```
   The `tunli up` hint only appears when a local config was used.
