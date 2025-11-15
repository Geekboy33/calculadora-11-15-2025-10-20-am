# API GLOBAL Module - Complete Guide

## Overview

The **API GLOBAL** module is a complete M2 Money Transfer system that integrates with MindCloud API to send international transfers from custody accounts to external recipients.

## Features

### 1. **Overview Dashboard**
- **Completed Transfers**: Total count and amount sent
- **Pending/Processing**: Active transfers in progress
- **Failed Transfers**: Failed transaction tracking
- **Custody Accounts**: Available sending accounts

### 2. **Send Transfer**
- Select custody account as sender
- Pre-configured recipient (G.I.D.I.F.A)
- Amount input (USD/EUR)
- Custom description and purpose
- Real-time balance validation
- Direct integration with MindCloud API

### 3. **Transfer History**
- Complete transaction log
- Status tracking (PENDING, PROCESSING, COMPLETED, FAILED)
- Detailed transaction information
- Export capability

## Configuration

### Receiving Institution Details

**Fixed Configuration:**
- **Account Name**: GLOBAL INFRASTRUCTURE DEVELOPMENT AND INTERNATIONAL FINANCE AGENCY (G.I.D.I.F.A)
- **User Name**: gidifa1
- **Account Number**: 23890111
- **Institution**: APEX CAPITAL RESERVE BANK INC

### Sending Institution

**Auto-filled from Custody Accounts:**
- **Institution**: Digital Commercial Bank Ltd
- **Account Name**: From selected custody account
- **Account Number**: From selected custody account
- **Available Balance**: Real-time calculation

## How to Use

### Step 1: Create Custody Accounts

Navigate to **Custody Accounts** module and create accounts with:
- Account Name
- Account Number
- Currency (USD/EUR)
- Initial Balance

### Step 2: Access API GLOBAL

Click on **API GLOBAL** in the navigation menu.

### Step 3: Send a Transfer

1. Go to **Send Transfer** tab
2. Select a custody account from dropdown
3. Enter transfer amount
4. Modify description if needed (default: "M2 MONEY TRANSFER")
5. Modify purpose if needed (default: "INFRASTRUCTURE DEVELOPMENT")
6. Click **Send Transfer via MindCloud API**
7. Confirm the transfer details

### Step 4: Monitor Transfer

1. Go to **History** tab
2. View all transfers with status
3. Check MindCloud API response
4. Monitor balance deductions

## API Integration

### MindCloud API Endpoint

```
POST https://api.mindcloud.co/api/job/8wZsHuEIK3xu/run
```

**Query Parameters:**
- `key`: 831b9d45-d9ec-4594-80a3-3126a700b60f
- `force`: true

### Payload Structure

```json
{
  "CashTransfer.v1": {
    "SendingName": "[Custody Account Name]",
    "SendingAccount": "[Custody Account Number]",
    "ReceivingName": "GLOBAL INFRASTRUCTURE DEVELOPMENT AND INTERNATIONAL FINANCE AGENCY (G.I.D.I.F.A)",
    "ReceivingAccount": "23890111",
    "Datetime": "2025-MM-DDTHH:MM:SS.000Z",
    "Amount": "XXXXX.00",
    "ReceivingCurrency": "USD",
    "SendingCurrency": "USD",
    "Description": "M2 MONEY TRANSFER",
    "TransferRequestID": "TXN_XXXXX_XXXXX",
    "ReceivingInstitution": "APEX CAPITAL RESERVE BANK INC",
    "SendingInstitution": "Digital Commercial Bank Ltd",
    "method": "API",
    "purpose": "INFRASTRUCTURE DEVELOPMENT",
    "source": "DAES_CORE_SYSTEM"
  }
}
```

### Response Handling

- **Success (200)**: Transfer marked as COMPLETED
- **Error (4xx/5xx)**: Transfer marked as FAILED
- All responses are logged in transfer history

## Transfer ID Format

```
TXN_[TIMESTAMP]_[RANDOM]
```

Example: `TXN_1699564800000_ABC123XYZ`

## Balance Management

### Automatic Deduction

When a transfer is **COMPLETED**:
1. Amount is deducted from `availableBalance`
2. Amount is added to `reservedBalance`
3. Custody account is updated immediately

### Validation

Before sending:
- Checks if amount > 0
- Checks if amount <= availableBalance
- Prevents overdraft

## Status Flow

```
PENDING → PROCESSING → COMPLETED
                    ↓
                  FAILED
```

### Status Definitions

- **PENDING**: Transfer queued, not yet sent
- **PROCESSING**: Transfer sent to MindCloud API, awaiting response
- **COMPLETED**: Transfer successfully processed by MindCloud
- **FAILED**: Transfer rejected or error occurred

## Data Storage

### LocalStorage Keys

- `api_global_transfers`: All transfer records

### Transfer Record Structure

```typescript
{
  id: string;
  transfer_request_id: string;
  sending_name: string;
  sending_account: string;
  sending_institution: string;
  receiving_name: string;
  receiving_account: string;
  receiving_institution: string;
  amount: number;
  sending_currency: string;
  receiving_currency: string;
  description: string;
  datetime: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  response?: any;
  created_at: string;
}
```

## Statistics Calculation

### Total Sent
Sum of all COMPLETED transfers

### Pending Transfers
Count of PENDING + PROCESSING transfers

### Completed Transfers
Count of COMPLETED transfers

### Failed Transfers
Count of FAILED transfers

## Error Handling

### Common Errors

1. **No custody account selected**
   - Message: "Please select a custody account"
   - Solution: Select an account from dropdown

2. **Amount is zero or negative**
   - Message: "Amount must be greater than 0"
   - Solution: Enter a valid positive amount

3. **Insufficient balance**
   - Message: Shows available vs requested amounts
   - Solution: Reduce amount or use different account

4. **API connection error**
   - Message: Network error details
   - Solution: Check internet connection, retry

## UI Components

### Color Coding

- **Green**: Completed transfers, available balance
- **Blue**: Processing transfers, info elements
- **Yellow**: Pending transfers, warnings
- **Red**: Failed transfers, errors
- **Purple**: System info, accent elements

### Icons

- 🌐 Globe: Module identity
- 📤 Send: Transfer action
- 🔒 Lock: Security/custody
- 💵 Dollar: Currency/amount
- ⏰ Clock: Time/history
- ✅ CheckCircle: Success
- ⚠️ AlertCircle: Warning/error
- 📊 Activity: Overview/stats
- 🔄 Refresh: Reload data
- 📈 TrendingUp: Growth/stats
- 🏢 Building: Institution
- 👤 User: Account holder
- 📄 FileText: Description/docs
- ⚡ Zap: Quick action

## Integration with DAES

### Flow from DAES to API GLOBAL

1. User creates pledge in DAES
2. Reserve amount appears in custody account
3. User navigates to API GLOBAL
4. Selects custody account with reserved funds
5. Sends transfer to G.I.D.I.F.A
6. Transfer recorded in both systems

### M2 Money Equivalent

All transfers represent **M2 money supply**:
- Broad money including deposits
- Bank account balances
- Money market securities
- Immediately available for transfer

## Security Considerations

### API Key

Embedded in URL:
```
key=831b9d45-d9ec-4594-80a3-3126a700b60f
```

**Note**: In production, store in environment variables.

### Source Identifier

All transfers marked with:
```
"source": "DAES_CORE_SYSTEM"
```

This identifies origin for audit trails.

### Institution Verification

- Sending: Digital Commercial Bank Ltd
- Receiving: APEX CAPITAL RESERVE BANK INC

Fixed values prevent spoofing.

## Monitoring & Logs

### Console Logs

```
[API GLOBAL] 📤 Sending transfer to MindCloud: {...}
[API GLOBAL] ✅ MindCloud response: {...}
[API GLOBAL] ❌ Error sending transfer: {...}
```

### Browser DevTools

Open console (F12) to see:
- API requests
- Response data
- Error details
- Transfer lifecycle

## Best Practices

### 1. **Test with Small Amounts**
Start with minimal amounts to verify connectivity.

### 2. **Verify Balance Before Transfer**
Always check available balance in real-time.

### 3. **Use Descriptive Purposes**
Clear purpose helps with reconciliation.

### 4. **Monitor Transfer Status**
Check history tab after sending.

### 5. **Keep Records**
Export transfer history regularly.

### 6. **Handle Errors Gracefully**
If transfer fails, retry after fixing issue.

### 7. **Validate Recipient Details**
Although fixed, always verify before sending large amounts.

## Troubleshooting

### Transfer Stuck in PENDING
- Check internet connection
- Verify MindCloud API status
- Retry after few minutes

### Transfer Marked FAILED
- Check console logs for error details
- Verify API key is correct
- Contact MindCloud support

### Balance Not Updating
- Refresh page
- Clear browser cache
- Check localStorage

### Cannot Select Custody Account
- Verify accounts exist in Custody module
- Check account has positive balance
- Reload custody accounts

## Future Enhancements

### Planned Features

1. **Multi-recipient support**
2. **Scheduled transfers**
3. **Recurring transfers**
4. **Transfer templates**
5. **Advanced filtering**
6. **Export to CSV/PDF**
7. **Email notifications**
8. **Webhook callbacks**
9. **Batch transfers**
10. **Currency conversion**

## Support

For issues or questions:
1. Check console logs
2. Review transfer history
3. Verify custody account balances
4. Contact system administrator

## Version History

### v1.0.0 (2025-11-13)
- Initial release
- MindCloud API integration
- Custody account selection
- Transfer history
- Real-time balance validation
- Status tracking
- Statistics dashboard

---

**Built with React + TypeScript + Tailwind CSS**

**API Provider: MindCloud**

**Institution: Digital Commercial Bank Ltd**
