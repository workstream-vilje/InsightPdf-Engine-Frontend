# Payment Flow Implementation

## Overview
Complete user onboarding flow with plan selection, authentication, and payment simulation.

## User Journey

### 1. Plan Selection (Home Page)
**Route:** `/`
- User lands on home page
- Sees 3 RAG plan cards: Basic ($9/mo), Medium ($29/mo), Advanced ($79/mo)
- Each card shows:
  - Plan name and tagline
  - Price
  - Accuracy, Speed, Cost Efficiency bars
  - Top 5 features
  - "Select Plan" button
- User clicks "Select Plan" on their preferred plan
- Plan is saved to `localStorage` via `cartStore.js`
- User is redirected to signup page

### 2. Authentication (Signup/Login)
**Routes:** `/auth/signup` → `/auth/login`

#### Signup Flow:
- User enters: name, email, password, confirm password
- OTP is sent to email
- User verifies OTP
- Account is created
- Redirects to login page

#### Login Flow:
- User enters: email, password
- Authentication successful
- **Key Check:** System checks if a plan was selected
  - If YES → Redirect to `/checkout`
  - If NO → Redirect to `/` (home page)

### 3. Payment (Checkout Page)
**Route:** `/checkout`

#### Payment Form:
- Name on card
- Card number
- Expiry date
- CVV

#### Order Summary:
- Selected plan details
- Price breakdown
- Total amount
- Renewal information

#### Payment Processing:
- User fills payment form
- Clicks "Confirm & Pay $X.00"
- System simulates 1.5 second payment processing
- Shows "Processing..." state
- After delay, shows success screen
- Cart is cleared from localStorage

### 4. Success & Workspace Access
**Routes:** `/checkout` (success screen) → `/workspace`

#### Success Screen:
- Checkmark icon
- "You're all set!" message
- Selected plan details
- "Go to Workspace" button
- "Browse other plans" link

#### Workspace Access:
- User clicks "Go to Workspace"
- Redirected to `/workspace`
- Full platform access with selected plan features

## Technical Implementation

### Files Created/Modified

#### New Files:
- `src/Plans/cartStore.js` - Plan selection and cart management
- `src/Plans/PlansPage.jsx` - Plans listing page (now on home)
- `src/Plans/plans.module.css` - Plans styling
- `src/Plans/CartPage.jsx` - Cart review page
- `src/Plans/cart.module.css` - Cart styling
- `src/Plans/CheckoutPage.jsx` - Payment page
- `src/Plans/checkout.module.css` - Checkout styling
- `src/app/plans/page.jsx` - Plans route wrapper
- `src/app/cart/page.jsx` - Cart route wrapper
- `src/app/checkout/page.jsx` - Checkout route wrapper

#### Modified Files:
- `src/app/page.js` - Added plan cards to home page
- `src/app/page.module.css` - Added plans section styling
- `src/app/auth/AuthPage.jsx` - Added plan check and checkout redirect
- `src/utils/routepaths.js` - Added PLANS, CART, CHECKOUT routes

### Data Flow

#### Cart Storage (localStorage):
```javascript
{
  id: "basic|medium|advanced",
  name: "Basic|Medium|Advanced",
  price: 9|29|79,
  color: "#c48a3a|#7c5cbf|#1a7a5e",
  features: [...],
  endpoints: { upload: "...", query: "..." },
  accuracy: 60|80|92,
  speed: 95|70|45,
  cost: 95|55|20
}
```

#### Auth Flow:
1. User selects plan → `setCart(plan)` saves to localStorage
2. User signs up → Account created
3. User logs in → `getCart()` checks if plan exists
4. If plan exists → Redirect to `/checkout`
5. If no plan → Redirect to `/` (home)

### Payment Simulation

**File:** `src/Plans/CheckoutPage.jsx`

```javascript
const handleSubmit = (e) => {
  e.preventDefault();
  setStatus("processing");
  // Dummy payment — simulate a 1.5s delay then succeed
  setTimeout(() => {
    setStatus("success");
    clearCart();
  }, 1500);
};
```

- No real payment processing
- Simulates network delay
- Shows loading state
- Clears cart on success
- Ready for real payment API integration

## Future Payment Integration

To integrate real payment processing:

1. **Replace dummy payment:**
   ```javascript
   // Instead of setTimeout, call real payment API
   const response = await paymentApi.processPayment({
     planId: plan.id,
     cardDetails: form,
     userId: currentUser.id,
   });
   ```

2. **Add payment provider:**
   - Stripe
   - PayPal
   - Square
   - etc.

3. **Backend integration:**
   - Create `/api/v1/payment/process` endpoint
   - Store subscription in database
   - Link plan to user account
   - Handle webhooks for payment status

4. **Error handling:**
   - Add retry logic
   - Handle declined cards
   - Show error messages
   - Allow form resubmission

## Security Notes

- Payment form is dummy (no real card processing)
- In production, use PCI-compliant payment provider
- Never store card details in localStorage
- Use HTTPS for all payment pages
- Implement CSRF protection
- Validate all inputs server-side

## Testing the Flow

1. Go to `http://localhost:3000`
2. Click "Select Plan" on any card
3. Sign up with new email
4. Verify OTP
5. Log in with credentials
6. Fill dummy payment form
7. Click "Confirm & Pay"
8. See success screen
9. Click "Go to Workspace"
10. Access workspace with selected plan

## Troubleshooting

**Issue:** Redirects to home instead of checkout after login
- **Cause:** No plan selected in localStorage
- **Fix:** Make sure to click "Select Plan" on home page first

**Issue:** Can't access checkout page directly
- **Cause:** Not authenticated or no plan selected
- **Fix:** Go through full flow: home → select plan → signup → login → checkout

**Issue:** Payment form not submitting
- **Cause:** Missing required fields
- **Fix:** Fill all fields: name, card number, expiry, CVV
