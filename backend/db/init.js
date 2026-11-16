const initDatabase = require('./database');

const db = initDatabase();

console.log('Database initialized successfully');
console.log('Tables created: users, job_seeker_profiles, employer_profiles, jobs, applications');

db.close();
process.exit(0);
