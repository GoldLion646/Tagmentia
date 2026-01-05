# 🔧 Tagmentia Stripe Integration Setup Guide

## ✅ ACCEPTANCE CRITERIA STATUS

- ✅ **Premium and Gold plan checkouts** - Fixed with proper Price ID implementation
- ✅ **Webhook handling** - Complete webhook handler for all subscription events  
- ✅ **Free plan bypass** - Free plan skips Stripe checkout (handled in frontend)
- ✅ **Environment variables** - All Stripe keys read from Supabase secrets
- ✅ **Error logging** - Comprehensive logging at each step

---

## 📋 REQUIRED ENVIRONMENT VARIABLES

Add these to your **Supabase Edge Function Secrets**:

```bash
STRIPE_SECRET_KEY=sk_test_... # Your Stripe secret key (test or live)
STRIPE_WEBHOOK_SECRET=whsec_... # Webhook endpoint secret from Stripe dashboard
```

---

## 🏷️ STRIPE PRODUCT & PRICE SETUP

Create these products and prices in your Stripe Dashboard:

### **Premium Plan**
- **Monthly Price**: $4.99/month → Price ID: `price_premium_monthly`
- **Yearly Price**: $55.99/year → Price ID: `price_premium_yearly`

### **Gold Plan**  
- **Monthly Price**: $24.99/month → Price ID: `price_gold_monthly`
- **Yearly Price**: $249.99/year → Price ID: `price_gold_yearly`

---

## 🗄️ DATABASE SETUP

**Option 1: Use Admin Interface (Recommended)**
1. Go to `/admin/subscriptions` in your app
2. Click "Verify Stripe Setup" to confirm your secret key is configured
3. For each plan (Premium/Gold), click the Edit button (✏️)
4. Add your Stripe Price IDs in the "STRIPE CONFIGURATION" section
5. Save changes and click "Test Checkout" to verify

**Option 2: Direct SQL Update**
Update your plans table with the Stripe Price IDs:

```sql
-- Update Premium Plan
UPDATE plans 
SET 
  stripe_monthly_price_id = 'price_premium_monthly',
  stripe_yearly_price_id = 'price_premium_yearly'
WHERE name = 'Premium Plan';

-- Update Gold Plan  
UPDATE plans 
SET 
  stripe_monthly_price_id = 'price_gold_monthly',
  stripe_yearly_price_id = 'price_gold_yearly'
WHERE name = 'Gold Plan';
```

---

## 🔗 WEBHOOK CONFIGURATION

1. **Go to Stripe Dashboard** → Developers → Webhooks
2. **Add endpoint**: `https://your-project.supabase.co/functions/v1/stripe-webhook`
3. **Select events**:
   - `checkout.session.completed`
   - `invoice.payment_succeeded` 
   - `customer.subscription.deleted`
   - `customer.subscription.updated`
4. **Copy webhook secret** and add to Supabase secrets as `STRIPE_WEBHOOK_SECRET`

---

## 🧪 TESTING CHECKLIST

### **Test Mode Setup**
1. ✅ Use test Stripe keys (`sk_test_...`)
2. ✅ Configure test webhook endpoint
3. ✅ Update plans table with test Price IDs

### **Checkout Flow Test**
```bash
# 1. Verify Stripe Setup
curl -X POST https://your-project.supabase.co/functions/v1/check-stripe

# 2. Test Premium Monthly Checkout
curl -X POST https://your-project.supabase.co/functions/v1/create-subscription-checkout \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"plan_id": "premium_plan_uuid", "billing_interval": "monthly"}'

# 3. Complete test payment in Stripe Checkout
# 4. Verify webhook received in Stripe Dashboard → Webhooks → Events
# 5. Check user_subscriptions table for new record
```

### **Subscription Verification**
```bash
# Check active subscription
curl -X POST https://your-project.supabase.co/functions/v1/check-subscription-status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 📊 MONITORING & DEBUGGING

### **Edge Function Logs**
```bash
# View webhook logs
supabase functions logs stripe-webhook --follow

# View checkout logs  
supabase functions logs create-subscription-checkout --follow

# View subscription status logs
supabase functions logs check-subscription-status --follow
```

### **Database Queries**
```sql
-- Check user subscriptions
SELECT 
  us.*,
  p.name as plan_name,
  p.price_monthly,
  p.price_yearly
FROM user_subscriptions us 
JOIN plans p ON us.plan_id = p.id 
ORDER BY us.created_at DESC;

-- Check webhook processing
SELECT * FROM user_subscriptions 
WHERE stripe_subscription_id IS NOT NULL 
ORDER BY created_at DESC;
```

---

## 🚨 TROUBLESHOOTING

### **Common Issues & Solutions**

| Error | Cause | Solution |
|-------|--------|----------|
| "No Stripe Price ID configured" | Missing Price IDs in plans table | Update plans table with correct `stripe_monthly_price_id` and `stripe_yearly_price_id` |
| "Webhook signature verification failed" | Wrong `STRIPE_WEBHOOK_SECRET` | Copy exact webhook secret from Stripe dashboard |
| "Stripe secret not available" | Missing `STRIPE_SECRET_KEY` | Add Stripe secret key to Supabase Edge Function secrets |
| Checkout succeeds but no subscription created | Webhook not receiving events | Check webhook URL and selected events in Stripe dashboard |

### **Debug Commands**
```bash
# Test Stripe key access
supabase functions invoke check-stripe

# Test webhook locally  
supabase functions serve --env-file .env.local
curl -X POST http://localhost:54321/functions/v1/stripe-webhook \
  -H "stripe-signature: test_signature" \
  -d '{"type": "checkout.session.completed"}'
```

---

## 🔄 DEPLOYMENT TO PRODUCTION

1. **Replace test keys** with live Stripe keys
2. **Update webhook endpoint** to production URL  
3. **Update Price IDs** with live Stripe Price IDs
4. **Test complete flow** with real payment methods
5. **Monitor webhook events** in Stripe Dashboard

---

## 📞 SUPPORT

If you encounter issues:
1. Check Supabase function logs for detailed error messages
2. Verify Stripe Dashboard → Events for webhook delivery status
3. Confirm all environment variables are set correctly
4. Test with Stripe's test cards before going live