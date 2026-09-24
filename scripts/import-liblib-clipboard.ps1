param(
  [string]$SourcePath = (Join-Path $PSScriptRoot "..\data\liblib-project-export.json"),
  [string]$OutputPath = (Join-Path $PSScriptRoot "..\public\data\video-projects.json")
)

$ErrorActionPreference = "Stop"
$sourceResolved = [System.IO.Path]::GetFullPath($SourcePath)
$raw = [System.IO.File]::ReadAllText($sourceResolved, [System.Text.Encoding]::UTF8)
if ([string]::IsNullOrWhiteSpace($raw)) {
  throw "The LibTV export payload is empty."
}

$source = $raw | ConvertFrom-Json
if (-not $source.project -or -not $source.groups) {
  throw "The source file is not a recognized LibTV project export."
}
$projectTitle = ([string]$source.project.title -replace '\s*[-－—]\s*副本\s*$', '').Trim()

$nodes = [System.Collections.Generic.List[object]]::new()
$edges = [System.Collections.Generic.List[object]]::new()
$sceneNames = [System.Collections.Generic.List[string]]::new()
$groupStarts = @(80, 4440, 5540)
$columnsPerGroup = @(10, 7, 10)
$xGap = 326
$yGap = 286

for ($groupIndex = 0; $groupIndex -lt $source.groups.Count; $groupIndex++) {
  $group = $source.groups[$groupIndex]
  $sceneNames.Add([string]$group.name)
  $columns = $columnsPerGroup[$groupIndex]
  $startY = $groupStarts[$groupIndex]
  $previousInRow = $null

  for ($itemIndex = 0; $itemIndex -lt $group.items.Count; $itemIndex++) {
    $item = $group.items[$itemIndex]
    $column = $itemIndex % $columns
    $row = [math]::Floor($itemIndex / $columns)
    $type = [string]$item.type

    $typeLabel = @{ image = '图片素材'; video = '视频镜头'; audio = '音色素材' }[$type]
    if (-not $typeLabel) { $typeLabel = '项目节点' }
    $node = [ordered]@{
      id = "lib-$($item.id)"
      type = $type
      title = [string]$item.title
      scene = [string]$group.name
      x = 80 + ($column * $xGap)
      y = $startY + ($row * $yGap)
      description = "$typeLabel · $([string]$group.name)"
      tags = @([string]$group.name)
      metadata = @(
        [ordered]@{ label = "分组"; value = [string]$group.name }
      )
    }

    if (-not [string]::IsNullOrWhiteSpace([string]$item.media)) {
      $node.media = [ordered]@{ type = $type; url = [string]$item.media }
    }
    if (-not [string]::IsNullOrWhiteSpace([string]$item.preview)) {
      $node.preview = [string]$item.preview
    }
    $itemPrompt = [string]$item.prompt
    if ([string]::IsNullOrWhiteSpace($itemPrompt) -and $source.featured -and [string]$item.media -eq [string]$source.featured.video) {
      $itemPrompt = [string]$source.featured.prompt
    }
    if (-not [string]::IsNullOrWhiteSpace($itemPrompt)) {
      $node.prompt = $itemPrompt
    }
    if (-not [string]::IsNullOrWhiteSpace([string]$item.negativePrompt)) {
      $node.negativePrompt = [string]$item.negativePrompt
    }

    $nodes.Add([pscustomobject]$node)
    if ($column -eq 0) {
      $previousInRow = $null
    }
    if ($null -ne $previousInRow) {
      $edges.Add([pscustomobject][ordered]@{ from = $previousInRow; to = $node.id })
    }
    $previousInRow = $node.id
  }
}

$coverItem = $source.groups | ForEach-Object { $_.items } | Where-Object { $_.title -eq "封面" -and $_.type -eq "image" -and $_.media } | Select-Object -First 1
if (-not $coverItem) {
  $coverItem = $source.groups[1].items | Where-Object { $_.type -eq "image" } | Select-Object -First 1
}
if (-not $coverItem) {
  $coverItem = $source.groups[0].items | Where-Object { $_.type -eq "image" } | Select-Object -First 1
}

$project = [ordered]@{
  id = "huihun"
  title = $projectTitle
  subtitle = "分镜与视频创作画布"
  description = "汇集分镜画面、人物与场景设定、音色素材和视频镜头。"
  status = "创作档案"
  updated = (Get-Date -Format "yyyy-MM-dd")
  duration = "$($nodes.Count) 个节点"
  accent = "#8b5cf6"
  tags = @("分镜", "角色设定", "视频镜头")
  cover = [ordered]@{ type = "image"; url = [string]$coverItem.media }
  scenes = @($sceneNames)
  nodes = @($nodes)
  edges = @($edges)
}

$result = [ordered]@{
  version = 2
  importedAt = [string]$source.project.importedAt
  projects = @([pscustomobject]$project)
}

$resolved = [System.IO.Path]::GetFullPath($OutputPath)
$jsonText = ($result | ConvertTo-Json -Depth 12 -Compress) + [Environment]::NewLine
$utf8NoBom = [System.Text.UTF8Encoding]::new($false)
[System.IO.File]::WriteAllText($resolved, $jsonText, $utf8NoBom)
Write-Output "Imported $($nodes.Count) LibTV content nodes into $resolved"
