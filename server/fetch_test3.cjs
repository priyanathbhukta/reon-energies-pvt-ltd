const jwt = require('jsonwebtoken');
const token = jwt.sign({ id: 1 }, 'reon_energy_admin_secret_key_2026');
const json = {"customer_name":"Test New","address":"","contact_number":"","email":"","state":"West Bengal","project_category":"Residential","roof_type":"Sheet Roof / Grounded RCC with GI","project_location":"Test","electricity_provider":"WBSEDCL","monthly_bill":"","power_factor":"","system_capacity_kw":"5","panel_watt":"590","module_technology":"Mono-Crystalline Bifacial N-Type Topcon Silicon Technology","inverter_type":"String Inverter (On-Grid)","brands":"UTL / ADANI / VIKRAM / LUMINOUS / SOLIS / TATA","power_evacuation":"230 VAC Single Phase","project_type":"Turnkey EPC Project","rate_per_watt":"45","payment_mode":"Cash","emi_down_payment":"50000","emi_roi":"7","emi_tenure":"60","quotation_no_seq":"999","capacity":"5 kWp","panel_count":9,"offer_no":"REPL/26-27/999","offerNo":"REPL/26-27/999","base_price":"2,25,000","gst_amount":"11,250","total_price":"2,36,250","totalCost":"2,36,250","financeParameters":null};

fetch('http://localhost:5000/api/admin/quotations', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify(json)
}).then(r => r.json()).then(console.log).catch(console.error);
