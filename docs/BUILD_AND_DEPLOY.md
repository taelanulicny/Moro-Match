# Moro — Build, Simulator, TestFlight & App Store

How to run the app in the iOS Simulator, then ship to TestFlight and the App Store using **Expo** (recommended for this stack).

---

## Prerequisites

| Tool | Purpose |
|------|---------|
| **Node.js** (v18+) | Run the app and Expo CLI |
| **Xcode** (Mac only) | iOS Simulator + signing for device/TestFlight |
| **Apple Developer account** ($99/year) | TestFlight + App Store |
| **Expo account** (free) | EAS Build & Submit (optional but easiest) |

Install Xcode from the Mac App Store, then install the iOS Simulator and command-line tools:

```bash
xcode-select --install
```

---

## 1. Run in iOS Simulator (local testing)

From the project root (once the Expo app exists):

```bash
# Install dependencies (first time)
npm install

# Start the dev server
npx expo start
```

Then:

- Press **`i`** in the terminal to open the **iOS Simulator**, or  
- Scan the QR code with your phone using **Expo Go** (for quick device testing).

The simulator uses the same code as a real device; you can test flows, UI, and API calls there.

**Tip:** To pick a specific simulator (e.g. iPhone 16):

```bash
npx expo start
# Then press "i" — or run:
npx expo run:ios --device "iPhone 16"
```

---

## 2. Build for TestFlight & App Store (Expo EAS)

Expo’s **EAS (Expo Application Services)** builds your app in the cloud and can submit to App Store Connect. No need to open Xcode for the build itself.

### 2.1 One-time setup

1. **Create an Expo account** (if you don’t have one):  
   https://expo.dev/signup

2. **Log in in the project:**
   ```bash
   npx eas login
   ```

3. **Configure EAS in the project:**
   ```bash
   npx eas build:configure
   ```
   This creates `eas.json` and wires up build profiles.

4. **Apple credentials (first time):**
   - EAS can create and manage your **Distribution certificate** and **Provisioning Profile** for you.
   - When you run the first iOS build, EAS will prompt you to log in with your **Apple ID** (the one tied to your Apple Developer account) and will handle certificates.

   Ensure your Apple Developer account is in good standing and you’ve accepted the latest agreements in [App Store Connect](https://appstoreconnect.apple.com).

### 2.2 Build an iOS app for TestFlight

From the project root:

```bash
# Production-like build (for TestFlight / App Store)
npx eas build --platform ios --profile production
```

- EAS builds the app in the cloud and gives you a link to the `.ipa` when it’s done.
- Use the **production** (or **preview**) profile that’s set up for **App Store** distribution (not ad hoc).

### 2.3 Submit the build to TestFlight

After the build finishes:

```bash
# Submit the latest iOS production build to TestFlight
npx eas submit --platform ios --profile production --latest
```

- EAS uploads the build to **App Store Connect** and it appears in **TestFlight** after Apple finishes processing (usually 5–15 minutes).
- In [App Store Connect](https://appstoreconnect.apple.com) → your app → **TestFlight**, add internal/external testers and install via the TestFlight app.

To submit a specific build instead of `--latest`:

```bash
npx eas submit --platform ios --profile production --id <build-id>
```

---

## 3. From TestFlight to the App Store

1. In **App Store Connect** → your app → **App Store** tab.
2. Create a **new version** (e.g. 1.0.0) and select the build you submitted from TestFlight.
3. Fill in product page (screenshots, description, privacy, etc.).
4. Submit for **Review**. Once approved, you can release manually or automatically.

No extra “upload” step—the same build you sent to TestFlight is the one you submit for review.

---

## 4. Suggested `eas.json` (reference)

After `eas build:configure`, you’ll have something like this. Adjust profile names if you prefer.

```json
{
  "cli": { "version": ">= 5.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": { "simulator": true }
    },
    "preview": {
      "distribution": "internal",
      "ios": { "simulator": false },
      "channel": "preview"
    },
    "production": {
      "distribution": "store",
      "ios": { "simulator": false },
      "channel": "production"
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@email.com",
        "ascAppId": "YOUR_APP_STORE_CONNECT_APP_ID",
        "appleTeamId": "YOUR_TEAM_ID"
      }
    }
  }
}
```

- **development** – simulator or internal device testing.  
- **preview** – internal TestFlight-style testing (optional).  
- **production** – store build for TestFlight + App Store; use this for `eas build` and `eas submit` when shipping.

Fill in `appleId`, `ascAppId`, and `appleTeamId` when you’re ready to automate submit (EAS can prompt for these if not set).

---

## 5. Quick reference

| Goal | Command |
|------|---------|
| Run in iOS Simulator | `npx expo start` → press `i` |
| Build iOS for TestFlight/App Store | `npx eas build --platform ios --profile production` |
| Submit latest build to TestFlight | `npx eas submit --platform ios --profile production --latest` |
| Open EAS dashboard (build history, logs) | https://expo.dev |

---

## 6. When you add the app code

This doc assumes an **Expo** app at the project root (e.g. created with `npx create-expo-app` or an Expo template). Once you have:

- `package.json` with Expo dependencies  
- `app.json` or `app.config.js` with your bundle ID and name  

you can run the simulator and EAS commands above. If you use a different structure (e.g. Expo in a `mobile/` subfolder), run the commands from that folder instead.

For **Moro**, keep the bundle ID consistent everywhere (e.g. `com.yourcompany.moro`) in:

- `app.json` / `app.config.js`  
- Apple Developer / App Store Connect  
- EAS (it will use the app config by default)

That way simulator, TestFlight, and App Store all use the same app identity.
