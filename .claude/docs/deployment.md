# Custom Domain Deployment Guide

This guide walks through deploying a full-stack application with a custom domain across Vercel (frontend), Railway (backend), and your DNS provider (Namecheap).

## Prerequisites

- A domain purchased from Namecheap (or similar DNS provider)
- Frontend deployed on Vercel
- Backend deployed on Railway
- Database (Neon/MongoDB Atlas) already set up and connected

---

## Part 1: Root Domain Setup

Use this approach if you're deploying your primary project and want to use the root domain (e.g., `example.com`).

### Step 1: Add Custom Domain to Vercel (Frontend)

1. Go to your **Vercel project dashboard**
2. Settings → **Domains**
3. Click **Add** or **Add Domain**
4. Enter your domain: `example.com`
5. Vercel will show you a **CNAME record** to add to Namecheap
   - Example: `cname.vercel-dns.com`

**Note:** Keep this tab open or write down the CNAME value.

### Step 2: Add Custom Domain to Railway (Backend)

1. Go to your **Railway project**
2. Go to your backend **service** → Settings
3. Look for **Public Networking** section
4. Click **+ Custom Domain**
5. Enter your domain: `example.com`
6. Railway will show you:
   - A **CNAME record** (e.g., `xxxxx.up.railway.app`)
   - A **TXT record** for domain verification (e.g., `railway-verify=...`)

**Note:** Write down both values. You'll need them in the next step.

⚠️ **Important:** If Railway shows two separate custom domains, **delete the old one** to avoid conflicts. Keep only the new one.

### Step 3: Add DNS Records to Namecheap

1. Log into **Namecheap**
2. Go to **Domain List** → Find your domain → Click **Manage**
3. Click the **Advanced DNS** tab

#### Add Vercel CNAME Record:
1. Click **Add Record**
2. **Type:** CNAME Record
3. **Host:** `@` (represents the root domain)
4. **Value:** `cname.vercel-dns.com` (from Vercel)
5. **TTL:** 3600
6. Click checkmark to save

#### Add Railway CNAME Record:
1. Click **Add Record**
2. **Type:** CNAME Record
3. **Host:** `api`
4. **Value:** `xxxxx.up.railway.app` (from Railway)
5. **TTL:** 3600
6. Click checkmark to save

#### Add Railway TXT Record (for SSL verification):
1. Click **Add Record**
2. **Type:** TXT Record
3. **Host:** `_railway-verify`
4. **Value:** `railway-verify=...` (from Railway)
5. **TTL:** 3600
6. Click checkmark to save

#### Save All Changes:
- Scroll to the top
- Click the green **Save All Changes** button

### Step 4: Update Environment Variables

#### In Vercel (Frontend):
1. Settings → **Environment Variables**
2. Find or create `VITE_API_URL`
3. Set to: `https://api.example.com/api`
4. Redeploy the frontend (push a commit or use the Redeploy button)

#### In Railway (Backend):
1. Go to your backend service
2. Find or create environment variables:
   ```
   CLIENT_URL=https://example.com
   NODE_ENV=production
   ```
3. Redeploy the backend

### Step 5: Wait for Verification

- DNS propagation: **5-15 minutes**
- Railway SSL certificate issuance: **5-10 minutes after TXT record propagates**
- Total wait time: **15-30 minutes**

**To verify DNS is working:**

```bash
nslookup example.com
nslookup api.example.com
nslookup -type=TXT _railway-verify.example.com
```

All three should return results. Check your Vercel and Railway dashboards for green checkmarks.

---

## Part 2: Subdomain Setup

Use this approach if you want to use a **subdomain** for a new project while keeping your root domain (`example.com`) for another project.

**Example:**
- Root domain: `example.com` (existing project)
- Subdomain: `myapp.example.com` (new project)
- Frontend: `myapp.example.com` (Vercel)
- Backend: `api.myapp.example.com` (Railway)

### Step 1: Add Custom Domain to Vercel (Frontend Subdomain)

1. Go to your **Vercel project dashboard**
2. Settings → **Domains**
3. Click **Add Domain**
4. Enter your subdomain: `myapp.example.com`
5. Vercel will show you a **CNAME record**

**Note:** Keep this value ready.

### Step 2: Add Custom Domain to Railway (Backend Subdomain)

1. Go to your **Railway project** → backend service → Settings
2. Click **+ Custom Domain**
3. Enter: `api.myapp.example.com`
4. Railway will show you:
   - A **CNAME record** (e.g., `xxxxx.up.railway.app`)
   - A **TXT record** (e.g., `_railway-verify.api.myapp`)

**Note:** Save both values.

### Step 3: Add DNS Records to Namecheap

1. Log into **Namecheap**
2. Go to **Domain List** → Your domain → **Manage** → **Advanced DNS** tab

#### Add Vercel CNAME Record:
1. Click **Add Record**
2. **Type:** CNAME Record
3. **Host:** `myapp`
4. **Value:** `cname.vercel-dns.com` (from Vercel)
5. **TTL:** 3600
6. Click checkmark

#### Add Railway CNAME Record:
1. Click **Add Record**
2. **Type:** CNAME Record
3. **Host:** `api.myapp`
4. **Value:** `xxxxx.up.railway.app` (from Railway)
5. **TTL:** 3600
6. Click checkmark

#### Add Railway TXT Record (⚠️ Important for nested subdomains):
1. Click **Add Record**
2. **Type:** TXT Record
3. **Host:** `_railway-verify.api.myapp` ⚠️ **Include the full subdomain path**
4. **Value:** `railway-verify=...` (from Railway)
5. **TTL:** 3600
6. Click checkmark

#### Save All Changes:
- Click the green **Save All Changes** button at the top

### Step 4: Update Environment Variables

#### In Vercel (Frontend):
1. Settings → **Environment Variables**
2. `VITE_API_URL=https://api.myapp.example.com/api`
3. Redeploy

#### In Railway (Backend):
1. Environment variables:
   ```
   CLIENT_URL=https://myapp.example.com
   NODE_ENV=production
   ```
2. Redeploy

### Step 5: Wait and Verify

DNS propagation: **5-15 minutes**

Verify DNS records:

```bash
nslookup myapp.example.com
nslookup api.myapp.example.com
nslookup -type=TXT _railway-verify.api.myapp.example.com
```

Check Vercel and Railway dashboards for green checkmarks.

---

## Troubleshooting

### Domain shows "Not Found" after DNS setup
- **Cause:** DNS hasn't propagated yet
- **Fix:** Wait 15 minutes, then try again. Check with `nslookup` command above.

### Railway shows "Waiting for DNS update"
- **Cause:** TXT record is missing or not verified
- **Fix:** Make sure you added **both** CNAME and TXT records, and that the TXT record host includes the full subdomain path (e.g., `_railway-verify.api.myapp` for subdomains).

### SSL Certificate error (ERR_CERT_COMMON_NAME_INVALID)
- **Cause:** Railway hasn't issued the SSL certificate yet, or TXT record wasn't verified
- **Fix:** Wait another 10 minutes for Railway to issue the certificate. Verify TXT record is correct using `nslookup -type=TXT`.

### Backend returns 404 or is unreachable
- **Cause:** Backend service not running or TXT record not verified
- **Fix:** Check Railway Deployments → view logs for errors. Verify TXT record is propagated.

---

## Summary Checklist

- [ ] Domain purchased and registered
- [ ] Vercel custom domain added (frontend)
- [ ] Railway custom domain added (backend)
- [ ] CNAME record added for Vercel in Namecheap
- [ ] CNAME record added for Railway in Namecheap
- [ ] TXT record added for Railway in Namecheap
- [ ] All DNS records saved in Namecheap
- [ ] Environment variables updated in Vercel
- [ ] Environment variables updated in Railway
- [ ] Frontend and backend redeployed
- [ ] DNS verified with `nslookup` commands
- [ ] Vercel dashboard shows domain verified (green checkmark)
- [ ] Railway dashboard shows domain verified (green checkmarks on CNAME and TXT)
- [ ] Application tested on custom domain
