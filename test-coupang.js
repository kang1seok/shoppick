const crypto = require('crypto');
require('dotenv').config({ path: '.env.local' });

const method = 'GET';
const kw = encodeURIComponent('로봇청소기 추천');
const url = `/v2/providers/affiliate_open_api/apis/openapi/products/search?keyword=${kw}&limit=10`;
const ak = process.env.COUPANG_ACCESS_KEY;
const sk = process.env.COUPANG_SECRET_KEY;

const dt = new Date().toISOString().substring(2, 19).replace(/[-:]/g, '') + 'Z';
const [p, q] = url.split('?');
const msg = dt + method + p + q;
const sig = crypto.createHmac('sha256', sk).update(msg).digest('hex');
const auth = `CEA algorithm=HmacSHA256, access-key=${ak}, signed-date=${dt}, signature=${sig}`;

fetch('https://api-gateway.coupang.com' + url, { headers: { Authorization: auth } })
  .then(r => r.json())
  .then(data => console.log(JSON.stringify(data).substring(0, 500)))
  .catch(console.error);
