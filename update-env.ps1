# Script to update .env with PostgreSQL password
param(
    [Parameter(Mandatory=$true)]
    [string]$Password
)

$envContent = @"
DATABASE_URL=postgresql://postgres:$Password@localhost:5432/productbrands
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=dev-secret-key-change-in-production-replace-with-random-string
EMAIL_FROM=noreply@productbrands.com
CONTACT_EMAIL=info@productbrands.com
"@

$envContent | Out-File -FilePath .env -Encoding utf8 -NoNewline
Write-Host "✅ .env file updated with your PostgreSQL password!"
Write-Host ""
Write-Host "Now run these commands:"
Write-Host "  npm run db:push"
Write-Host "  npm run db:seed"
Write-Host "  npm run dev"

