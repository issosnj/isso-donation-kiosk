import { DataSource } from 'typeorm';
import { typeOrmConfig } from '../config/typeorm.config';

async function runMigrations() {
  console.log('Starting database migrations...');
  
  const dataSource = new DataSource({
    ...typeOrmConfig(),
    migrations: ['dist/migrations/*.js'],
  });

  try {
    await dataSource.initialize();
    console.log('Database connection established');
    
    const migrations = await dataSource.runMigrations();
    console.log(`Ran ${migrations.length} migration(s)`);
    
    if (migrations.length > 0) {
      migrations.forEach(migration => {
        console.log(`- ${migration.name}`);
      });
    } else {
      console.log('No pending migrations');
    }
    
    await dataSource.destroy();
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Migration error:', error);
    await dataSource.destroy();
    process.exit(1);
  }
}

runMigrations();

