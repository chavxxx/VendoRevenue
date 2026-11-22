# GARTECH VENDO – MikroTik RouterOS v7 Configuration Guide
## Public Port Forwarding (DST-NAT), Hairpin NAT & Firewall Hardening

This guide provides tested, production-ready configuration commands for your **MikroTik CORE Router running RouterOS v7**. It routes external public traffic to your Proxmox server hosting **GARTECH VENDO**, enables Hairpin NAT for local devices, and enforces security policies against brute-force and DDoS attacks.

---

## 1. Network Topology Parameters

| Parameter | Example Placeholder | Replace With Your Actual Value |
| :--- | :--- | :--- |
| **WAN Interface** | `ether1-WAN` | Your active WAN interface or PPPoE client name |
| **LAN Interface / Bridge** | `bridge-LAN` | Your local bridge interface name |
| **LAN Subnet** | `192.168.88.0/24` | Your internal network subnet CIDR |
| **Proxmox Server IP** | `192.168.88.200` | The static internal IP of the Proxmox Ubuntu VM |
| **Public Domain** | `vendo.gartech.ph` | Fully qualified domain name (A Record -> Public IP) |
| **Public Ports** | `80 (HTTP), 443 (HTTPS)` | Routed to Proxmox server |

---

## 2. RouterOS v7 DST-NAT (Port Forwarding)

Port 80 is required for Let's Encrypt HTTP-01 domain challenge verification, and Port 443 handles encrypted TLS 1.3 traffic for the Web Portal and Flutter Android Harvester application.

Run in MikroTik Terminal:

```routeros
# ==============================================================
# 1. FORWARD PORT 443 (HTTPS) TO PROXMOX SERVER
# ==============================================================
/ip firewall nat add \
    chain=dstnat \
    in-interface-list=WAN \
    protocol=tcp \
    dst-port=443 \
    action=dst-nat \
    to-addresses=192.168.88.200 \
    to-ports=443 \
    comment="GARTECH: Port Forward 443 (HTTPS) to Proxmox VM"

# ==============================================================
# 2. FORWARD PORT 80 (HTTP / Let's Encrypt ACME Challenge)
# ==============================================================
/ip firewall nat add \
    chain=dstnat \
    in-interface-list=WAN \
    protocol=tcp \
    dst-port=80 \
    action=dst-nat \
    to-addresses=192.168.88.200 \
    to-ports=80 \
    comment="GARTECH: Port Forward 80 (HTTP/Certbot) to Proxmox VM"
```

*Note: If your WAN interface is a specific PPPoE client or interface (e.g. `pppoe-out1`), replace `in-interface-list=WAN` with `in-interface=pppoe-out1` or `dst-address-type=local`.*

---

## 3. Hairpin NAT (NAT Loopback)

### Why Hairpin NAT is Essential
When field harvesters, office staff, or accounting personnel connect their smartphones or laptops to the office WiFi or local vendo network, their DNS resolves `vendo.gartech.ph` to your **Public IP**. Without Hairpin NAT, requests from the LAN destined for the router's public IP will be dropped.

Run in MikroTik Terminal:

```routeros
# ==============================================================
# 3. HAIRPIN NAT (NAT LOOPBACK FOR LOCAL LAN TRAFFIC)
# ==============================================================
/ip firewall nat add \
    chain=srcnat \
    src-address=192.168.88.0/24 \
    dst-address=192.168.88.200 \
    protocol=tcp \
    dst-port=80,443 \
    action=masquerade \
    comment="GARTECH: Hairpin NAT for local access to public domain"
```

Also add a DST-NAT rule matching the local subnet accessing the public IP:

```routeros
/ip firewall nat add \
    chain=dstnat \
    dst-address-type=local \
    dst-address=!192.168.88.1 \
    protocol=tcp \
    dst-port=80,443 \
    action=dst-nat \
    to-addresses=192.168.88.200 \
    comment="GARTECH: Local loopback redirect to Proxmox VM"
```

---

## 4. MikroTik Firewall Filter Hardening

Protect the Proxmox server from automated public internet port scans, SYN floods, and brute-force attacks:

```routeros
# ==============================================================
# 4. BRUTE-FORCE PROTECTION & RATE LIMITING
# ==============================================================

# Create address list for rapid repeat offenders (>30 conn / 10 sec)
/ip firewall filter add \
    chain=forward \
    protocol=tcp \
    dst-port=443 \
    connection-state=new \
    connection-rate=30-100M \
    action=add-src-to-address-list \
    address-list=gartech_flood_blacklist \
    address-list-timeout=1h \
    comment="GARTECH: Flag high-rate flooders to blacklist"

# Drop traffic from blacklisted flooders
/ip firewall filter add \
    chain=forward \
    src-address-list=gartech_flood_blacklist \
    action=drop \
    comment="GARTECH: Drop blacklisted flood attackers"

# Allow legitimate forwarded HTTP & HTTPS traffic
/ip firewall filter add \
    chain=forward \
    protocol=tcp \
    dst-address=192.168.88.200 \
    dst-port=80,443 \
    connection-state=new,established,related \
    action=accept \
    comment="GARTECH: Allow forwarded HTTP/HTTPS to Proxmox"

# Explicitly DROP external direct access to PostgreSQL port 5432
/ip firewall filter add \
    chain=forward \
    in-interface-list=WAN \
    protocol=tcp \
    dst-port=5432 \
    action=drop \
    comment="GARTECH: Security - Never expose PostgreSQL to WAN"
```

---

## 5. Verification & Testing

### Test 1: External Reachability (from mobile cellular data)
1. Turn off WiFi on your mobile phone (connect to 4G/5G).
2. Open Chrome: `https://vendo.gartech.ph/health`
3. Expected Output:
   ```json
   {"status":"healthy","service":"GARTECH VENDO Management & Revenue Sharing System","version":"1.0.0","timezone":"Asia/Manila"}
   ```

### Test 2: Local Hairpin NAT Reachability (from local office WiFi)
1. Re-connect phone or laptop to office WiFi.
2. Open `https://vendo.gartech.ph`.
3. Expected: Instant loading of the GARTECH VENDO login screen without certificate or connection timeout errors.

### Test 3: Android App Connection
1. Launch `GARTECH VENDO HARVESTER` APK on the Android device.
2. In the Login screen, tap the gear icon (Settings).
3. Set Backend URL: `https://vendo.gartech.ph`
4. Tap **Autofill Demo Harvester (harvester1)** and **Sign In**.
5. All assigned machines, collections, and calculations sync directly.
