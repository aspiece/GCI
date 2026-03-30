// Google Apps Script for Invoice Generator - Google Sheets Integration
// Instructions:
// 1. Create a new Google Sheets spreadsheet for invoice logging
// 2. Go to Extensions > Apps Script
// 3. Copy this code into the script editor
// 4. Replace INVOICE_SHEET_ID with your spreadsheet ID
// 5. Deploy as Web App: Deploy > New deployment > Web app
// 6. Set "Execute as" to "Me" and "Who has access" to "Anyone"
// 7. Copy the Web App URL and paste it in Invoice_Generator.html as GOOGLE_SHEETS_URL

// CONFIGURATION - Replace with your Google Sheet ID
const INVOICE_SHEET_ID = 'YOUR_INVOICE_SHEET_ID_HERE';
const SHEET_NAME = 'Invoices'; // The name of the sheet tab

/**
 * Initialize the spreadsheet with headers if needed
 */
function setupSheet() {
    const ss = SpreadsheetApp.openById(INVOICE_SHEET_ID);
    let sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet) {
        sheet = ss.insertSheet(SHEET_NAME);
    }

    // Check if headers exist
    if (sheet.getLastRow() === 0) {
        const headers = [
            'Timestamp',
            'Date',
            'Ticket Number',
            'Client Name',
            'Client Email',
            'Print Time (hrs)',
            'Filament (g)',
            'Service Charge',
            'Material Cost',
            'Sales Tax',
            'Design Fee',
            'Total Due',
            'Notes'
        ];
        sheet.appendRow(headers);

        // Format header row
        const headerRange = sheet.getRange(1, 1, 1, headers.length);
        headerRange.setFontWeight('bold');
        headerRange.setBackground('#667eea');
        headerRange.setFontColor('#FFFFFF');

        // Set column widths
        sheet.setColumnWidth(1, 180); // Timestamp
        sheet.setColumnWidth(2, 100); // Date
        sheet.setColumnWidth(3, 120); // Ticket Number
        sheet.setColumnWidth(4, 150); // Client Name
        sheet.setColumnWidth(5, 200); // Client Email
        sheet.setColumnWidth(13, 300); // Notes

        // Freeze header row
        sheet.setFrozenRows(1);
    }
}

/**
 * Handle POST requests from the Invoice Generator
 */
function doPost(e) {
    try {
        // Parse the incoming JSON data
        const data = JSON.parse(e.postData.contents);

        // Log the invoice data
        return logInvoice(data);

    } catch (error) {
        Logger.log('Error in doPost: ' + error.toString());
        Logger.log('Request data: ' + (e.postData ? e.postData.contents : 'No data'));

        return ContentService
            .createTextOutput(JSON.stringify({
                success: false,
                error: error.toString()
            }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}

/**
 * Handle GET requests (for testing)
 */
function doGet(e) {
    return ContentService
        .createTextOutput('Invoice Logger is running. Use POST requests to log invoice data.')
        .setMimeType(ContentService.MimeType.TEXT);
}

/**
 * Log invoice data to the spreadsheet
 */
function logInvoice(data) {
    try {
        const ss = SpreadsheetApp.openById(INVOICE_SHEET_ID);
        let sheet = ss.getSheetByName(SHEET_NAME);

        if (!sheet) {
            setupSheet();
            sheet = ss.getSheetByName(SHEET_NAME);
        }

        // Prepare the row data
        const rowData = [
            new Date(data.timestamp),        // Timestamp (ISO string converted to Date)
            data.date,                       // Date (formatted)
            data.ticketNumber,               // Ticket Number
            data.clientName,                 // Client Name
            data.clientEmail,                // Client Email
            parseFloat(data.printTime),      // Print Time
            parseFloat(data.filamentGrams),  // Filament Grams
            parseFloat(data.serviceCharge),  // Service Charge
            parseFloat(data.materialCost),   // Material Cost
            parseFloat(data.salesTax),       // Sales Tax
            parseFloat(data.designFee),      // Design Fee
            parseFloat(data.totalDue),       // Total Due
            data.notes || ''                 // Notes
        ];

        // Add the row to the sheet
        sheet.appendRow(rowData);

        // Format the new row (currency formatting for money columns)
        const lastRow = sheet.getLastRow();

        // Format money columns (H through L: Service Charge, Material Cost, Sales Tax, Design Fee, Total Due)
        const moneyRange = sheet.getRange(lastRow, 8, 1, 5);
        moneyRange.setNumberFormat('$#,##0.00');

        // Log success
        Logger.log('Invoice logged: Ticket #' + data.ticketNumber);

        return ContentService
            .createTextOutput(JSON.stringify({
                success: true,
                message: 'Invoice logged successfully',
                ticketNumber: data.ticketNumber
            }))
            .setMimeType(ContentService.MimeType.JSON);

    } catch (error) {
        Logger.log('Error logging invoice: ' + error.toString());

        return ContentService
            .createTextOutput(JSON.stringify({
                success: false,
                error: error.toString()
            }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}

/**
 * Test function to verify the script works
 */
function testLogInvoice() {
    const testData = {
        timestamp: new Date().toISOString(),
        date: new Date().toLocaleDateString(),
        ticketNumber: 'TEST-001',
        clientName: 'Test Client',
        clientEmail: 'test@example.com',
        printTime: 2.5,
        filamentGrams: 150,
        serviceCharge: '5.75',
        materialCost: '3.00',
        salesTax: '0.18',
        designFee: '5.00',
        totalDue: '13.93',
        notes: 'This is a test invoice'
    };

    const result = logInvoice(testData);
    Logger.log(result.getContent());
}
