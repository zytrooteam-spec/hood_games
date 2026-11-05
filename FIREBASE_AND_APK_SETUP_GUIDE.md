# Hood Games - Firebase FCM & Android APK Configuration Guide

This document details the configuration for **Hood Games** (`hoodgames.com`), including Firebase Push Notifications and Android APK generation.

---

## 1. Android Package & App Identity
- **App Name**: `Hood Games`
- **Application ID / Package Name**: `com.hoodgames.app`
- **Capacitor Configuration**: Configured in `capacitor.config.ts` and `android/app/build.gradle`.

---

## 2. Firebase Cloud Messaging (FCM) Setup

To enable live push notifications to mobile devices:

### Step 1: Create or Open Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Create a new Firebase project (e.g., `Hood Games`).

### Step 2: Add Android App
1. Under **Project Overview**, click **Add app** (Android icon).
2. Enter the **Android package name**: `com.hoodgames.app`
3. Enter App nickname: `Hood Games`
4. Click **Register app**.
5. Download **`google-services.json`** and place it in:
   ```
   /Users/apple/Desktop/hood_games/android/app/google-services.json
   ```

### Step 3: Generate Service Account Key for Backend
1. In Firebase Console, go to **Project Settings** (gear icon) -> **Service Accounts**.
2. Click **Generate new private key** -> confirm.
3. Save the downloaded JSON file as:
   ```
   /Users/apple/Desktop/hood_games/firebase-service-account.json
   ```
   *(Alternatively, paste the JSON into `.env.local` as `FIREBASE_SERVICE_ACCOUNT_KEY='{"type":...}'`)*.

---

## 3. How to Build the Android APK

A pre-built working debug APK is already placed in:
- `public/download/hood-games.apk`
- `public/hood-games.apk`

Whenever you want to rebuild a fresh APK after adding your `google-services.json`:

```bash
cd /Users/apple/Desktop/hood_games

# 1. Sync web assets to Android
npx cap copy android

# 2. Build Debug APK using Gradle
cd android && ./gradlew assembleDebug && cd ..

# 3. Copy APK to public download directory
cp android/app/build/outputs/apk/debug/app-debug.apk public/download/hood-games.apk
cp android/app/build/outputs/apk/debug/app-debug.apk public/hood-games.apk
```
Or simply run:
```bash
npm run build:apk
```

---

## 4. Admin Credentials & Environment Configuration

All admin credentials and system parameters are loaded dynamically from `.env.local` (**NEVER hardcoded in source code**):

```env
# Database
MONGODB_URI=mongodb+srv://webnexllc80_db_user:0761071Na@cluster0.dlhnyrp.mongodb.net/hood_games?retryWrites=true&w=majority&appName=Cluster0

# Admin Access (Strictly read from ENV)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=HoodGamesAdmin@2026!
ADMIN_EMAIL=admin@hoodgames.com

# Staff Access
STAFF_USERNAME=staff
STAFF_PASSWORD=HoodStaff@2026!
STAFF_EMAIL=staff@hoodgames.com
```

### Accessing Admin Desk:
- URL: `http://localhost:3007/admin`
- Enter username: `admin`
- Enter password: `HoodGamesAdmin@2026!`

---

## 5. Summary of Implemented Features

1. **Blue Background & Green Buttons**: Custom tailored `#09142a` midnight blue background and `#2cb64e` emerald green CTA buttons matching your exact provided color swatch.
2. **Mobile Navigation (5 Tabs)**:
   - `Home`: Purely explanatory landing showcase.
   - `Games`: Wheel Spin trigger at top, Sunday Cashback Calculator in middle, followed by the full Master Games Grid.
   - `Wallet`: Centered raised prominent glowing green button.
   - `App`: Direct Android APK download station.
   - `Chat Support`: Instant live concierge chat modal.
3. **Unified Cashier Section**: Single modal with `[Deposit Funds]` and `[Redeem / Cashout]` tabs.
4. **Winning of Random Clients Bar**: Smooth marquee ticker with real-time simulated client wins.
5. **5 Dynamic Quick Action Boxes**: Placed directly under the winners ticker, 100% editable from the Admin Desk.
6. **Cashback Calculator**: Formula `(Total Deposit - Total Cashout) * %`, with admin-adjustable rate (5%–20%).
7. **FreeSpin Daily Wheel**: 24-hour interactive spin wheel with sound effects and confetti celebrations.
8. **Admin Chat Support with Labels & Notes**: Full support desk allowing staff to assign custom labels/tags (e.g. VIP, High Roller) and write persistent internal staff notes.
