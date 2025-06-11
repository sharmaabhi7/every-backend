const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

// Ensure uploads directory exists
const ensureUploadsDir = async () => {
  const uploadsDir = path.join(__dirname, '../uploads');
  try {
    await fs.access(uploadsDir);
  } catch (error) {
    await fs.mkdir(uploadsDir, { recursive: true });
  }
  return uploadsDir;
};

// Generate signed agreement PDF
const generateSignedAgreementPDF = async (signedAgreement) => {
  let browser;
  try {
    const uploadsDir = await ensureUploadsDir();
    
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Create HTML content with user data inserted
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Signed Agreement</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            margin: 40px;
            color: #333;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
          }
          .user-info {
            background-color: #f5f5f5;
            padding: 20px;
            border-radius: 5px;
            margin: 20px 0;
          }
          .signature-section {
            margin-top: 40px;
            border-top: 1px solid #ccc;
            padding-top: 20px;
          }
          .signature-image {
            max-width: 300px;
            max-height: 100px;
            border: 1px solid #ccc;
            padding: 10px;
          }
          .agreement-content {
            white-space: pre-wrap;
            margin: 20px 0;
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 12px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>SIGNED AGREEMENT</h1>
          <p>Digital Agreement Document</p>
        </div>
        
        <div class="user-info">
          <h3>Signatory Information</h3>
          <p><strong>Name:</strong> ${signedAgreement.userName}</p>
          <p><strong>Email:</strong> ${signedAgreement.userEmail}</p>
          <p><strong>Mobile Number:</strong> ${signedAgreement.userMobileNumber}</p>
          <p><strong>Signed Date:</strong> ${new Date(signedAgreement.signedAt).toLocaleString()}</p>
        </div>
        
        <div class="agreement-content">
          <h3>Agreement Terms</h3>
          ${signedAgreement.agreementContent.replace(/\[USER_NAME\]/g, signedAgreement.userName).replace(/\[MOBILE_NUMBER\]/g, signedAgreement.userMobileNumber)}
        </div>
        
        <div class="signature-section">
          <h3>Digital Signature</h3>
          <p>I, <strong>${signedAgreement.userName}</strong>, hereby acknowledge that I have read, understood, and agree to the terms and conditions outlined in this agreement.</p>
          <div style="margin: 20px 0;">
            <img src="${signedAgreement.signature}" alt="Digital Signature" class="signature-image" />
          </div>
          <p><strong>Signature Date:</strong> ${new Date(signedAgreement.signedAt).toLocaleString()}</p>
        </div>
        
        <div class="footer">
          <p>This is a digitally signed agreement generated on ${new Date().toLocaleString()}</p>
          <p>Document ID: ${signedAgreement._id}</p>
        </div>
      </body>
      </html>
    `;
    
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    const fileName = `signed_agreement_${signedAgreement.userId}_${Date.now()}.pdf`;
    const filePath = path.join(uploadsDir, fileName);
    
    await page.pdf({
      path: filePath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      }
    });
    
    return {
      filePath,
      fileName
    };
  } catch (error) {
    console.error('Error generating signed agreement PDF:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

// Generate penalty report PDF
const generatePenaltyReportPDF = async (user, penaltyDetails) => {
  let browser;
  try {
    const uploadsDir = await ensureUploadsDir();
    
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Penalty Report</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            margin: 40px;
            color: #333;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #d32f2f;
            padding-bottom: 20px;
          }
          .user-info {
            background-color: #fff3e0;
            padding: 20px;
            border-radius: 5px;
            margin: 20px 0;
            border-left: 4px solid #ff9800;
          }
          .penalty-info {
            background-color: #ffebee;
            padding: 20px;
            border-radius: 5px;
            margin: 20px 0;
            border-left: 4px solid #d32f2f;
          }
          .work-info {
            background-color: #f3e5f5;
            padding: 20px;
            border-radius: 5px;
            margin: 20px 0;
            border-left: 4px solid #9c27b0;
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 12px;
            color: #666;
          }
          .warning {
            color: #d32f2f;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="warning">PENALTY REPORT</h1>
          <p>Work Performance Penalty Notice</p>
        </div>
        
        <div class="user-info">
          <h3>User Information</h3>
          <p><strong>Name:</strong> ${user.name}</p>
          <p><strong>Email:</strong> ${user.email}</p>
          <p><strong>Mobile Number:</strong> ${user.mobileNumber}</p>
          <p><strong>Registration Date:</strong> ${new Date(user.createdAt).toLocaleString()}</p>
        </div>
        
        <div class="work-info">
          <h3>Work Information</h3>
          <p><strong>Work Started:</strong> ${user.workStartedAt ? new Date(user.workStartedAt).toLocaleString() : 'Not started'}</p>
          <p><strong>Work Submitted:</strong> ${user.workSubmitted ? 'Yes' : 'No'}</p>
          ${penaltyDetails.submittedAt ? `<p><strong>Submission Date:</strong> ${new Date(penaltyDetails.submittedAt).toLocaleString()}</p>` : ''}
        </div>
        
        <div class="penalty-info">
          <h3>Penalty Details</h3>
          <p><strong>Penalty Status:</strong> <span class="warning">PENALIZED</span></p>
          <p><strong>Penalty Date:</strong> ${new Date(user.penalizedAt).toLocaleString()}</p>
          <p><strong>Penalty Reason:</strong> ${user.penalizedReason || 'Not specified'}</p>
          ${penaltyDetails.reason ? `<p><strong>Additional Details:</strong> ${penaltyDetails.reason}</p>` : ''}
          
          <h4>Penalty Reason Explanation:</h4>
          ${getPenaltyReasonExplanation(user.penalizedReason)}
        </div>
        
        <div style="margin: 30px 0; padding: 20px; background-color: #e8f5e8; border-radius: 5px;">
          <h3>Next Steps</h3>
          <ul>
            <li>Contact the administrator for clarification if needed</li>
            <li>Review the terms and conditions of your agreement</li>
            <li>Ensure compliance with future deadlines and requirements</li>
          </ul>
        </div>
        
        <div class="footer">
          <p>This penalty report was generated automatically on ${new Date().toLocaleString()}</p>
          <p>Report ID: ${user._id}_penalty_${Date.now()}</p>
        </div>
      </body>
      </html>
    `;
    
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    const fileName = `penalty_report_${user._id}_${Date.now()}.pdf`;
    const filePath = path.join(uploadsDir, fileName);
    
    await page.pdf({
      path: filePath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      }
    });
    
    return {
      filePath,
      fileName
    };
  } catch (error) {
    console.error('Error generating penalty report PDF:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

// Helper function to get penalty reason explanation
const getPenaltyReasonExplanation = (reason) => {
  switch (reason) {
    case 'deadline_exceeded':
      return '<p>The work deadline of 4 days was exceeded without submission.</p>';
    case 'auto_24h_after_submission':
      return '<p>This penalty was automatically applied 24 hours after work submission as per system policy.</p>';
    case 'manual':
      return '<p>This penalty was manually applied by an administrator.</p>';
    default:
      return '<p>Penalty reason not specified.</p>';
  }
};

module.exports = {
  generateSignedAgreementPDF,
  generatePenaltyReportPDF
};
