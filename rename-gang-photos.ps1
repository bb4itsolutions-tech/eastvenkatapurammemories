<#
  rename-gang-photos.ps1

  Run this ONCE from inside your repo folder (the one with index.html in it),
  e.g.:
      cd D:\East_Venkatapuram
      .\rename-gang-photos.ps1

  What it does, for every folder matching "<year>_group_photos" (any case):
    1. Renames the folder itself to lowercase, e.g. 2024_Group_photos -> 2024_group_photos
    2. Renames every image file inside it to plain numbers: 1.jpg, 2.jpg, 3.jpg ...
       (sorted by current filename, so 01.jpg/02.jpg becomes 1.jpg/2.jpg in the same order)

  It only touches folders that already look like "<4 digits>_group_photos"
  (case-insensitive), so it won't touch anything else in the repo.

  It's safe to run more than once — already-correct folders/files are left
  alone.
#>

$root = Get-Location
Write-Host "Scanning $root for Gang photo folders..." -ForegroundColor Cyan

$imageExtensions = @('.jpg', '.jpeg', '.png', '.webp', '.gif')

Get-ChildItem -Directory -Path $root |
  Where-Object { $_.Name -match '^(\d{4})_group_photos$' -or $_.Name -match '^(\d{4})_Group_photos$' -or $_.Name -match '^(\d{4})_Group_Photos$' } |
  ForEach-Object {
    $folder = $_
    $year = [regex]::Match($folder.Name, '^\d{4}').Value
    $targetFolderName = "${year}_group_photos"

    # Step 1: rename the folder to lowercase, if needed
    if($folder.Name -cne $targetFolderName){
      $tempName = "$($folder.Name)__tmp_rename"
      Rename-Item -Path $folder.FullName -NewName $tempName
      Rename-Item -Path (Join-Path $root $tempName) -NewName $targetFolderName
      Write-Host "Renamed folder: $($folder.Name) -> $targetFolderName" -ForegroundColor Green
    } else {
      Write-Host "Folder already correct: $targetFolderName" -ForegroundColor DarkGray
    }

    $folderPath = Join-Path $root $targetFolderName

    # Step 2: renumber every image file inside, in current filename order
    $files = Get-ChildItem -File -Path $folderPath |
      Where-Object { $imageExtensions -contains $_.Extension.ToLower() } |
      Sort-Object Name

    if($files.Count -eq 0){
      Write-Host "  (no image files found in $targetFolderName)" -ForegroundColor DarkGray
      return
    }

    # Rename to temporary names first to avoid collisions (e.g. 2.jpg already
    # existing when we try to rename 1.jpg.jpg -> 2.jpg)
    $i = 1
    $tempMap = @()
    foreach($file in $files){
      $tempName = "__tmp_$i.jpg"
      Rename-Item -Path $file.FullName -NewName $tempName
      $tempMap += (Join-Path $folderPath $tempName)
      $i++
    }

    $i = 1
    foreach($tempPath in $tempMap){
      $finalName = "$i.jpg"
      Rename-Item -Path $tempPath -NewName $finalName
      Write-Host "  -> $finalName"
      $i++
    }

    Write-Host "  $targetFolderName done: $($files.Count) photo(s) numbered 1..$($files.Count)" -ForegroundColor Green
  }

Write-Host "`nAll done. Review the folders, then commit and push / re-upload to GitHub." -ForegroundColor Cyan
Write-Host "Note: file extensions were all standardized to .jpg regardless of original format (PNG etc.)." -ForegroundColor Yellow
Write-Host "This works fine for display in the browser, but if you'd rather keep true JPGs only, convert PNG/HEIC photos to JPG before running this script." -ForegroundColor Yellow