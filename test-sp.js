const SellingPartnerAPI = require('amazon-sp-api');
try {
  const client = new SellingPartnerAPI({
    region: 'na',
    refresh_token: 'fake',
    credentials: {
      SELLING_PARTNER_APP_CLIENT_ID: 'fake',
      SELLING_PARTNER_APP_CLIENT_SECRET: 'fake'
    }
  });
  console.log("Instantiated OK");
} catch (e) {
  console.error("Init Error:", e.message);
}
