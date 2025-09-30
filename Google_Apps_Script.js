// Google Apps Script for 3D Print Order Transaction Logging
// Save this as a new Google Apps Script project and deploy as a web app

// CONFIGURATION - Replace with your actual Google Sheet ID
const ACCOUNTING_SHEET_ID = 'YOUR_ACCOUNTING_SHEET_ID_HERE';

/**
 * Main function to handle POST requests from the order form
 */
function doPost(e) {
  try {
    // Parse the incoming JSON data
    const data = JSON.parse(e.postData.contents);
    
    // Get reference to the accounting spreadsheet
    const sheet = SpreadsheetApp.openById(ACCOUNTING_SHEET_ID).getActiveSheet();
    
    if (data.action === 'logTransaction') {
      // Log a new transaction
      return logNewTransaction(sheet, data.data);
      
    } else if (data.action === 'updateStatus') {
      // Update payment status for existing transaction
      return updatePaymentStatus(sheet, data.transactionId, data.status);
      
    } else {
      // Unknown action
      return createErrorResponse('Unknown action: ' + data.action);
    }
    
  } catch (error) {
    // Log error for debugging
    Logger.log('Error in doPost: ' + error.toString());
    Logger.log('Request data: ' + e.postData.contents);
    
    return createErrorResponse('Server error: ' + error.toString());
  }
}

/**
 * Log a new transaction to the spreadsheet
 */
function logNewTransaction(sheet, transactionData) {
  try {
    // Prepare the row data in the correct order
    const rowData = [
      new Date(transactionData.orderDate),          // A: Order_Date
      transactionData.transactionId,               // B: Transaction_ID
      transactionData.customerName,                // C: Customer_Name
      transactionData.customerEmail,               // D: Customer_Email
      transactionData.customerPhone || '',         // E: Customer_Phone
      transactionData.company || '',               // F: Company
      transactionData.itemsOrdered,                // G: Items_Ordered
      parseFloat(transactionData.totalAmount),     // H: Total_Amount
      transactionData.paymentStatus,               // I: Payment_Status
      transactionData.instructions || '',          // J: Instructions
      new Date()                                   // K: Last_Updated
    ];
    
    // Add the row to the sheet
    sheet.appendRow(rowData);
    
    // Log success for debugging
    Logger.log('Transaction logged: ' + transactionData.transactionId);
    
    return createSuccessResponse({
      transactionId: transactionData.transactionId,
      message: 'Transaction logged successfully'
    });
    
  } catch (error) {
    Logger.log('Error logging transaction: ' + error.toString());
    return createErrorResponse('Failed to log transaction: ' + error.toString());
  }
}

/**
 * Update payment status for an existing transaction
 */
function updatePaymentStatus(sheet, transactionId, newStatus) {
  try {
    // Get all data from the sheet
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    // Find the transaction by ID (column B, index 1)
    for (let i = 1; i < values.length; i++) {
      if (values[i][1] === transactionId) {
        // Update Payment_Status (column I, index 8)
        sheet.getRange(i + 1, 9).setValue(newStatus);
        
        // Update Last_Updated (column K, index 10)
        sheet.getRange(i + 1, 11).setValue(new Date());
        
        Logger.log(`Status updated for ${transactionId}: ${newStatus}`);
        
        return createSuccessResponse({
          transactionId: transactionId,
          newStatus: newStatus,
          message: 'Status updated successfully'
        });
      }
    }
    
    // Transaction not found
    return createErrorResponse('Transaction not found: ' + transactionId);
    
  } catch (error) {
    Logger.log('Error updating status: ' + error.toString());
    return createErrorResponse('Failed to update status: ' + error.toString());
  }
}

/**
 * Create a success response
 */
function createSuccessResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify({
      success: true,
      ...data
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Create an error response
 */
function createErrorResponse(message) {
  return ContentService
    .createTextOutput(JSON.stringify({
      success: false,
      error: message
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Test function to verify sheet access
 * Run this function to test your sheet connection
 */
function testSheetAccess() {
  try {
    const sheet = SpreadsheetApp.openById(ACCOUNTING_SHEET_ID).getActiveSheet();
    Logger.log('✅ Sheet access successful!');
    Logger.log('Sheet name: ' + sheet.getName());
    Logger.log('Sheet ID: ' + ACCOUNTING_SHEET_ID);
    
    // Test adding a sample row
    const testRow = [
      new Date(),
      'TEST-' + Date.now(),
      'Test Customer',
      'test@example.com',
      '555-0123',
      'Test Company',
      'Test Item (1x $10.00)',
      10.00,
      'Test',
      'This is a test transaction',
      new Date()
    ];
    
    sheet.appendRow(testRow);
    Logger.log('✅ Test row added successfully!');
    
    return 'Sheet access test completed successfully!';
    
  } catch (error) {
    Logger.log('❌ Error accessing sheet: ' + error.toString());
    Logger.log('Make sure ACCOUNTING_SHEET_ID is correct: ' + ACCOUNTING_SHEET_ID);
    return 'Error: ' + error.toString();
  }
}

/**
 * Test function to simulate a transaction log
 */
function testTransactionLog() {
  const testData = {
    action: 'logTransaction',
    data: {
      orderDate: new Date().toISOString(),
      transactionId: 'TEST-' + Date.now(),
      customerName: 'John Doe',
      customerEmail: 'john@example.com',
      customerPhone: '555-0123',
      company: 'Test Company',
      itemsOrdered: 'Phone Stand (1x $15.99); Desk Organizer (2x $22.50)',
      totalAmount: '60.99',
      paymentStatus: 'Pending',
      instructions: 'Please make it blue'
    }
  };
  
  // Simulate the POST request
  const mockEvent = {
    postData: {
      contents: JSON.stringify(testData)
    }
  };
  
  const result = doPost(mockEvent);
  Logger.log('Test result: ' + result.getContent());
  
  return result.getContent();
}

/**
 * Clean up test data (removes rows with "TEST-" or "Test" transaction IDs)
 */
function cleanupTestData() {
  try {
    const sheet = SpreadsheetApp.openById(ACCOUNTING_SHEET_ID).getActiveSheet();
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    // Delete rows from bottom to top to avoid index shifting
    for (let i = values.length - 1; i >= 1; i--) {
      const transactionId = values[i][1]; // Column B
      if (transactionId && (transactionId.toString().includes('TEST-') || transactionId.toString().includes('Test'))) {
        sheet.deleteRow(i + 1);
        Logger.log('Deleted test row: ' + transactionId);
      }
    }
    
    Logger.log('✅ Test data cleanup completed');
    return 'Test data cleanup completed';
    
  } catch (error) {
    Logger.log('❌ Error cleaning up test data: ' + error.toString());
    return 'Error: ' + error.toString();
  }
}

/*
DEPLOYMENT INSTRUCTIONS:
========================

1. Replace ACCOUNTING_SHEET_ID with your actual Google Sheet ID

2. Save the project with a meaningful name like "Order Transaction Logger"

3. Test the connection:
   - Run the testSheetAccess() function
   - Check the logs (View → Executions)

4. Deploy as web app:
   - Click Deploy → New deployment
   - Type: Web app
   - Description: "Order Transaction API"
   - Execute as: Me
   - Who has access: Anyone
   - Click Deploy

5. Copy the web app URL and update your HTML file

6. Test the full flow:
   - Run testTransactionLog() to simulate a transaction
   - Check your spreadsheet for the new row
   - Use cleanupTestData() to remove test entries

TROUBLESHOOTING:
================
- If you get permission errors, make sure the script can access your sheet
- Check the Executions log for detailed error messages
- Verify your sheet ID is correct
- Make sure your sheet has the correct column headers
*/