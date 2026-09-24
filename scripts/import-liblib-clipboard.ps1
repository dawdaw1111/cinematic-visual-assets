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

    $node = [ordered]@{
      id = "lib-$($item.id)"
      type = $type
      title = [string]$item.title
      scene = [string]$group.name
      x = 80 + ($column * $xGap)
      y = $startY + ($row * $yGap)
      description = "Original $type asset imported from the LibTV project."
      source = "LibTV"
      sourceUrl = [string]$source.project.sourceUrl
      tags = @("LibTV", [string]$group.name)
      metadata = @(
        [ordered]@{ label = "Source"; value = "LibTV original project" },
        [ordered]@{ label = "Group"; value = [string]$group.name }
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
      $node.metadata += [ordered]@{ label = "Prompt"; value = "Read from the original LibTV node" }
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

$coverItem = $source.groups[1].items | Where-Object { $_.type -eq "image" } | Select-Object -First 1
if (-not $coverItem) {
  $coverItem = $source.groups[0].items | Where-Object { $_.type -eq "image" } | Select-Object -First 1
}

$project = [ordered]@{
  id = "huihun"
  title = [string]$source.project.title
  subtitle = "Complete LibTV project import"
  description = "Imported directly from the provided LibTV canvas with its real storyboards, character and scene assets, voice nodes, video outputs, and extracted generation prompt."
  status = "LibTV synced"
  updated = (Get-Date -Format "yyyy-MM-dd")
  duration = "294 nodes"
  accent = "#8b5cf6"
  sourceUrl = [string]$source.project.sourceUrl
  tags = @("LibTV", "Canvas", "Imported")
  cover = [ordered]@{ type = "image"; url = [string]$coverItem.media }
  scenes = @($sceneNames)
  nodes = @($nodes)
  edges = @($edges)
}

$result = [ordered]@{
  version = 2
  importedFrom = [string]$source.project.sourceUrl
  importedAt = [string]$source.project.importedAt
  projects = @([pscustomobject]$project)
}

$resolved = [System.IO.Path]::GetFullPath($OutputPath)
$jsonText = ($result | ConvertTo-Json -Depth 12 -Compress) + [Environment]::NewLine
$utf8NoBom = [System.Text.UTF8Encoding]::new($false)
[System.IO.File]::WriteAllText($resolved, $jsonText, $utf8NoBom)
Write-Output "Imported $($nodes.Count) LibTV content nodes into $resolved"
