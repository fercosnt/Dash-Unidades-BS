# Subir Dash-Unidades-BS para GitHub (repo so na pasta do projeto)
# Execute na pasta: Dash-Unidades-BS-main

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

# So executar se nao tiver .git (evitar sobrescrever repo existente)
if (Test-Path .git) {
    Write-Host "Ja existe um repo Git aqui. Use: git add . ; git commit -m '...' ; git push -u origin master"
    exit 0
}

git init
git remote add origin https://github.com/Lu1zHenr1qu3/Dash-Unidades-BS.git
git add .
git status

Write-Host ""
Write-Host "Confira acima que .env.local e contexto.txt NAO aparecem em 'Changes to be committed'."
Write-Host "Se estiver ok, rode:"
Write-Host "  git commit -m `"chore: initial commit - Dash Unidades BS`""
Write-Host "  git branch -M main"
Write-Host "  git push -u origin main"
Write-Host ""
Write-Host "Se o GitHub criou o repo com branch 'master', use: git push -u origin master"
