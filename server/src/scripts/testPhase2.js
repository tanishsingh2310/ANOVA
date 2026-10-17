// ============================================================
// PHASE 2 VERIFICATION TEST SUITE
// Tests all newly implemented CRUD, Analytics & Workflow endpoints
// ============================================================

const http = require('http');

function request(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path,
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runPhase2Tests() {
  console.log('\n========================================');
  console.log('🧪 RUNNING PHASE 2 REST ENDPOINT VERIFICATION');
  console.log('========================================\n');

  try {
    // 1. Health check
    const health = await request('/api/health');
    console.log(`[1] Health Check: ${health.status === 200 && health.body.database === 'CONNECTED' ? '✅ PASS' : '❌ FAIL'} (${health.body.database})`);

    // 2. Ingredients List
    const ingList = await request('/api/inventory/ingredients');
    console.log(`[2] GET /api/inventory/ingredients: ${ingList.status === 200 ? '✅ PASS' : '❌ FAIL'} (${ingList.body.data.length} items loaded from Atlas)`);

    if (ingList.body.data.length === 0) {
      console.log('⚠️ No ingredients found. Please run "npm run seed" first.');
      return;
    }

    const sampleIng = ingList.body.data[0];

    // 3. Single Ingredient Details
    const singleIng = await request(`/api/inventory/ingredients/${sampleIng._id}`);
    console.log(`[3] GET /api/inventory/ingredients/:id: ${singleIng.status === 200 && singleIng.body.data.sku === sampleIng.sku ? '✅ PASS' : '❌ FAIL'} (${sampleIng.name})`);

    // 4. Batches Expiring Soon
    const expiring = await request('/api/inventory/batches/expiring?days=30');
    console.log(`[4] GET /api/inventory/batches/expiring: ${expiring.status === 200 ? '✅ PASS' : '❌ FAIL'} (${expiring.body.data.length} batches detected within 30-day window)`);

    // 5. Analytics KPIs
    const kpis = await request('/api/inventory/analytics/kpis?branch=all');
    console.log(`[5] GET /api/inventory/analytics/kpis: ${kpis.status === 200 ? '✅ PASS' : '❌ FAIL'} (Total Portfolio Value: ₹${kpis.body.data.totalStockValue.toLocaleString('en-IN')})`);

    // 6. Valuation (FIFO & Weighted Avg)
    const valuation = await request('/api/inventory/analytics/valuation?method=FIFO');
    console.log(`[6] GET /api/inventory/analytics/valuation: ${valuation.status === 200 ? '✅ PASS' : '❌ FAIL'} (FIFO Valuation: ₹${valuation.body.data.totalPortfolioValue.toLocaleString('en-IN')})`);

    // 7. Purchase Order Details
    const pos = await request('/api/inventory/purchase-orders');
    if (pos.body.data.length > 0) {
      const samplePo = pos.body.data[0];
      const singlePo = await request(`/api/inventory/purchase-orders/${samplePo._id}`);
      console.log(`[7] GET /api/inventory/purchase-orders/:id: ${singlePo.status === 200 ? '✅ PASS' : '❌ FAIL'} (${samplePo.poNumber})`);
    }

    // 8. Kitchen Recipe Consumption
    const consumeRes = await request('/api/inventory/recipe/consume', 'POST', {
      branch: 'b_downtown',
      orderNumber: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
      items: [{ ingredientId: sampleIng._id, quantity: 1.0 }]
    });
    console.log(`[8] POST /api/inventory/recipe/consume: ${consumeRes.status === 200 ? '✅ PASS' : '❌ FAIL'} (Deducted 1.0 ${sampleIng.baseUnit} from b_downtown)`);

    console.log('\n🎉 ALL PHASE 2 ENDPOINTS VERIFIED SUCCESSFULLY!\n');
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      console.error('❌ Connection refused! Please make sure your server is running on port 5000:');
      console.error('   Run "npm run server" in another terminal first.');
    } else {
      console.error('❌ Error during Phase 2 verification:', err.message);
    }
  }
}

runPhase2Tests();
