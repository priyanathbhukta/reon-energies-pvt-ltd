import axios from 'axios';
import crypto from 'crypto';

const API_URL = process.env.API_URL || 'http://localhost:5000/api';
const NUM_USERS = parseInt(process.env.NUM_USERS || '50');

async function simulatePOSRegistration(i) {
  const uniqueId = crypto.randomBytes(4).toString('hex');
  const dummyUser = {
    fullName: `Test POS ${uniqueId}`,
    email: `test_pos_${uniqueId}@example.com`,
    mobile: `99${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
    altMobile: '',
    shopName: `Solar Tech ${uniqueId}`,
    state: 'West Bengal',
    district: 'Kolkata',
    city: 'Kolkata',
    pincode: '700001',
    address: 'Test Address 123',
    experience: '1-3',
    currentBusiness: 'Electronics',
    businessTurnover: '10L-50L',
    hasGst: false,
    leadSource: 'Agent Test Script'
  };

  try {
    const start = Date.now();
    const res = await axios.post(`${API_URL}/pos/register`, dummyUser);
    const latency = Date.now() - start;
    console.log(`✅ [User ${i}] Registered: ${dummyUser.email} (Latency: ${latency}ms)`);
    return { success: true, latency };
  } catch (error) {
    const errMessage = error.response ? JSON.stringify(error.response.data) : error.message;
    console.error(`❌ [User ${i}] Failed: ${errMessage}`);
    return { success: false, error: errMessage };
  }
}

async function runLoadTest() {
  console.log(`🚀 Starting POS Registration Load Test with ${NUM_USERS} concurrent users...`);
  console.log(`🎯 Target API: ${API_URL}`);
  
  const startTime = Date.now();
  const promises = [];
  
  // Fire off requests concurrently
  for (let i = 1; i <= NUM_USERS; i++) {
    promises.push(simulatePOSRegistration(i));
  }
  
  const results = await Promise.all(promises);
  const totalTime = Date.now() - startTime;
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log('\n📊 --- LOAD TEST RESULTS ---');
  console.log(`Total Requests : ${NUM_USERS}`);
  console.log(`Successful     : ${successful}`);
  console.log(`Failed         : ${failed}`);
  console.log(`Total Time     : ${totalTime}ms`);
  console.log(`Throughput     : ${((successful / totalTime) * 1000).toFixed(2)} req/sec`);
}

runLoadTest();
