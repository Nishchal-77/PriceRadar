import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendPriceDropAlert(
  userEmail,
  product,
  oldPrice,
  newPrice
) {
  try {
    const priceDrop = oldPrice - newPrice;
    const percentageDrop = ((priceDrop / oldPrice) * 100).toFixed(1);

    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: userEmail,
      subject: `🎉 Price Drop Alert: ${product.name}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f3f6fb;">

            <!-- Header -->
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Price Drop Alert!</h1>
            </div>

            <!-- Body -->
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">

              ${
                product.image_url
                  ? `
                <div style="text-align: center; margin-bottom: 20px;">
                  <img src="${product.image_url}" alt="${product.name}" style="max-width: 200px; height: auto; border-radius: 8px; border: 1px solid #e5e7eb;">
                </div>
              `
                  : ""
              }

              <h2 style="color: #1f2937; margin-top: 0;">${product.name}</h2>

              <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; font-size: 14px; color: #1e3a8a;">
                  <strong>Price dropped by ${percentageDrop}%!</strong>
                </p>
              </div>

              <table style="width: 100%; margin: 20px 0;">
                <tr>
                  <td style="padding: 10px; background: #f0f9ff; border-radius: 4px;">
                    <div style="font-size: 14px; color: #1e3a8a;">Previous Price</div>
                    <div style="font-size: 20px; color: #1e40af; text-decoration: line-through;">
                      ${product.currency} ${oldPrice.toFixed(2)}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px;">
                    <div style="font-size: 14px; color: #1e3a8a;">Current Price</div>
                    <div style="font-size: 32px; color: #3b82f6; font-weight: bold;">
                      ${product.currency} ${newPrice.toFixed(2)}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px; background: #e0f2fe; border-radius: 4px;">
                    <div style="font-size: 14px; color: #1e40af;">You Save</div>
                    <div style="font-size: 24px; color: #2563eb; font-weight: bold;">
                      ${product.currency} ${priceDrop.toFixed(2)}
                    </div>
                  </td>
                </tr>
              </table>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${product.url}" 
                   style="display: inline-block; background: #3b82f6; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                  View Product →
                </a>
              </div>

              <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 20px; text-align: center; color: #6b7280; font-size: 12px;">
                <p>You're receiving this email because you're tracking this product on Price Tracker.</p>
                <p style="margin-top: 10px;">
                  <a href="${process.env.NEXT_PUBLIC_APP_URL}" style="color: #3b82f6; text-decoration: none;">
                    View All Tracked Products
                  </a>
                </p>
              </div>

            </div>
            
          </body>
        </html>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return { error };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Email error:", error);
    return { error: error.message };
  }
}