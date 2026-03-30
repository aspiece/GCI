# Invoice Generator - Google Sheets Integration Setup Guide

This guide will help you connect your Invoice Generator to Google Sheets so that all invoices are automatically logged when you click the "Copy Email" button.

## Prerequisites

- A Google account
- Access to Google Sheets and Google Apps Script

## Step 1: Create Your Invoice Logging Spreadsheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet
3. Name it something like "GCI Invoice Logger" or "3D Print Invoices"
4. Copy the Spreadsheet ID from the URL:
   - The URL looks like: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_HERE/edit`
   - Copy the long string between `/d/` and `/edit` - this is your Spreadsheet ID

## Step 2: Set Up Google Apps Script

1. In your new spreadsheet, click **Extensions** → **Apps Script**
2. A new tab will open with the Apps Script editor
3. Delete any existing code in the editor
4. Open the file `Invoice_Logger_Apps_Script.js` from your project folder
5. Copy ALL the code from that file
6. Paste it into the Apps Script editor
7. Find this line near the top:

   ```javascript
   const INVOICE_SHEET_ID = 'YOUR_INVOICE_SHEET_ID_HERE';
   ```

8. Replace `'YOUR_INVOICE_SHEET_ID_HERE'` with your Spreadsheet ID from Step 1 (keep the quotes!)
   - Example: `const INVOICE_SHEET_ID = '1a2b3c4d5e6f7g8h9i0j';`
9. Click the **Save** icon (💾) or press `Ctrl+S`
10. Name your project something like "Invoice Logger"

## Step 3: Deploy as Web App

1. In the Apps Script editor, click **Deploy** → **New deployment**
2. Click the gear icon (⚙️) next to "Select type"
3. Choose **Web app**
4. Fill in the deployment settings:
   - **Description**: "Invoice Logger v1" (or any description you like)
   - **Execute as**: Select **Me** (your email)
   - **Who has access**: Select **Anyone**
5. Click **Deploy**
6. You may need to authorize the app:
   - Click **Authorize access**
   - Choose your Google account
   - Click **Advanced** → **Go to Invoice Logger (unsafe)**
   - Click **Allow**
7. Copy the **Web app URL** that appears - it will look like:

   ```
   https://script.google.com/macros/s/LONG_ID_HERE/exec
   ```

8. Click **Done**

## Step 4: Configure Invoice Generator HTML

1. Open `Invoice_Generator.html` in a text editor or VS Code
2. Find this line near the top of the `<script>` section (around line 269):

   ```javascript
   const GOOGLE_SHEETS_URL = 'YOUR_WEB_APP_URL_HERE';
   ```

3. Replace `'YOUR_WEB_APP_URL_HERE'` with your Web App URL from Step 3 (keep the quotes!)
   - Example: `const GOOGLE_SHEETS_URL = 'https://script.google.com/macros/s/ABC123.../exec';`
4. Save the file

## Step 5: Test the Integration

1. Open `Invoice_Generator.html` in your web browser
2. Fill out a test invoice with sample data
3. Click **Generate Invoice**
4. Click **📋 Copy Email**
5. You should see the success message "✅ Invoice copied to clipboard!"
6. Check your Google Spreadsheet - you should see a new row with your invoice data!

## Spreadsheet Columns

Your Google Sheet will automatically create these columns:

| Column | Description |
|--------|-------------|
| Timestamp | Full date and time the invoice was created |
| Date | Formatted date |
| Ticket Number | The ticket/order number |
| Client Name | Customer's name |
| Client Email | Customer's email address |
| Print Time (hrs) | Hours the print took |
| Filament (g) | Grams of filament used |
| Service Charge | Calculated service fee ($) |
| Material Cost | Cost of materials ($) |
| Sales Tax | 6% sales tax ($) |
| Design Fee | Design fee if applicable ($) |
| Total Due | Total amount due ($) |
| Notes | Any additional notes |

## Troubleshooting

### "Invoice data sent to Google Sheets successfully" appears in console but no data in sheet

- Check that your Spreadsheet ID is correct
- Make sure the Web App URL is correct and ends with `/exec`
- Verify the deployment is set to "Anyone" can access

### Authorization errors

- Redeploy the Web App
- Make sure you clicked "Allow" when authorizing the script
- Try using an incognito/private browser window to reauthorize

### No console messages at all

- Open your browser's Developer Tools (F12)
- Check the Console tab for error messages
- Verify the GOOGLE_SHEETS_URL is not set to `'YOUR_WEB_APP_URL_HERE'`

### Testing the Google Apps Script directly

1. In the Apps Script editor, select the `testLogInvoice` function from the dropdown
2. Click the **Run** button
3. Check the spreadsheet for a test entry
4. View **Execution log** to see if there were any errors

## Optional: Set Up Email Notifications

You can configure Google Sheets to send you an email notification whenever a new invoice is logged:

1. In your spreadsheet, click **Tools** → **Notification rules**
2. Select **A user submits a form** or **Any changes are made**
3. Choose your notification preference
4. Click **Save**

## Security Notes

- The Web App URL can be used by anyone to submit data to your spreadsheet
- Only you (the owner) can view/edit the spreadsheet
- The `mode: 'no-cors'` setting means you won't get detailed error messages in the browser console
- All data transmission happens over HTTPS

## Need Help?

If you encounter issues:

1. Check the Apps Script execution logs: **View** → **Executions** in the Apps Script editor
2. Check your browser's console (F12) for JavaScript errors
3. Verify all IDs and URLs are correctly copied (no extra spaces or quotes)
4. Make sure the Google Sheet is not deleted or permissions changed

---

**That's it!** Your Invoice Generator is now connected to Google Sheets and will automatically log all invoices when you click the "Copy Email" button.
