# Opens an interactive SSH session to finish Mint setup (5 GHz + AdGuard). Requires your sudo password once.
$remote = "mint-home"
$remoteScript = "/home/yassenshopov/scripts/mint-sudo-network-setup.sh"
Write-Host "Connecting to $remote - enter sudo password when prompted."
ssh -t $remote sudo bash $remoteScript
