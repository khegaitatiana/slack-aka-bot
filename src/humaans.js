const axios = require('axios');

let employees = [];

async function syncHumaans() {
  try {
    console.log('🔄 Syncing Humaans...');

    const response = await axios.get('https://api.humaans.io/v1/employees', {
      headers: {
        Authorization: `Bearer ${process.env.HUMAANS_API_KEY}`,
        'Organization-Id': process.env.HUMAANS_ORG_ID,
      },
    });

    employees = response.data
      .filter(emp => emp.status === 'active')
      .map(emp => ({
        id: emp.id,
        firstName: emp.firstName || '',
        surname: emp.surname || '',
        position: emp.jobTitle || emp.role || '',
        department: emp.department?.name || '',
        location: emp.workLocation?.name || emp.location || '',
        timezone: emp.timezone || '',
        slackHandle: emp.slackId || emp.email?.split('@')[0] || '',
        email: emp.email || '',
      }));

    console.log(`✅ Synced ${employees.length} employees`);
  } catch (error) {
    console.error('❌ Humaans sync failed:', error.message);
  }
}

function getEmployees() {
  return employees;
}

module.exports = { syncHumaans, getEmployees };
