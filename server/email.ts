import { Resend } from "resend";

let resendInstance: Resend | null = null;

function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY not configured, emails will not be sent");
    return null;
  }
  if (!resendInstance) {
    resendInstance = new Resend(apiKey);
  }
  return resendInstance;
}

function getBaseUrl(): string {
  return "https://testbankbooks.com";
}

interface OrderEmailData {
  customerEmail: string;
  customerName: string | null;
  orderId: string;
  amount: string;
  paymentMethod: string;
  productTitles: string[];
  downloadLinks?: { title: string; url: string }[];
}

export async function sendOrderConfirmationEmail(data: OrderEmailData): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;

  const baseUrl = getBaseUrl();
  const downloadLink = `${baseUrl}/thank-you/${data.orderId}`;
  const displayName = data.customerName || "Valued Customer";

  const productListHtml = data.productTitles
    .map((title) => `<li style="padding: 8px 0; border-bottom: 1px solid #eee;">${title}</li>`)
    .join("");

  const downloadLinksHtml = (data.downloadLinks || [])
    .map((dl) => `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
          <p style="margin: 0 0 8px; font-weight: 500;">${dl.title}</p>
          <a href="${dl.url}" style="display: inline-block; background-color: #059669; color: #ffffff; text-decoration: none; padding: 8px 20px; border-radius: 6px; font-weight: 600; font-size: 14px;">
            Download File
          </a>
        </td>
      </tr>`)
    .join("");

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          
          <tr>
            <td style="background-color: #1a1a2e; padding: 30px 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">TestBankBooks</h1>
            </td>
          </tr>

          <tr>
            <td style="padding: 40px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <div style="display: inline-block; width: 60px; height: 60px; background-color: #dcfce7; border-radius: 50%; line-height: 60px; font-size: 30px;">✓</div>
              </div>
              
              <h2 style="color: #1a1a2e; text-align: center; margin: 0 0 10px;">Thank You for Your Purchase!</h2>
              <p style="color: #6b7280; text-align: center; margin: 0 0 30px;">Hi ${displayName}, your order has been confirmed.</p>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
                <tr>
                  <td>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Order Number</td>
                        <td style="padding: 6px 0; text-align: right; font-weight: 600; font-family: monospace;">#${data.orderId.substring(0, 8).toUpperCase()}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Payment Method</td>
                        <td style="padding: 6px 0; text-align: right; font-weight: 500;">${data.paymentMethod === "stripe" ? "Card" : "PayPal"}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Total</td>
                        <td style="padding: 6px 0; text-align: right; font-weight: 700; font-size: 18px; color: #059669;">$${parseFloat(data.amount).toFixed(2)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <h3 style="color: #1a1a2e; margin: 0 0 10px; font-size: 16px;">Your Items</h3>
              <ul style="list-style: none; padding: 0; margin: 0 0 30px;">
                ${productListHtml}
              </ul>

              ${downloadLinksHtml ? `
              <h3 style="color: #1a1a2e; margin: 25px 0 10px; font-size: 16px;">Your Downloads</h3>
              <table width="100%" cellpadding="0" cellspacing="0">
                ${downloadLinksHtml}
              </table>
              ` : `
              <div style="text-align: center; margin: 30px 0;">
                <a href="${downloadLink}" style="display: inline-block; background-color: #059669; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Download Your Files
                </a>
              </div>
              `}

              <div style="background-color: #eff6ff; border-radius: 8px; padding: 16px; margin-top: 20px;">
                <p style="margin: 0; font-size: 14px; color: #1e40af;">
                  <strong>Instant Access:</strong> Click the download buttons above to get your files. 
                  Please save your files after downloading.
                </p>
              </div>
            </td>
          </tr>

          <tr>
            <td style="background-color: #f9fafb; padding: 25px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px; font-size: 14px; color: #6b7280;">
                Need help? Contact us at <a href="mailto:support@testbankbooks.com" style="color: #2563eb;">support@testbankbooks.com</a>
              </p>
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                © ${new Date().getFullYear()} TestBankBooks. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  try {
    const result = await resend.emails.send({
      from: "TestBankBooks <support@testbankbooks.com>",
      to: data.customerEmail,
      subject: `Order Confirmed - Your Downloads Are Ready! #${data.orderId.substring(0, 8).toUpperCase()}`,
      html,
    });

    if (result.error) {
      console.error("Failed to send order email:", result.error);
      return false;
    }

    console.log(`Order confirmation email sent to ${data.customerEmail}, id: ${result.data?.id}`);
    return true;
  } catch (error) {
    console.error("Error sending order confirmation email:", error);
    return false;
  }
}

interface AbandonedCartEmailData {
  customerEmail: string;
  customerName: string | null;
  productTitles: string[];
  totalAmount: string | null;
}

export async function sendAbandonedCartRecoveryEmail(data: AbandonedCartEmailData): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;

  const baseUrl = getBaseUrl();
  const shopLink = `${baseUrl}/shop`;
  const displayName = data.customerName || "there";
  const amount = data.totalAmount ? `$${parseFloat(data.totalAmount).toFixed(2)}` : "";

  const productListHtml = data.productTitles
    .map((title) => `<li style="padding: 8px 0; border-bottom: 1px solid #eee;">${title}</li>`)
    .join("");

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          
          <tr>
            <td style="background-color: #1a1a2e; padding: 30px 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">TestBankBooks</h1>
            </td>
          </tr>

          <tr>
            <td style="padding: 40px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <div style="display: inline-block; width: 60px; height: 60px; background-color: #fef3c7; border-radius: 50%; line-height: 60px; font-size: 30px;">🛒</div>
              </div>
              
              <h2 style="color: #1a1a2e; text-align: center; margin: 0 0 10px;">You Left Something Behind!</h2>
              <p style="color: #6b7280; text-align: center; margin: 0 0 30px;">Hi ${displayName}, it looks like you didn't finish your purchase. Your items are still waiting for you.</p>

              ${data.productTitles.length > 0 ? `
              <h3 style="color: #1a1a2e; margin: 0 0 10px; font-size: 16px;">Items in Your Cart</h3>
              <ul style="list-style: none; padding: 0; margin: 0 0 20px;">
                ${productListHtml}
              </ul>
              ` : ""}

              ${amount ? `
              <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 25px; text-align: center;">
                <p style="margin: 0; color: #6b7280; font-size: 14px;">Cart Total</p>
                <p style="margin: 4px 0 0; font-size: 24px; font-weight: 700; color: #1a1a2e;">${amount}</p>
              </div>
              ` : ""}

              <div style="text-align: center; margin: 30px 0;">
                <a href="${shopLink}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Complete Your Purchase
                </a>
              </div>

              <div style="background-color: #fefce8; border-radius: 8px; padding: 16px; margin-top: 20px;">
                <p style="margin: 0; font-size: 14px; color: #854d0e;">
                  <strong>Need help?</strong> If you had any issues during checkout or have questions about our products, 
                  don't hesitate to reach out. We're happy to assist!
                </p>
              </div>
            </td>
          </tr>

          <tr>
            <td style="background-color: #f9fafb; padding: 25px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px; font-size: 14px; color: #6b7280;">
                Need help? Contact us at <a href="mailto:support@testbankbooks.com" style="color: #2563eb;">support@testbankbooks.com</a>
              </p>
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                © ${new Date().getFullYear()} TestBankBooks. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  try {
    const result = await resend.emails.send({
      from: "TestBankBooks <support@testbankbooks.com>",
      to: data.customerEmail,
      subject: "You left items in your cart - Complete your purchase!",
      html,
    });

    if (result.error) {
      console.error("Failed to send recovery email:", result.error);
      throw new Error(result.error.message || "Email send failed");
    }

    console.log(`Recovery email sent to ${data.customerEmail}, id: ${result.data?.id}`);
    return true;
  } catch (error: any) {
    console.error("Error sending recovery email:", error);
    throw error;
  }
}
