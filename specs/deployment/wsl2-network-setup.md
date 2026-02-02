# WSL2 Network Setup Guide

**Purpose:** Enable network access from physical devices (phones, tablets) to backend running in WSL2.

**Problem:** WSL2 uses a separate network interface with NAT, making services running inside WSL2 inaccessible from your local network by default.

**Solution:** Set up Windows port forwarding to route traffic from Windows host to WSL2.

**Related Documentation:**
- [Infrastructure Setup](./infrastructure-setup.md) - Docker services configuration
- [Phase 2 Deployment](./phase-2-deployment.md) - Complete deployment guide
- Backend README - Quick start guide

---

## When You Need This

You need WSL2 network setup when:

1. **Testing mobile app on physical device** (phone connected to same WiFi)
2. **Testing from another computer** on your local network
3. Backend runs in WSL2 but needs to be accessible from Windows network
4. Mobile app needs to connect to backend at `http://<YOUR_IP>:3000`

**You DON'T need this if:**
- Using Android emulator (use `10.0.2.2:3000`)
- Using iOS simulator on macOS (use `localhost:3000`)
- Backend runs directly on Windows (not WSL2)

---

## Prerequisites

- Windows 10/11 with WSL2 installed
- Administrator access to Windows
- Backend running in WSL2 on port 3000
- Physical device on same WiFi network as Windows PC

---

## Step-by-Step Setup

### Step 1: Get WSL2 IP Address

In your WSL2 terminal:

```bash
# Get WSL2 IP address
hostname -I | awk '{print $1}'
```

**Example output:**
```
172.25.165.11
```

**Note:** This IP address changes when WSL2 restarts. You'll need to update port forwarding if it changes.

**Save this IP** - you'll need it in Step 2.

---

### Step 2: Set Up Port Forwarding (Windows PowerShell as Administrator)

1. **Open PowerShell as Administrator:**
   - Press `Win + X`
   - Select **Windows PowerShell (Admin)** or **Terminal (Admin)**

2. **Add port forwarding rule:**

```powershell
# Replace <WSL2_IP> with the IP from Step 1
netsh interface portproxy add v4tov4 listenport=3000 listenaddress=0.0.0.0 connectport=3000 connectaddress=<WSL2_IP>
```

**Example:**
```powershell
netsh interface portproxy add v4tov4 listenport=3000 listenaddress=0.0.0.0 connectport=3000 connectaddress=172.25.165.11
```

**What this does:**
- `listenport=3000` - Windows listens on port 3000
- `listenaddress=0.0.0.0` - Accept from any network interface
- `connectport=3000` - Forward to port 3000 in WSL2
- `connectaddress=<WSL2_IP>` - WSL2 destination IP

---

### Step 3: Allow Through Windows Firewall

Still in PowerShell (as Administrator):

```powershell
# Add firewall rule to allow port 3000
netsh advfirewall firewall add rule name="WSL Backend Port 3000" dir=in action=allow protocol=TCP localport=3000
```

**What this does:**
- Creates inbound firewall rule for port 3000
- Allows traffic from local network to reach the backend

---

### Step 4: Get Windows IP Address

You need your Windows machine's IP address to connect from mobile device.

**Option A: From WSL2 (easiest)**

When you start the backend with `npm run start:dev`, it automatically detects and displays your Windows IP:

```
🌐 Network access: http://192.168.1.100:3000
```

Look for the "🌐 Network access" line in console output.

**Option B: From Windows CMD/PowerShell:**

```powershell
ipconfig | findstr IPv4
```

**Example output:**
```
IPv4 Address. . . . . . . . . . . : 192.168.1.100
```

**Option C: Check Windows network settings:**
1. Settings → Network & Internet → WiFi (or Ethernet)
2. Click on your connected network
3. Look for IPv4 address

---

### Step 5: Verify Access

#### Test from WSL2

```bash
# Use the Windows IP you found in Step 4
curl http://<YOUR_WINDOWS_IP>:3000/api/health
```

**Example:**
```bash
curl http://192.168.1.100:3000/api/health
```

**Expected response:**
```json
{"status":"ok","timestamp":"2026-02-02T...","uptime":123.456,"environment":"development"}
```

#### Test from Mobile Device

1. Ensure phone is on **same WiFi network** as Windows PC
2. Open browser on phone
3. Visit: `http://<YOUR_WINDOWS_IP>:3000/api/health`
4. Should see the health check JSON response

---

### Step 6: Configure Mobile App

Update `fe/mobile/.env`:

```bash
# Use the Windows IP from Step 4
API_BASE_URL=http://192.168.1.100:3000
API_VERSION=v1

# Final URL will be: http://192.168.1.100:3000/api/v1
```

**Rebuild mobile app after changing .env:**

```bash
cd fe/mobile

# Android
npm run android

# iOS
npm run ios
```

---

## Managing Port Forwarding

### View Current Port Forwarding Rules

```powershell
# List all port forwarding rules
netsh interface portproxy show all
```

**Example output:**
```
Listen on ipv4:             Connect to ipv4:

Address         Port        Address         Port
--------------- ----------  --------------- ----------
0.0.0.0         3000        172.25.165.11   3000
```

---

### Update Port Forwarding (When WSL2 IP Changes)

When you restart WSL2, the IP address may change. You need to update the rule.

1. **Get new WSL2 IP:**
```bash
hostname -I | awk '{print $1}'
```

2. **Delete old rule:**
```powershell
netsh interface portproxy delete v4tov4 listenport=3000 listenaddress=0.0.0.0
```

3. **Add new rule with updated IP:**
```powershell
netsh interface portproxy add v4tov4 listenport=3000 listenaddress=0.0.0.0 connectport=3000 connectaddress=<NEW_WSL2_IP>
```

---

### Remove Port Forwarding (When Done)

In Windows PowerShell (as Administrator):

```powershell
# Remove port forwarding rule
netsh interface portproxy delete v4tov4 listenport=3000 listenaddress=0.0.0.0

# Remove firewall rule
netsh advfirewall firewall delete rule name="WSL Backend Port 3000"
```

---

## Troubleshooting

### Mobile App Can't Connect to Backend

**Symptoms:**
- Mobile app shows "Network Error"
- API requests timeout
- Cannot access `http://<IP>:3000/api/health`

**Solutions:**

1. **Verify backend is running:**
```bash
# In WSL2
curl http://localhost:3000/api/health
```

2. **Check port forwarding is active:**
```powershell
# In Windows PowerShell
netsh interface portproxy show all
# Should show port 3000 rule
```

3. **Verify firewall rule exists:**
```powershell
netsh advfirewall firewall show rule name="WSL Backend Port 3000"
```

4. **Check Windows IP hasn't changed:**
```powershell
ipconfig | findstr IPv4
```

5. **Ensure phone and PC on same WiFi network:**
- Check WiFi settings on phone
- Verify Windows is connected to same network

6. **Test from Windows browser:**
- Open browser on Windows
- Visit `http://localhost:3000/api/health`
- Should work if backend is running

---

### WSL2 IP Address Keeps Changing

**Problem:** WSL2 IP changes after reboot, breaking port forwarding.

**Quick Fix:**
```bash
# 1. Get new WSL2 IP
hostname -I | awk '{print $1}'

# 2. Update port forwarding (PowerShell as Admin)
netsh interface portproxy delete v4tov4 listenport=3000 listenaddress=0.0.0.0
netsh interface portproxy add v4tov4 listenport=3000 listenaddress=0.0.0.0 connectport=3000 connectaddress=<NEW_IP>
```

**Permanent Solution (Windows 11):**

Create `.wslconfig` in `C:\Users\<YourUsername>\`:

```ini
[wsl2]
networkingMode=mirrored
```

This mirrors the Windows network to WSL2, making `localhost` work without port forwarding (requires Windows 11 22H2+).

---

### Firewall Blocking Connections

**Symptoms:**
- Port forwarding rule exists
- Can't access from mobile device
- Windows firewall is enabled

**Solution:**

1. **Check if firewall rule exists:**
```powershell
netsh advfirewall firewall show rule name="WSL Backend Port 3000"
```

2. **If not found, add it:**
```powershell
netsh advfirewall firewall add rule name="WSL Backend Port 3000" dir=in action=allow protocol=TCP localport=3000
```

3. **Or temporarily disable firewall (for testing only):**
- Settings → Windows Security → Firewall & network protection
- Turn off for **private network** only (not recommended for production)

---

### Port Already in Use

**Symptoms:**
```
Error: Port 3000 is already in use
```

**Solution:**

```powershell
# Find what's using port 3000
netstat -ano | findstr :3000

# Kill the process (replace <PID> with actual process ID)
taskkill /PID <PID> /F

# Or use different port in WSL2
PORT=3001 npm run start:dev

# Update port forwarding to match
netsh interface portproxy add v4tov4 listenport=3001 listenaddress=0.0.0.0 connectport=3001 connectaddress=<WSL2_IP>
```

---

### Can Access from PC but Not from Phone

**Possible Causes:**
1. Phone on different WiFi network (guest network, 5GHz vs 2.4GHz)
2. Router has AP isolation enabled
3. Mobile firewall blocking connection

**Solutions:**

1. **Verify same network:**
```bash
# Get phone's IP (Settings → WiFi → Connected Network)
# Should be same subnet as Windows IP
# e.g., both 192.168.1.x
```

2. **Disable AP isolation (router settings):**
- Router admin page → Wireless settings
- Disable "AP Isolation" or "Client Isolation"

3. **Try using mobile data:**
- Disconnect WiFi on phone
- Use mobile data to access (won't work - proves it's WiFi issue)

---

## Advanced: Automated Script

Save as `setup-wsl-network.ps1` (PowerShell script):

```powershell
# Run as Administrator
$wslIP = bash.exe -c "hostname -I | awk '{print `$1}'"
$wslIP = $wslIP.Trim()

Write-Host "WSL2 IP: $wslIP"

# Remove old rule if exists
netsh interface portproxy delete v4tov4 listenport=3000 listenaddress=0.0.0.0 2>$null

# Add new rule
netsh interface portproxy add v4tov4 listenport=3000 listenaddress=0.0.0.0 connectport=3000 connectaddress=$wslIP

# Add firewall rule if not exists
$firewallRule = Get-NetFirewallRule -DisplayName "WSL Backend Port 3000" -ErrorAction SilentlyContinue
if (-not $firewallRule) {
    netsh advfirewall firewall add rule name="WSL Backend Port 3000" dir=in action=allow protocol=TCP localport=3000
}

Write-Host "Port forwarding configured successfully!"
Write-Host "Backend accessible at: http://<YOUR_WINDOWS_IP>:3000"
```

**Usage:**
```powershell
# Run as Administrator
.\setup-wsl-network.ps1
```

---

## Summary Checklist

Before testing mobile app with physical device:

- [ ] Backend running in WSL2 on port 3000
- [ ] WSL2 IP address obtained (`hostname -I`)
- [ ] Port forwarding configured (PowerShell as Admin)
- [ ] Firewall rule added
- [ ] Windows IP address obtained (console output or `ipconfig`)
- [ ] Mobile device on same WiFi network
- [ ] Mobile `.env` updated with Windows IP
- [ ] Mobile app rebuilt after `.env` change
- [ ] Tested access: `http://<WINDOWS_IP>:3000/api/health`

---

## Environment Variables Reference

### Android Emulator
```bash
API_BASE_URL=http://10.0.2.2:3000
API_VERSION=v1
```

### Physical Android Device (WSL2)
```bash
API_BASE_URL=http://192.168.1.100:3000  # Your Windows IP
API_VERSION=v1
```

### iOS Simulator (macOS - not WSL2)
```bash
API_BASE_URL=http://localhost:3000
API_VERSION=v1
```

### Production
```bash
API_BASE_URL=https://api.sekar.dlhsurabaya.go.id
API_VERSION=v1
```

---

**Last Updated:** February 2, 2026
**Related:** [Infrastructure Setup](./infrastructure-setup.md), [AWS S3 Setup](./aws-s3-setup.md)
