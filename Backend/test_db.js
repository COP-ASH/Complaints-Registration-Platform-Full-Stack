import { db } from './src/db/index.js';

async function test() {
  try {
    console.log('Querying database...');
    const result = await db.query.users.findMany();
    console.log('Database query successful. Result count:', result.length);
    console.log('Result sample:', result.slice(0, 5));
    process.exit(0);
  } catch (error) {
    console.error('Error querying database:', error);
    process.exit(1);
  }
}

test();
