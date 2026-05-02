const http = require('http');

const data = JSON.stringify({
  invoiceDetails: { invoiceNo: "TEST-INV-1" },
  companyDetails: { gstin: "23AABCU9603R1ZJ" },
  customerDetails: { name: "Test Customer", address: "Test Addr", state: "West Bengal" },
  items: [{ name: "Test Panel", quantity: 1, rate: 1000, tax: 18 }],
  subtotal: 1000,
  cgstTotal: 90,
  sgstTotal: 90,
  grandTotal: 1180
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/admin/invoices',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, res => {
  console.log(`statusCode: ${res.statusCode}`);
  res.on('data', d => {
    process.stdout.write(d);
  });
});

req.on('error', error => {
  console.error(error);
});

req.write(data);
req.end();
