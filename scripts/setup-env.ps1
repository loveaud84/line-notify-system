# สร้างไฟล์ .env โดยถามรหัสผ่าน PostgreSQL ในเทอร์มินัลนี้
#
# รหัสผ่านจะไม่ถูกแสดงบนหน้าจอ และไม่ถูกบันทึกไว้ใน history ของ PowerShell
# ใช้งาน:  powershell -ExecutionPolicy Bypass -File scripts\setup-env.ps1

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $root '.env'
$examplePath = Join-Path $root '.env.example'

if (Test-Path $envPath) {
    $answer = Read-Host "มีไฟล์ .env อยู่แล้ว ต้องการเขียนทับหรือไม่? (y/N)"
    if ($answer -ne 'y') {
        Write-Host "ยกเลิก — ไม่มีการเปลี่ยนแปลง"
        exit 0
    }
}

Write-Host ""
Write-Host "ตั้งค่าการเชื่อมต่อ PostgreSQL" -ForegroundColor Cyan
Write-Host ""

$dbUser = Read-Host "ชื่อผู้ใช้ PostgreSQL (กด Enter เพื่อใช้ 'postgres')"
if ([string]::IsNullOrWhiteSpace($dbUser)) { $dbUser = 'postgres' }

$dbHost = Read-Host "โฮสต์ (กด Enter เพื่อใช้ 'localhost')"
if ([string]::IsNullOrWhiteSpace($dbHost)) { $dbHost = 'localhost' }

$dbPort = Read-Host "พอร์ต (กด Enter เพื่อใช้ '5432')"
if ([string]::IsNullOrWhiteSpace($dbPort)) { $dbPort = '5432' }

$dbName = Read-Host "ชื่อฐานข้อมูล (กด Enter เพื่อใช้ 'line_notify')"
if ([string]::IsNullOrWhiteSpace($dbName)) { $dbName = 'line_notify' }

# -AsSecureString: ตัวอักษรจะไม่ปรากฏบนหน้าจอขณะพิมพ์
$securePassword = Read-Host "รหัสผ่านของผู้ใช้ $dbUser" -AsSecureString
$plainPassword = [System.Net.NetworkCredential]::new('', $securePassword).Password

if ([string]::IsNullOrEmpty($plainPassword)) {
    Write-Host "ไม่ได้ระบุรหัสผ่าน — ยกเลิก" -ForegroundColor Red
    exit 1
}

# เข้ารหัสอักขระพิเศษในรหัสผ่าน เพื่อไม่ให้ทำให้ connection string เพี้ยน
$encodedPassword = [System.Uri]::EscapeDataString($plainPassword)
$encodedUser = [System.Uri]::EscapeDataString($dbUser)

$connectionString = "postgresql://${encodedUser}:${encodedPassword}@${dbHost}:${dbPort}/${dbName}"

# เริ่มจากเทมเพลตใน .env.example แล้วแทนค่าบรรทัด DATABASE_URL
$content = Get-Content $examplePath -Raw -Encoding UTF8
$content = $content -replace '(?m)^DATABASE_URL=.*$', "DATABASE_URL=$connectionString"

# UTF8 ไม่มี BOM เพื่อให้ตัวอ่าน .env ฝั่ง Node แยกบรรทัดแรกได้ถูกต้อง
[System.IO.File]::WriteAllText($envPath, $content, [System.Text.UTF8Encoding]::new($false))

# ล้างรหัสผ่านออกจากหน่วยความจำของสคริปต์
$plainPassword = $null
$encodedPassword = $null
[System.GC]::Collect()

Write-Host ""
Write-Host "สร้างไฟล์ .env เรียบร้อยแล้ว" -ForegroundColor Green
Write-Host "  ผู้ใช้:      $dbUser"
Write-Host "  โฮสต์:      ${dbHost}:${dbPort}"
Write-Host "  ฐานข้อมูล:  $dbName"
Write-Host "  รหัสผ่าน:   (ซ่อนไว้ในไฟล์ .env ซึ่งถูก gitignore แล้ว)"
Write-Host ""
Write-Host "ขั้นต่อไป: npm run db:setup" -ForegroundColor Cyan
