const axios = require('axios');

const BASE_URL = 'https://app.humaans.io/api';
const PAGE_SIZE = 250;

let employees = [];

function client() {
  return axios.create({
    baseURL: BASE_URL,
    headers: { Authorization: `Bearer ${process.env.HUMAANS_API_KEY}` },
  });
}

async function fetchAll(path) {
  const http = client();
  const all = [];
  let skip = 0;
  while (true) {
    const { data } = await http.get(path, { params: { $limit: PAGE_SIZE, $skip: skip } });
    const page = data.data || [];
    all.push(...page);
    if (page.length < PAGE_SIZE) break;
    skip += PAGE_SIZE;
  }
  return all;
}

function pickCurrentRoles(jobRoles) {
  const today = new Date().toISOString().slice(0, 10);
  const byPerson = new Map();
  for (const r of jobRoles) {
    if (r.effectiveDate && r.effectiveDate > today) continue;
    const existing = byPerson.get(r.personId);
    if (!existing || (r.effectiveDate || '') > (existing.effectiveDate || '')) {
      byPerson.set(r.personId, r);
    }
  }
  return byPerson;
}

function buildLocation(person, locationsById) {
  if (person.locationId === 'remote' || !person.locationId) {
    const parts = [person.remoteCity, person.remoteCountry].filter(Boolean);
    return parts.length ? `${parts.join(', ')} (remote)` : '';
  }
  const loc = locationsById.get(person.locationId);
  if (!loc) return '';
  return loc.displayName || loc.label || [loc.city, loc.country].filter(Boolean).join(', ');
}

async function syncHumaans() {
  try {
    console.log('🔄 Syncing Humaans...');

    const [people, jobRoles, locations] = await Promise.all([
      fetchAll('/people'),
      fetchAll('/job-roles'),
      fetchAll('/locations'),
    ]);

    const rolesByPerson = pickCurrentRoles(jobRoles);
    const locationsById = new Map(locations.map(l => [l.id, l]));

    employees = people
      .filter(p => p.status === 'active')
      .map(p => {
        const role = rolesByPerson.get(p.id);
        return {
          id: p.id,
          firstName: p.preferredName || p.firstName || '',
          surname: p.lastName || '',
          position: role?.jobTitle || '',
          department: role?.department || '',
          location: buildLocation(p, locationsById),
          timezone: p.timezone || p.remoteTimezone || '',
          slackHandle: p.email?.split('@')[0] || '',
          email: p.email || '',
        };
      });

    console.log(`✅ Synced ${employees.length} employees`);
  } catch (error) {
    console.error('❌ Humaans sync failed:', error.response?.status, error.message);
  }
}

function getEmployees() {
  return employees;
}

module.exports = { syncHumaans, getEmployees };
