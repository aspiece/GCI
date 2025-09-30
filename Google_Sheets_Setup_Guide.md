# Google Sheets Setup Guide for 3D Print Order System

This guide will help you create and configure the Google Sheets needed for your order management system.

## 📦 PART 1: Product Catalog Sheet

### Step 1: Create the Product Catalog Sheet

1. **Go to Google Sheets**: Visit [sheets.google.com](https://sheets.google.com)
2. **Create a new sheet**: Click "Blank" to create a new spreadsheet
3. **Name your sheet**: Click "Untitled spreadsheet" and rename it to "3D Print Products"

### Step 2: Set Up the Column Headers

In Row 1, enter these exact column headers (case-sensitive):

| A | B | C | D |
|---|---|---|---|
| Name | Description | Price | Image_URL |

### Step 3: Add Sample Product Data

Here's sample data you can copy and paste (starting from Row 2):

| Name | Description | Price | Image_URL |
|------|-------------|-------|-----------|
| Custom Phone Stand | Adjustable phone stand perfect for video calls and watching videos. Available in multiple colors. | 15.99 | https://via.placeholder.com/300x200/667eea/white?text=Phone+Stand |
| Desk Organizer | Keep your desk tidy with this multi-compartment organizer. Great for pens, clips, and small items. | 22.50 | https://via.placeholder.com/300x200/764ba2/white?text=Desk+Organizer |
| Plant Pot | Beautiful geometric plant pot with drainage hole. Perfect for succulents and small plants. | 18.75 | https://via.placeholder.com/300x200/28a745/white?text=Plant+Pot |
| Cable Management Clip | Set of 5 clips to keep your cables organized and prevent them from falling behind your desk. | 8.99 | https://via.placeholder.com/300x200/ffc107/black?text=Cable+Clips |
| Miniature Garden Tools | Adorable set of miniature garden tools. Perfect for small planters or as decorative items. | 12.99 | https://via.placeholder.com/300x200/17a2b8/white?text=Garden+Tools |
| Custom Keychain | Personalized keychain with your name or custom text. Durable and lightweight plastic construction. | 6.50 | https://via.placeholder.com/300x200/e83e8c/white?text=Keychain |

### Step 4: Format the Sheet

1. **Bold the headers**: Select row 1 and click Bold (Ctrl+B)
2. **Format prices**: Select column C, go to Format → Number → Currency
3. **Resize columns**: Double-click column borders to auto-resize
4. **Add borders**: Select all data, go to Borders icon and choose "All borders"

### Step 5: Publish to Web

1. **Go to File → Share → Publish to the web**
2. **Choose your sheet tab** (usually "Sheet1")
3. **Select "Web page"** from the dropdown
4. **Check "Automatically republish when changes are made"**
5. **Click "Publish"**
6. **Copy the published URL** - you'll need this for your HTML file

### Step 6: Get Sheet ID

From your sheet URL, copy the long ID between `/d/` and `/edit`:
```
https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID_HERE/edit#gid=0
```

---

## 📊 PART 2: Accounting/Transaction Sheet

### Step 1: Create the Accounting Sheet

1. **Create another new Google Sheet**
2. **Name it**: "3D Print Order Transactions"

### Step 2: Set Up Column Headers

In Row 1, enter these exact headers:

| A | B | C | D | E | F | G | H | I | J | K |
|---|---|---|---|---|---|---|---|---|---|---|
| Order_Date | Transaction_ID | Customer_Name | Customer_Email | Customer_Phone | Company | Items_Ordered | Total_Amount | Payment_Status | Instructions | Last_Updated |

### Step 3: Format the Accounting Sheet

1. **Bold headers**: Select row 1 and make it bold
2. **Format dates**: Select columns A and K, Format → Number → Date time
3. **Format currency**: Select column H, Format → Number → Currency
4. **Resize columns**: Auto-resize all columns
5. **Add borders**: Select headers and add borders
6. **Freeze header row**: View → Freeze → 1 row

### Step 4: Add Data Validation (Optional)

For Payment_Status column (I):
1. Select column I (from I2 downward)
2. Data → Data validation
3. Criteria: List of items
4. Enter: `Pending,Completed,Cancelled,Failed`
5. Click Done

---

## 🔧 PART 3: Google Apps Script Setup

### Step 1: Create the Script

1. **Go to**: [script.google.com](https://script.google.com)
2. **Click**: "New project"
3. **Replace the default code** with the script below

### Step 2: Apps Script Code

```javascript
// Replace YOUR_ACCOUNTING_SHEET_ID with your actual sheet ID
const ACCOUNTING_SHEET_ID = 'YOUR_ACCOUNTING_SHEET_ID';

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.openById(ACCOUNTING_SHEET_ID).getActiveSheet();
    
    if (data.action === 'logTransaction') {
      // Log new transaction
      const rowData = [
        new Date(data.data.orderDate),
        data.data.transactionId,
        data.data.customerName,
        data.data.customerEmail,
        data.data.customerPhone,
        data.data.company,
        data.data.itemsOrdered,
        parseFloat(data.data.totalAmount),
        data.data.paymentStatus,
        data.data.instructions,
        new Date()
      ];
      
      sheet.appendRow(rowData);
      
      return ContentService.createTextOutput(JSON.stringify({
        success: true, 
        transactionId: data.data.transactionId,
        message: 'Transaction logged successfully'
      })).setMimeType(ContentService.MimeType.JSON);
      
    } else if (data.action === 'updateStatus') {
      // Update payment status
      const dataRange = sheet.getDataRange();
      const values = dataRange.getValues();
      
      for (let i = 1; i < values.length; i++) {
        if (values[i][1] === data.transactionId) { // Transaction_ID is column B
          sheet.getRange(i + 1, 9).setValue(data.status); // Payment_Status is column I
          sheet.getRange(i + 1, 11).setValue(new Date()); // Last_Updated is column K
          break;
        }
      }
      
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: `Status updated to ${data.status}`
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      error: 'Unknown action'
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    Logger.log('Error: ' + error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Test function - you can run this to verify your sheet connection
function testSheetAccess() {
  try {
    const sheet = SpreadsheetApp.openById(ACCOUNTING_SHEET_ID).getActiveSheet();
    Logger.log('Sheet name: ' + sheet.getName());
    Logger.log('Sheet access successful!');
  } catch (error) {
    Logger.log('Error accessing sheet: ' + error.toString());
  }
}
```

### Step 3: Configure the Script

1. **Replace `YOUR_ACCOUNTING_SHEET_ID`** with your actual accounting sheet ID
2. **Save the project**: Ctrl+S, name it "Order Transaction Logger"
3. **Test the connection**: 
   - Click on `testSheetAccess` function
   - Click "Run"
   - Authorize permissions when prompted

### Step 4: Deploy as Web App

1. **Click**: "Deploy" → "New deployment"
2. **Type**: Choose "Web app"
3. **Description**: "Order Transaction API"
4. **Execute as**: Me
5. **Who has access**: Anyone
6. **Click**: "Deploy"
7. **Copy the Web App URL** - you'll need this for your HTML file

---

## 🔗 PART 4: Update Your HTML File

Replace these values in your `GCI3Dorder.html` file:

```javascript
// Replace these with your actual IDs and URLs
const GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/YOUR_PRODUCT_SHEET_ID/gviz/tq?tqx=out:json&sheet=Sheet1';
const ACCOUNTING_SHEET_ID = 'YOUR_ACCOUNTING_SHEET_ID';
const GOOGLE_APPS_SCRIPT_URL = 'YOUR_APPS_SCRIPT_WEB_APP_URL';
```

---

## ✅ Testing Your Setup

### Test Product Loading:
1. Open your HTML file in a browser
2. Check if products load from your sheet
3. Verify images, prices, and descriptions appear correctly

### Test Transaction Logging:
1. Fill out the order form
2. Add items to cart
3. Click "Proceed to Payment"
4. Check your accounting sheet for the new transaction record

### Test Status Updates:
1. Add `?payment_status=success` to your page URL
2. Refresh the page
3. Check if the transaction status updates to "Completed"

---

## 🔧 Troubleshooting

### Products Not Loading:
- Verify sheet is published to web
- Check sheet ID in HTML file
- Ensure column headers match exactly
- Check browser console for errors

### Transaction Logging Not Working:
- Verify Apps Script permissions
- Check sheet ID in script
- Test the `testSheetAccess` function
- Review Apps Script execution logs

### Need Help?
- Check Google Apps Script logs: script.google.com → your project → Executions
- Use browser developer console (F12) to see JavaScript errors
- Verify all IDs and URLs are correct

---

## 📝 Quick Reference

### Required Sheet IDs:
- Product Sheet ID: `_______________________`
- Accounting Sheet ID: `_______________________`
- Apps Script Web App URL: `_______________________`

### Column Order (Product Sheet):
1. Name
2. Description  
3. Price
4. Image_URL

### Column Order (Accounting Sheet):
1. Order_Date
2. Transaction_ID
3. Customer_Name
4. Customer_Email
5. Customer_Phone
6. Company
7. Items_Ordered
8. Total_Amount
9. Payment_Status
10. Instructions
11. Last_Updated

Once you've completed this setup, your order system will automatically manage products and log all transactions for accounting purposes!