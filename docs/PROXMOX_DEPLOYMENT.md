# GARTECH VENDO – Proxmox VE Deployment Guide
## Complete Production Installation on Proxmox Virtual Environment (VM / LXC)

This guide provides end-to-end instructions for deploying the **GARTECH VENDO Management & Revenue Sharing System** on a dedicated Virtual Machine (VM) or unprivileged Linux Container (LXC) within Proxmox VE 8.x.

---

## 1. Hardware & Resource Allocation

### Recommended Server Specifications
- **Host System:** Proxmox VE 8.x (or higher)
- **Virtual CPU (vCPU):** 4 Cores (Host type recommended for VMs)
- **RAM:** 8 GB DDR4/DDR5
- **Storage:** 100 GB SSD/NVMe (ZFS or LVM-Thin backed)
- **Operating System:** Ubuntu Server 24.04 LTS (x86_64)

### VM vs. LXC Recommendation
- **Recommended Option:** **KVM Virtual Machine (VM)**. While LXC is lighter, a full KVM VM provides true Docker daemon isolation, simpler block storage mapping, and zero nested-cgroup issues with Docker overlay2 filesystems.

---

## 2. Proxmox VM Creation Steps

1. In the Proxmox Web GUI (`https://[PROXMOX_IP]:8006`), click **Create VM**:
   - **General:** VM ID: `200`, Name: `gartech-vendo-server`
   - **OS:** Select `ubuntu-24.04-live-server-amd64.iso`
   - **System:** Machine: `q35`, SCSI Controller: `VirtIO SCSI single`, Qemu Agent: `Enabled` (Check box)
   - **Disks:** Bus: `SCSI`, Size: `100 GiB`, Cache: `Write back`, Discard: `Enabled`
   - **CPU:** Sockets: `1`, Cores: `4`, Type: `host`
   - **Memory:** `8192 MiB` (8 GB), Ballooning: `Enabled` (Min: 4096 MiB)
   - **Network:** Bridge: `vmbr0`, Model: `VirtIO (paravirtualized)`
2. Complete standard Ubuntu Server installation:
   - Assign static IP (e.g., `192.168.88.200/24`, Gateway: `192.168.88.1`, DNS: `1.1.1.1, 8.8.8.8`)
   - Install OpenSSH Server.

---

## 3. Host Preparation & Docker Installation

SSH into the Ubuntu VM:
```bash
ssh administrator@192.168.88.200
sudo -i
```

Run the automated installer script provided in the repository:
```bash
# Clone or transfer the GARTECH repository
mkdir -p /opt/gartech
cd /opt/gartech

# Run the automated installer
chmod +x scripts/install.sh
./scripts/install.sh
```

Alternatively, manually install Docker Engine:
```bash
apt-get update && apt-get install -y ca-certificates curl gnupg lsb-release git

install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable docker --now
```

---

## 4. Persistent Storage & Directory Layout

The application separates persistent volumes for zero data loss across container rebuilds:

```
/opt/gartech/
├── docker/
│   ├── docker-compose.yml       # Complete multi-container orchestration
│   └── nginx/                   # Reverse proxy configuration
├── backend/                     # FastAPI Python source
├── frontend/                    # React Vite source
├── uploads/                     # Persistent photos & signatures
│   ├── signatures/
│   ├── harvests/
│   └── receipts/
├── backups/                     # Compressed daily PostgreSQL dumps
├── scripts/                     # Automation & maintenance
└── .env                         # Secrets & production configuration
```

---

## 5. Environment Configuration

Copy and customize the `.env` file:
```bash
cp .env.example .env
nano .env
```

Ensure production values are configured:
```ini
SECRET_KEY=generate-a-strong-random-64-character-string-here
POSTGRES_USER=gartech_admin
POSTGRES_PASSWORD=CreateAStrongDatabasePassword2026!
POSTGRES_DB=gartech_vendo_db
DOMAIN=vendo.gartech.ph
TIMEZONE=Asia/Manila
```

---

## 6. Launching the Docker Services

```bash
cd /opt/gartech/docker
docker compose up -d --build
```

Verify that all 5 containers are healthy and running:
```bash
docker compose ps
```
Output:
```
NAME               STATUS                    PORTS
gartech_postgres   Up (healthy)              5432/tcp
gartech_backend    Up                        8000/tcp
gartech_frontend   Up                        80/tcp
gartech_nginx      Up                        0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
gartech_certbot    Up
```

---

## 7. Obtaining Let's Encrypt SSL Certificates

Once the domain `vendo.gartech.ph` is pointed via MikroTik port forwarding to this Proxmox VM, run Certbot:

```bash
docker compose run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  -d vendo.gartech.ph \
  --email admin@gartech.ph \
  --agree-tos \
  --no-eff-email
```

Reload Nginx to activate the new SSL certificate:
```bash
docker compose exec nginx nginx -s reload
```

Certbot will automatically renew certificates in the background every 12 hours via the bundled `gartech_certbot` container.

---

## 8. Automatic Startup on Proxmox Reboot (systemd)

Create a systemd unit file to ensure the application starts automatically on VM boot:

```bash
nano /etc/systemd/system/gartech.service
```

Paste:
```ini
[Unit]
Description=GARTECH VENDO Docker Stack
Requires=docker.service
After=docker.service network.target

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/gartech/docker
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
systemctl daemon-reload
systemctl enable gartech.service
```

---

## 9. Automated Database Backups & Cron

Verify the automated database backup script:
```bash
/opt/gartech/scripts/backup_db.sh
```

Ensure the root crontab executes backups nightly at 2:00 AM:
```bash
crontab -e
```
Add:
```cron
0 2 * * * /opt/gartech/scripts/backup_db.sh >> /var/log/gartech_backup.log 2>&1
```

---

## 10. Monitoring & Health Checks

1. **Application Health Endpoint:**
   ```bash
   curl -i http://localhost/health
   # Expected: HTTP/1.1 200 OK {"status":"healthy"}
   ```
2. **Container Logs:**
   ```bash
   docker compose logs -f backend
   docker compose logs -f nginx
   ```
3. **Database Connectivity:**
   ```bash
   docker exec -it gartech_postgres pg_isready -U gartech_admin -d gartech_vendo_db
   ```
