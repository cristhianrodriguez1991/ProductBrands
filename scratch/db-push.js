const { execSync } = require('child_process');
const path = require('path');

const nodePath = '/Users/cristhian/.nvm/versions/node/v24.15.0/bin/node';
const npxPath = '/Users/cristhian/.nvm/versions/node/v24.15.0/bin/npx';
const projectDir = '/Users/cristhian/Desktop/ProductBrand Code';

try {
  console.log('Running prisma db push...');
  execSync(`${npxPath} prisma db push`, {
    cwd: projectDir,
    env: {
      ...process.env,
      PATH: `${process.env.PATH}:/Users/cristhian/.nvm/versions/node/v24.15.0/bin`,
      DATABASE_URL: "postgresql://neondb_owner:npg_0BjVpNHbtrf7@ep-dark-field-ahhqbnn4-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require"
    },
    stdio: 'inherit'
  });
  console.log('Running prisma generate...');
  execSync(`${npxPath} prisma generate`, {
    cwd: projectDir,
    env: {
      ...process.env,
      PATH: `${process.env.PATH}:/Users/cristhian/.nvm/versions/node/v24.15.0/bin`
    },
    stdio: 'inherit'
  });
} catch (error) {
  console.error('Failed to run prisma commands:', error.message);
}
