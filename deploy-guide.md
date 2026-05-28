# Java Vault — Deployment Guide
# Deploy Live in 10 Minutes — 100% Free

---

## WHAT YOU NEED
- A phone or computer with internet
- An email address
- 10 minutes

---

## STEP 1 — Create a GitHub Account (2 minutes)

1. Open your browser and go to: **github.com**
2. Click **Sign Up**
3. Enter your email, create a password, choose a username
4. Verify your email
5. You now have a GitHub account (free forever)

---

## STEP 2 — Create a New Repository (2 minutes)

1. After signing in to GitHub, click the **+** button (top right)
2. Click **New repository**
3. Name it: `javavault`
4. Make sure it says **Public**
5. Check the box: **Add a README file**
6. Click **Create repository**

---

## STEP 3 — Upload Your Files (3 minutes)

1. Inside your new repository, click **Add file** → **Upload files**
2. Upload these 2 files from this download:
   - `javavault.html` ← the main app
   - `javavault-landing.html` ← the marketing page
3. At the bottom, click **Commit changes**
4. Your files are now on GitHub

---

## STEP 4 — Deploy to Vercel (3 minutes)

1. Go to: **vercel.com**
2. Click **Sign Up** → choose **Continue with GitHub**
3. Allow Vercel to access your GitHub
4. Click **Add New Project**
5. Find your `javavault` repository and click **Import**
6. Leave all settings as default
7. Click **Deploy**
8. Wait 30 seconds...
9. Vercel gives you a FREE live URL like: `javavault.vercel.app`

---

## YOUR LIVE URLS

After deployment your app is live at:
- **App:** https://javavault.vercel.app/javavault.html
- **Landing Page:** https://javavault.vercel.app/javavault-landing.html

---

## STEP 5 — Get a Custom Domain (Optional — $12/year)

1. Go to **namecheap.com** or **godaddy.com**
2. Search for `javavault.com` or `javavaultapp.com`
3. Buy the domain (~$12/year)
4. In Vercel → your project → Settings → Domains
5. Add your domain and follow the instructions
6. Your app is now at: **www.javavault.com**

---

## STEP 6 — Set Up Firebase (Real Auth + Cloud Sync)

1. Go to: **console.firebase.google.com**
2. Click **Create a project** → name it `javavault`
3. Go to **Project Settings** → **Your apps** → click **Web** (</>)
4. Register your app, copy the config object
5. Open `javavault.html` in a text editor
6. Find `FIREBASE_CONFIG` near the top of the script
7. Paste your config values
8. Go to **Authentication** → **Sign-in method**
   - Enable: Email/Password, Google, Phone
9. Go to **Firestore Database** → **Create database** → Production mode
10. Re-upload `javavault.html` to GitHub → Vercel auto-deploys

---

## STEP 7 — Set Up Stripe Payments

1. Go to: **stripe.com** → Create free account
2. Go to **Developers** → **API Keys**
3. Copy your **Publishable key** (starts with pk_live_)
4. Open your app → Any invoice → **Pay Now** → **Card tab**
5. Paste your Stripe key when prompted
6. Done — you can now accept card payments

---

## STEP 8 — Set Up Paystack (Nigeria/Africa)

1. Go to: **paystack.com** → Create free account
2. Go to **Settings** → **API Keys & Webhooks**
3. Copy your **Public Key**
4. In Java Vault → My Business → add Paystack key
5. Done — clients can pay with cards, bank, USSD, mobile money

---

## MARKETING — How to Get Your First 100 Users

### Free Channels (Start Here)
1. **Facebook Groups** — Join "Plumbers Network", "Electricians USA", "HVAC Technicians"
   - Post: "I built an app for tradespeople — free 7-day trial"
   - Don't spam — post value, let people ask

2. **WhatsApp Groups** — Trade groups in your area
   - Send: "This app saves me 3 hours of paperwork every week"

3. **TikTok/Instagram** — Record a 30-second video
   - Show: "How I send a professional invoice from my phone in 60 seconds"
   - Caption: "Java Vault — link in bio"

4. **Google** — Ask every client for a Google review
   - More reviews = more organic traffic

### Paid Channels (After First 20 Users)
5. **Facebook Ads** — $5/day targeting:
   - Age 28-55, Self-employed, Interests: plumbing/electrical/HVAC
   - Location: US, UK, Canada, Australia, Nigeria

6. **Google Ads** — Keywords:
   - "invoice app for plumbers"
   - "estimate software electricians"
   - "HVAC business management app"

---

## REVENUE PROJECTIONS

| Users | Plan | Monthly Revenue |
|-------|------|----------------|
| 100   | Pro $49 | $4,900/month |
| 500   | Pro $49 | $24,500/month |
| 1,000 | Mixed avg $45 | $45,000/month |
| 2,000 | Mixed avg $45 | $90,000/month |

You need **0.03% of the 6.5 million solo tradespeople** to hit $90K/month.

---

## SUPPORT

If you need help with any step:
- Ask Claude (me) — I know the entire codebase
- Firebase docs: firebase.google.com/docs
- Vercel docs: vercel.com/docs
- Stripe docs: stripe.com/docs

---

*Java Vault — Built For The Trade. Backed By Technology.*

---

## NEW: PWA Installation (Play Store Alternative)

Java Vault is now a Progressive Web App (PWA).
This means users can install it like a native app WITHOUT the Play Store.

### How users install Java Vault on Android:
1. Open javavault.vercel.app in Chrome
2. A banner appears: "Install Java Vault"
3. Tap Install
4. App appears on home screen with Java Vault icon
5. Works offline completely

### How users install on iPhone:
1. Open in Safari
2. Tap the Share button
3. Tap "Add to Home Screen"
4. Done - app on home screen

### Files needed for deployment (upload ALL of these):
- javavault.html
- javavault-landing.html
- sw.js (Service Worker - enables offline)
- manifest.json (PWA manifest - enables installation)

---

## NEW: Flutterwave Setup (Nigeria/Africa)

1. Go to: dashboard.flutterwave.com
2. Create free account
3. Go to Settings -> API Keys
4. Copy your Public Key (starts with FLWPUBK_)
5. In Java Vault -> My Business -> paste Flutterwave key
6. Clients can now pay with cards, bank transfer, USSD, mobile money

Supported currencies: NGN, GHS, KES, ZAR, USD, GBP, EUR and more.

---

## NEW: Multi-Currency

Set your currency in My Business -> Currency dropdown.
Supported: USD, NGN, GBP, EUR, GHS, KES, ZAR, CAD, AUD, INR

---

## NEW: Dark/Light Mode

Users can toggle between dark and light mode from the sidebar.
Preference is saved automatically.

