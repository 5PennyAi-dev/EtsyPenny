import fetch from 'node-fetch';

async function testResetPool() {
  // Replace this ID with a valid listing ID from your local DB once you have one to test
  // This is a placeholder for demonstrating the call structure
  const listingId = '12345678-1234-1234-1234-123456789012'; 

  console.log(`Testing /api/seo/reset-pool with listing_id: ${listingId}`);

  try {
    const response = await fetch('http://localhost:3000/api/seo/reset-pool', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ listing_id: listingId }),
    });

    const data = await response.json();
    console.log('Status code:', response.status);
    console.log('Response body:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error calling route:', error);
  }
}

testResetPool();
