# API GLOBAL - Debug Send Transfer Issue

## 🔍 STATUS: DIAGNOSTIC LOGS ADDED

**Date:** 2025-11-13
**Issue:** Send Transfer not working via MindCloud API
**Status:** 🟡 DEBUGGING

---

## 1. Diagnostic Logs Added

### Purpose

Added comprehensive console logging to track the exact flow and identify where the transfer process fails or stops.

### Logs Location

**File:** `/src/components/APIGlobalModule.tsx`
**Function:** `handleSendTransfer()`

---

## 2. Debug Logs Implementation

### Entry Point Log

```typescript
console.log('[API GLOBAL] 🚀 handleSendTransfer called');
console.log('[API GLOBAL] 📋 Form data:', {
  selectedAccount,
  amount: transferForm.amount,
  currency: transferForm.currency
});
```

**Purpose:**
- Confirms function is called
- Shows current form state
- Identifies if event fires

### Validation Logs

**1. Account Selection Check**
```typescript
if (!selectedAccount) {
  console.log('[API GLOBAL] ❌ No account selected');
  alert('Please select a custody account');
  return;
}
```

**2. Account Found Check**
```typescript
const account = custodyAccounts.find(a => a.id === selectedAccount);
if (!account) {
  console.log('[API GLOBAL] ❌ Account not found');
  alert('Custody account not found');
  return;
}

console.log('[API GLOBAL] ✅ Account found:', account.accountName);
```

**3. Amount Validation**
```typescript
if (transferForm.amount <= 0) {
  console.log('[API GLOBAL] ❌ Amount is zero or negative');
  alert('Amount must be greater than 0');
  return;
}

console.log('[API GLOBAL] ✅ Amount valid:', transferForm.amount);
```

**4. Balance Check**
```typescript
if (transferForm.amount > account.availableBalance) {
  console.log('[API GLOBAL] ❌ Insufficient balance');
  alert(`Insufficient balance!...`);
  return;
}

console.log('[API GLOBAL] ✅ Balance sufficient, starting transfer process...');
```

### Existing Process Logs

The function already has comprehensive logs for:
- M2 balance validation
- ISO 20022 creation
- API request
- Response handling
- Balance deduction
- Transfer record creation

---

## 3. Console Log Flow

### Expected Console Output

```
[API GLOBAL] 🚀 handleSendTransfer called
[API GLOBAL] 📋 Form data: { selectedAccount: "...", amount: 1000, currency: "USD" }
[API GLOBAL] ✅ Account found: Digital Wallet #1
[API GLOBAL] ✅ Amount valid: 1000
[API GLOBAL] ✅ Balance sufficient, starting transfer process...
[API GLOBAL] 📊 Step 1: Validating M2 balance from Digital Commercial Bank Ltd...
[API GLOBAL] ✅ M2 Balance validated: {...}
[API GLOBAL] 📋 Step 2: Creating ISO 20022 payment instruction...
[API GLOBAL] ✅ ISO 20022 instruction created: {...}
[API GLOBAL] 📤 Sending transfer to MindCloud: {...}
[API GLOBAL] ✅ MindCloud response: {...}
[API GLOBAL] 📊 Response status: 200 OK
[API GLOBAL] ✅ Transfer COMPLETED successfully
[API GLOBAL] 💰 Step 3: Deducting from M2 balance...
[API GLOBAL] ✅ M2 balance updated: {...}
[API GLOBAL] 💰 Balance updated: {...}
```

### Possible Error Outputs

**1. Function Not Called**
```
(No logs appear)
```
**Cause:** Form submit not firing, button disabled, or event not captured

**2. No Account Selected**
```
[API GLOBAL] 🚀 handleSendTransfer called
[API GLOBAL] 📋 Form data: { selectedAccount: "", amount: 1000, currency: "USD" }
[API GLOBAL] ❌ No account selected
```
**Cause:** Dropdown not selected or state not updated

**3. Account Not Found**
```
[API GLOBAL] 🚀 handleSendTransfer called
[API GLOBAL] 📋 Form data: { selectedAccount: "ABC123", amount: 1000, currency: "USD" }
[API GLOBAL] ❌ Account not found
```
**Cause:** Account ID mismatch or custody accounts not loaded

**4. Invalid Amount**
```
[API GLOBAL] 🚀 handleSendTransfer called
[API GLOBAL] 📋 Form data: { selectedAccount: "...", amount: 0, currency: "USD" }
[API GLOBAL] ✅ Account found: Digital Wallet #1
[API GLOBAL] ❌ Amount is zero or negative
```
**Cause:** Amount input is 0 or negative

**5. Insufficient Balance**
```
[API GLOBAL] 🚀 handleSendTransfer called
[API GLOBAL] 📋 Form data: { selectedAccount: "...", amount: 1000000, currency: "USD" }
[API GLOBAL] ✅ Account found: Digital Wallet #1
[API GLOBAL] ✅ Amount valid: 1000000
[API GLOBAL] ❌ Insufficient balance
```
**Cause:** Requested amount exceeds available balance

**6. M2 Validation Fails**
```
[API GLOBAL] 🚀 handleSendTransfer called
[API GLOBAL] 📋 Form data: { selectedAccount: "...", amount: 1000, currency: "USD" }
[API GLOBAL] ✅ Account found: Digital Wallet #1
[API GLOBAL] ✅ Amount valid: 1000
[API GLOBAL] ✅ Balance sufficient, starting transfer process...
[API GLOBAL] 📊 Step 1: Validating M2 balance from Digital Commercial Bank Ltd...
[API GLOBAL] ❌ Error sending transfer: M2 validation failed!...
```
**Cause:** Digital Commercial Bank Ltd file not processed in Bank Audit module

**7. ISO 20022 Creation Fails**
```
...
[API GLOBAL] ✅ M2 Balance validated: {...}
[API GLOBAL] 📋 Step 2: Creating ISO 20022 payment instruction...
[API GLOBAL] ❌ Error sending transfer: ISO 20022 creation failed: ...
```
**Cause:** Error in ISO 20022 store

**8. API Call Fails**
```
...
[API GLOBAL] ✅ ISO 20022 instruction created: {...}
[API GLOBAL] 📤 Sending transfer to MindCloud: {...}
[API GLOBAL] ❌ Error sending transfer: Failed to fetch
```
**Cause:** Network error, CORS, or API unreachable

---

## 4. Debugging Steps

### Step 1: Open Browser Console

**Chrome:**
1. Press F12 or Ctrl+Shift+I (Cmd+Option+I on Mac)
2. Click "Console" tab
3. Clear console (Ctrl+L)

**Firefox:**
1. Press F12 or Ctrl+Shift+K (Cmd+Option+K on Mac)
2. Click "Console" tab
3. Clear console

**Safari:**
1. Enable Developer menu: Preferences → Advanced → Show Develop menu
2. Press Cmd+Option+C
3. Click "Console" tab

### Step 2: Reproduce the Issue

1. Navigate to API GLOBAL module
2. Click "Send Transfer" tab
3. Select a custody account from dropdown
4. Enter transfer amount (e.g., 1000)
5. Click "Send Transfer via MindCloud API" button
6. Watch console for logs

### Step 3: Analyze Console Output

**Check for:**
- Is `handleSendTransfer called` log appearing?
- What is the form data showing?
- At which validation does it stop?
- Are there any error messages?
- Are there any network errors?

### Step 4: Common Issues and Solutions

**Issue 1: No logs appear**
```
Problem: Function not being called
Solutions:
  - Check if button is disabled
  - Check if account is selected
  - Check if amount is entered
  - Verify form onSubmit is connected
```

**Issue 2: "No account selected"**
```
Problem: selectedAccount is empty
Solutions:
  - Check if custody accounts loaded
  - Check if dropdown onChange works
  - Check handleAccountSelect function
  - Verify custodyStore.getAccounts()
```

**Issue 3: "Amount is zero or negative"**
```
Problem: transferForm.amount is 0 or negative
Solutions:
  - Check if amount input value binding works
  - Verify onChange handler
  - Check if amount is being parsed correctly
  - Ensure input type="number" is used
```

**Issue 4: "M2 validation failed"**
```
Problem: Digital Commercial Bank Ltd file not processed
Solutions:
  - Go to Bank Audit module
  - Upload and process Digital Commercial Bank Ltd file
  - Verify M2 money is extracted
  - Check iso20022Store.extractM2Balance()
```

**Issue 5: Network error**
```
Problem: Cannot reach MindCloud API
Solutions:
  - Check internet connection
  - Verify API URL is correct
  - Check for CORS issues
  - Test API connection button
```

---

## 5. Testing Checklist

### Pre-Transfer Checks

- [ ] Custody accounts loaded (check dropdown)
- [ ] Account selected (dropdown shows selection)
- [ ] Amount entered (positive number)
- [ ] Amount within balance (check account balance)
- [ ] Digital Commercial Bank Ltd processed (Bank Audit module)
- [ ] M2 balance available (check overview tab)

### During Transfer

- [ ] Console shows "handleSendTransfer called"
- [ ] Form data logged correctly
- [ ] All validations pass (✅ logs)
- [ ] No error alerts appear
- [ ] "Processing Transfer..." shows on button
- [ ] Loading spinner appears

### After Transfer

- [ ] Success or error message appears
- [ ] Transfer added to history
- [ ] Account balance updated
- [ ] M2 balance deducted
- [ ] Form resets (amount back to 0)

---

## 6. API Connection Test

### Test MindCloud API

**Button:** "Test Connection" (in Overview tab)

**Expected Response:**
```
Status: ✅ CONNECTED
Message: All systems operational
```

**If fails:**
```
Status: ❌ ERROR
Message: Unable to connect to MindCloud API
```

### Manual API Test

```javascript
// In browser console
fetch('https://api.mindcloud.co/api/job/8wZsHuEIK3xu/run?key=831b9d45-d9ec-4594-80a3-3126a700b60f&force=true', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    "CashTransfer.v1": {
      "SendingName": "TEST",
      "SendingAccount": "TEST",
      "ReceivingName": "TEST",
      "ReceivingAccount": "TEST",
      "Datetime": new Date().toISOString(),
      "Amount": "1.00",
      "ReceivingCurrency": "USD",
      "SendingCurrency": "USD",
      "Description": "TEST",
      "TransferRequestID": "TEST_" + Date.now(),
      "ReceivingInstitution": "TEST",
      "SendingInstitution": "TEST",
      "SendingInstitutionWebsite": "https://test.com/",
      "method": "API",
      "purpose": "TEST",
      "source": "DAES_CORE_SYSTEM"
    }
  })
})
.then(r => r.json())
.then(d => console.log('API Response:', d))
.catch(e => console.error('API Error:', e));
```

---

## 7. Known Requirements

### Prerequisites for Transfer

**1. Custody Account Created**
- Go to Custody Accounts module
- Create at least one account
- Fund the account with balance

**2. Digital Commercial Bank Ltd File Processed**
- Go to Bank Audit module
- Upload Digital Commercial Bank Ltd file
- Process file to extract M2 money
- Verify digital signatures extracted

**3. Form Filled Correctly**
- Account selected: ✅
- Amount entered: ✅ (positive number)
- Amount within balance: ✅
- Description filled: ✅ (auto-filled)
- Purpose filled: ✅ (auto-filled)

**4. Network Connection**
- Internet connected: ✅
- MindCloud API reachable: ✅
- No firewall blocking: ✅

---

## 8. Build Status

### Build Information

```
APIGlobalModule:
Before: 37.04 kB (9.68 kB gzipped)
After:  37.60 kB (9.81 kB gzipped)

Debug logs added: +0.56 kB (+0.13 kB gzipped)

Build time: 10.31s
Status: ✓ SUCCESS
```

### Changes Made

**Added:**
- 1 entry log (function called)
- 1 form data log
- 4 validation logs (✅/❌)
- 5 console.log statements total

**Impact:**
- +0.56 kB uncompressed
- +0.13 kB gzipped
- Negligible performance impact
- Helps debugging significantly

---

## 9. Next Steps

### If Issue Persists

**1. Capture Console Logs**
- Copy all console output
- Include timestamps
- Note any errors

**2. Check Network Tab**
- Open Network tab in DevTools
- Filter by "Fetch/XHR"
- Look for MindCloud API call
- Check request/response

**3. Verify State**
- Check React DevTools
- Inspect component state
- Verify selectedAccount value
- Check transferForm values

**4. Test Minimal Case**
- Create new custody account
- Add minimal balance (e.g., 10 USD)
- Process Digital Commercial Bank Ltd file
- Try transfer with small amount (e.g., 1 USD)

---

## 10. Summary

### ✅ DEBUG LOGS IMPLEMENTED

**Features Added:**
- ✅ Entry point logging
- ✅ Form data logging
- ✅ Validation step logging
- ✅ Success/error indicators
- ✅ Account found confirmation
- ✅ Amount validation
- ✅ Balance check confirmation
- ✅ Process start indicator

**Debugging Benefits:**
- ✅ See exact execution flow
- ✅ Identify where it stops
- ✅ Track form state
- ✅ Validate each step
- ✅ Catch errors early
- ✅ Easier troubleshooting

**Build:**
- ✅ SUCCESS
- ✅ +0.56 kB (+0.13 kB gzipped)
- ✅ No breaking changes
- ✅ Ready for testing

---

**NEXT ACTION: Open browser console and attempt transfer to see diagnostic logs**

---

**END OF DOCUMENTATION**

**Status:** 🟡 DEBUGGING MODE
**Date:** 2025-11-13
**Module:** API GLOBAL - Send Transfer Debug
