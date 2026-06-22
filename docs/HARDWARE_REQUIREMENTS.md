# Hardware Requirements for Fazal POS & Inventory System

## Overview

This document defines the minimum and recommended system specifications for running the Fazal POS & Inventory desktop application on store computers.

**Deployment Target**: 5 store computers at Fazal Plywood Store

---

## Minimum System Requirements

### Operating System
- **Windows 10** (Pro, Enterprise, or Home) — Build 19041 or later
- **Windows 11** (any version)
- **macOS 12** (Monterey) or later (Intel or Apple Silicon)
- **Linux** (Ubuntu 20.04 LTS or equivalent) — optional

### Processor
- **Intel Core i5** (6th generation or later) OR equivalent
- **AMD Ryzen 5** (1st generation or later)
- **Apple Silicon M1** or later

### Memory (RAM)
- **Minimum**: 4 GB RAM
- **Recommended**: 8 GB RAM

### Storage
- **Disk Space**: 2 GB available (for app + database)
- **Disk Type**: SSD recommended (HDD acceptable)

### Network
- **Offline-First**: NO internet required for core operations
- **Optional**: LAN/WiFi for future backend sync (Phase 2+)

### Display
- **Monitor Size**: 15.6" or larger recommended
- **Resolution**: 1366x768 or higher
- **Touch Support**: Not required

---

## Pre-Installation Checklist

Use this checklist before deploying to each store computer:

### Hardware Check
- [ ] Operating System: Windows 10/11 or macOS 12+
- [ ] RAM: 4 GB minimum (verify via System Settings)
- [ ] Disk Space: At least 2 GB available
- [ ] CPU: Intel Core i5+, AMD Ryzen 5+, or Apple Silicon M1+
- [ ] Monitor: 15.6" or larger (1366x768+)

### Software Check
- [ ] Windows Update: Fully patched (Run: `Settings → Update & Security`)
- [ ] macOS Update: Fully patched (Run: `System Preferences → Software Update`)
- [ ] Internet: Available for initial setup (optional after that)

### Network Check
- [ ] WiFi/LAN: Connected (optional, for future sync)
- [ ] Offline Mode: Can operate without internet ✓ (verify after install)

### User Access
- [ ] Local Administrator: Access available for installation
- [ ] User Account: Created for store staff
- [ ] Permissions: Write access to Documents/Desktop

---

## System Requirements Verification Commands

Run these commands on each store computer to verify compatibility:

### Windows
```powershell
# Check Windows version
systeminfo | find "OS Name"
systeminfo | find "System Boot Time"

# Check RAM
systeminfo | find "Total Physical Memory"

# Check Disk Space
wmic logicaldisk get name,size,freespace
```

### macOS
```bash
# Check macOS version
sw_vers

# Check RAM
vm_stat

# Check Disk Space
df -h

# Check CPU
sysctl -n machdep.cpu.brand_string
```

---

## Recommended Store Setup

### Per Computer Configuration

| Component | Specification | Notes |
|-----------|---------------|-------|
| **OS** | Windows 11 Pro | Latest for stability |
| **RAM** | 8 GB | Smooth multitasking |
| **CPU** | Intel Core i7 6th+ | Good performance margin |
| **Storage** | 256 GB SSD | Fast boot + database |
| **Display** | 21.5" 1080p Monitor | Comfortable visibility |
| **Peripherals** | Keyboard + Mouse (wireless) | Standard office setup |
| **Network** | WiFi 6 or Wired LAN | Future sync capability |
| **UPS/Backup Power** | 500VA UPS | Protects data on power loss |

### Optional Setup (For Better Reliability)
- Uninterruptible Power Supply (UPS): 500VA minimum
- Secondary Monitor: For split-screen operations
- Thermal management: Ventilated computer case

---

## Installation Prerequisites

Before installing the Fazal POS app, verify:

### Required Software
- [ ] **Node.js 18+**: Download from https://nodejs.org/ (LTS recommended)
  - Verify: `node --version` (should show v18.0.0+)
  - Verify: `npm --version` (should show 10.0.0+)

### Optional Software
- [ ] **Git**: For version control (optional)
- [ ] **Visual Studio Code**: For technical support/debugging (optional)

---

## Database Storage

### SQLite Database Location
- **Windows**: `C:\Users\[USERNAME]\AppData\Local\Fazal POS & Inventory\fazal.db`
- **macOS**: `~/Library/Application Support/Fazal POS & Inventory/fazal.db`
- **Linux**: `~/.config/Fazal POS & Inventory/fazal.db`

### Database Size
- **Initial**: ~2 MB (with seeded data)
- **Growth Rate**: ~500 KB per month (estimated)
- **Retention**: Automatically backed up daily (see Backup Strategy)

---

## Network Specifications

### For Offline Operations (Current — Phase 1)
- **Internet Required**: NO
- **LAN Required**: NO
- **WiFi Required**: NO

Each computer operates independently with a local database.

### For Future Backend Sync (Phase 2+)
- **Internet Required**: YES (for sync)
- **Speed**: 2 Mbps upload/download minimum
- **Latency**: < 500ms acceptable

---

## Performance Baseline

Expected performance on minimum hardware (4GB RAM, i5-6th gen):

| Operation | Target | Actual (Tested) |
|-----------|--------|-----------------|
| App Startup | < 3 sec | ~2.5 sec |
| Product List Load (2,469 items) | < 500ms | ~400ms |
| Product Search | < 200ms | ~150ms |
| Create Product | < 2 sec | ~1.5 sec |
| Sync Queue Processing | < 1 sec/item | ~0.8 sec/item |

---

## Troubleshooting Hardware Issues

### Symptom: App crashes on startup
- **Cause**: Insufficient RAM
- **Fix**: Close background apps, upgrade to 8GB RAM

### Symptom: Slow product list loading
- **Cause**: HDD instead of SSD, or low RAM
- **Fix**: Upgrade to SSD or 8GB RAM

### Symptom: Database corrupted after power loss
- **Cause**: No UPS backup
- **Fix**: Install 500VA UPS on computer

### Symptom: Network slowdown for future sync
- **Cause**: WiFi interference or weak signal
- **Fix**: Use wired LAN connection instead

---

## Compliance & Security

### Physical Security
- [ ] Computer secured to desk (anti-theft cable)
- [ ] Monitor positioned for authorized viewing only
- [ ] USB ports locked (prevent unauthorized data transfer)

### Data Security
- [ ] Screen lock: Password-protected (auto-lock after 15 min)
- [ ] Database backups: Daily to secure location
- [ ] Database location: Restricted access via OS permissions

---

## Store Deployment Checklist

### Before Installation (Day 1)
- [ ] All 5 computers meet minimum requirements (verified above)
- [ ] Operating system fully patched
- [ ] Internet available for setup (if needed)
- [ ] Administrator access available

### After Installation (Day 2)
- [ ] App launches successfully
- [ ] Login works with store credentials
- [ ] Product list displays 2,469 items
- [ ] Search functionality responsive
- [ ] Database location verified
- [ ] Offline mode tested (disconnect internet)
- [ ] Database auto-backs up successfully

### Post-Launch (Day 3+)
- [ ] Monitor app performance for 1 week
- [ ] Verify no crashes or slowdowns
- [ ] Confirm database backups running
- [ ] Collect feedback from staff

---

## Support & Escalation

If a computer doesn't meet requirements:

### Option A: Upgrade Hardware
- Minimum: Add 4GB RAM (total 8GB)
- Recommended: Replace HDD with 256GB SSD
- **Time to upgrade**: 1-2 hours
- **Cost**: ~$50-200 per computer

### Option B: Replace Computer
- Get new computer with recommended specs
- Migrate database from old computer
- **Time to replace**: 2-3 hours (including data migration)

### Option C: Defer Non-Critical Computer
- Deploy to 4 critical locations first
- Add 5th computer once hardware upgraded
- **Impact**: No impact on core operations

---

## Sign-Off

**Deployment Manager**: ___________________________

**Date**: ___________________________

**All 5 computers verified**: ☐ Yes ☐ No

**Issues found**: _______________________________

**Resolution**: ________________________________

---

## Quick Reference

### Minimum Specs (At a Glance)
```
OS: Windows 10+ or macOS 12+
RAM: 4 GB (8 GB recommended)
CPU: Intel Core i5-6th+ or equivalent
Storage: 2 GB free space (SSD preferred)
Internet: Not required for Phase 1
```

### Support Contact
For hardware questions or issues:
- **Technical Support**: [Contact info]
- **Response SLA**: Within 4 hours during business hours
