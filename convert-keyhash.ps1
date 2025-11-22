# 키 해시를 Base64 형식으로 변환하는 스크립트
# 사용법: .\convert-keyhash.ps1

# 현재 입력된 키 해시 (콜론 포함 16진수)
$hexHash = "6B:2E:A2:B6:C3:1D:7A:06:B6:C7:FD:CF:20:99:5A:DC:89:13:8E:86"

# 콜론 제거
$hexHash = $hexHash -replace ":", ""

# 16진수를 바이트 배열로 변환
$bytes = for ($i = 0; $i -lt $hexHash.Length; $i += 2) {
    [Convert]::ToByte($hexHash.Substring($i, 2), 16)
}

# Base64로 인코딩
$base64Hash = [Convert]::ToBase64String($bytes)

Write-Host "Base64 키 해시:"
Write-Host $base64Hash

