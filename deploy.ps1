# PowerShell Deployment Script for productbrands.com

Write-Host "🚀 Product Brands Deployment Script" -ForegroundColor Cyan
Write-Host "====================================`n" -ForegroundColor Cyan

# Check if logged in to Vercel
Write-Host "Checking Vercel login status..." -ForegroundColor Yellow
$loginCheck = vercel whoami 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Not logged in to Vercel" -ForegroundColor Red
    Write-Host "`nPlease run: vercel login" -ForegroundColor Yellow
    Write-Host "This will open your browser to authenticate.`n" -ForegroundColor Gray
    exit 1
} else {
    Write-Host "✅ Logged in to Vercel" -ForegroundColor Green
    Write-Host "   User: $loginCheck`n" -ForegroundColor Gray
}

# Deploy
Write-Host "📤 Deploying to production..." -ForegroundColor Yellow
vercel --prod

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Deployment successful!`n" -ForegroundColor Green
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Set environment variables (see ENV_VARIABLES_TO_ADD.txt)" -ForegroundColor White
    Write-Host "2. Set up database (see SETUP_DATABASE.md)" -ForegroundColor White
    Write-Host "3. Connect domain in Vercel Dashboard" -ForegroundColor White
    Write-Host "4. Redeploy after adding variables`n" -ForegroundColor White
} else {
    Write-Host "`n❌ Deployment failed. Check errors above.`n" -ForegroundColor Red
}





