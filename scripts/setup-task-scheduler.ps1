# 管理者として実行してください
# 右クリック → "PowerShellで実行" または "管理者として実行"

$action = New-ScheduledTaskAction `
  -Execute 'C:\Program Files\nodejs\node.exe' `
  -Argument 'C:\Users\pc\unipoll-finance-demo\scripts\weekly-sync.mjs'

$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At '07:57'

$settings = New-ScheduledTaskSettingsSet `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 10) `
  -RestartCount 2 `
  -RestartInterval (New-TimeSpan -Minutes 5)

Register-ScheduledTask `
  -TaskName 'UniPoll週次freeeSync' `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -RunLevel Highest `
  -Force

Write-Host "✅ タスクスケジューラに登録しました（毎週月曜 07:57）"
Write-Host "確認: タスクスケジューラ → タスクスケジューラライブラリ → UniPoll週次freeeSync"
