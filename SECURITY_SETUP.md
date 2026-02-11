# Security Setup Guide

## ✅ Fixed Security Issues

The following files have been updated to use environment variables instead of hardcoded keys:

### Critical (Fixed):
- ✅ `scripts/rerun-matching.js` - Removed **SERVICE ROLE KEY** (most critical)
- ✅ `lib/mcp-supabase.ts` - Removed anon key
- ✅ `lib/supabase.ts` - Removed anon key  
- ✅ `screens/ProfileScreen.tsx` - Removed anon key

### Script Files (Less Critical - Update Later):
These script files still have hardcoded anon keys, but they're not part of the deployed app:
- `scripts/generate-all-embeddings-final.js`
- `scripts/generate-embeddings-direct.js`
- `scripts/generate-embeddings-fixed.js`
- `scripts/generate-all-embeddings.js`
- `scripts/final-setup-and-demo.js`
- `scripts/generate-embeddings-and-match.js`
- `scripts/setup-test-profiles.js`
- `scripts/create-all-profiles-complete.js`

## 🔐 Required Environment Variables

### For React Native App (Client-Side)

Create a `.env.local` file in the project root with:

```bash
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://hgllvhohhyamsbljekrd.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

**Note:** In Expo/React Native, environment variables must be prefixed with `EXPO_PUBLIC_` to be accessible in client-side code.

### For Server-Side Scripts

Add to `.env.local`:

```bash
# Service Role Key (NEVER commit this!)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

## 📍 Where to Get Your Keys

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `hgllvhohhyamsbljekrd`
3. Go to **Project Settings** > **API**
4. Find:
   - **anon/public key** → Use for `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → Use for `SUPABASE_SERVICE_ROLE_KEY` (server-side only!)

## ⚠️ Important Security Notes

1. **Service Role Key is DANGEROUS** - It bypasses all Row Level Security (RLS) policies
   - Only use in server-side scripts
   - Never commit to git
   - Never use in client-side code
   - If exposed, rotate it immediately in Supabase Dashboard

2. **Anon Key is Public** - Safe to use in client-side code, but still:
   - Don't commit if you want to keep project URL private
   - RLS policies protect your data

3. **`.env.local` is gitignored** - Your secrets are safe

## 🚀 Next Steps

1. Create `.env.local` file with your actual keys
2. Restart your Expo dev server: `npm start`
3. For scripts, ensure `.env.local` exists before running them
4. Consider rotating the service role key if it was exposed in git history

## 🔄 If Keys Were Exposed

If your service role key was already committed to git:

1. **Immediately rotate the key** in Supabase Dashboard:
   - Project Settings > API > Service Role Key > Reset

2. **Remove from git history** (if needed):
   ```bash
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch scripts/rerun-matching.js" \
     --prune-empty --tag-name-filter cat -- --all
   ```

3. **Force push** (coordinate with team):
   ```bash
   git push origin --force --all
   ```
