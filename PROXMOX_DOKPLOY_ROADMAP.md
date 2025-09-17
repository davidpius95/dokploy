# Proxmox-Backed Dokploy SaaS Rollout Plan

This document breaks the project into two phases that transform Dokploy (`IS_CLOUD=true`) into a managed PaaS that automates tenant infrastructure on a Proxmox fleet. Each phase lists the concrete tasks, tooling, dependencies, and deliverables expected at completion.

## Goals
- Offer a SaaS control plane (Dokploy Cloud) while hosting all workloads on Proxmox-managed VMs or containers.
- Provision isolated compute per tenant automatically during signup, similar to Heroku dynos.
- Maintain operational visibility across both Dokploy and Proxmox with clear lifecycle management.

## Assumptions
- Proxmox VE 7.x/8.x clusters are available with API access enabled (`pveproxy`).
- Templates for both KVM (QEMU) VMs and LXC containers can be created with cloud-init support.
- Dokploy control plane will run separately (dedicated VM/bare metal) with `IS_CLOUD=true`.
- Central secrets management (e.g., Vault, Doppler, or AWS Secrets Manager) is available for SSH keys and API tokens.

---

## Phase 1 – Infrastructure & Control Plane Foundation
**Objective:** Stand up the Dokploy cloud instance, prepare reusable Proxmox templates, and verify manual tenant provisioning end-to-end.

### Tasks
1. **Proxmox Template Engineering**
   - Build base VM/LXC images with Docker, Dokploy prerequisites, SSH, and cloud-init enabled.
   - Harden OS (firewall defaults, unattended upgrades, monitoring agents).
   - Snapshot templates and document versioning.

2. **Networking & Access**
   - Design tenant network model (VLANs, SDN, or shared bridge with security groups).
   - Configure Proxmox firewall rules, NAT, and DNS automation for tenant endpoints.
   - Issue API tokens/roles with least privilege for provisioning service.

3. **Secrets & Key Management**
   - Define process for generating per-tenant SSH key pairs.
   - Store private keys in secrets manager; expose retrieval API to provisioning workflows.

4. **Dokploy Cloud Control Plane**
   - Deploy Dokploy with `IS_CLOUD=true`, configure Mailpit (or SMTP), Redis, Postgres, and storage.
   - Ensure `PUBLIC_APP_URL` matches external hostname and SSL termination is in place.
   - Run migrations/seeds and enable monitoring/log shipping.

5. **Deployment Worker Activation**
   - Run `apps/dokploy/server/queues/deployments-queue.ts` as a dedicated service (systemd/docker) to consume BullMQ jobs.
   - Connect worker to the same Redis/Postgres used by control plane; configure health checks.

6. **Manual Tenant Walkthrough**
   - Manually clone a template VM, inject SSH key, add it to a test organization via Dokploy UI/API, and deploy a sample app.
   - Capture time-to-live metrics, issues, and create runbooks.

### Deliverables
- Hardened Proxmox VM/LXC templates with documented build steps.
- Networking diagram and firewall/DNS scripts committed to infra repo.
- Secrets management policy and scripts for SSH key generation.
- Dokploy cloud instance reachable over HTTPS with working auth and email flows.
- Deployment worker service manifest with monitoring hooks.
- Test report demonstrating manual provisioning and deployment success.

### Exit Criteria
- Team can provision a tenant VM manually in ≤10 minutes and deploy an app through Dokploy without errors.
- All infrastructure components monitored (basic CPU/RAM/disk metrics and Dokploy logs available).

---

## Phase 2 – Automated Provisioning & Multi-Tenant Operations
**Objective:** Automate tenant onboarding, integrate Proxmox API workflows, enforce quotas/billing, and establish lifecycle management.

### Tasks
1. **Provisioning Orchestrator**
   - Implement a service (e.g., Node.js worker, Go microservice, or serverless function) that listens to Dokploy signup events or webhooks.
   - Automate Proxmox clone/start via API (`/api2/json/nodes/{node}/{qemu|lxc}/{vmid}/clone`, `config`, `status/start`).
   - Poll for IP readiness using QEMU guest agent or DHCP logs.

2. **Cloud-Init & Post-Boot Automation**
   - Generate cloud-init user-data per tenant (hostname, SSH key, bootstrap script).
   - Optionally trigger configuration management (Ansible/Salt) for extra hardening.

3. **Dokploy API Integration**
   - Authenticate as a service account; call `serverRouter.create` and `serverRouter.setup` with newly provisioned host.
   - Store mapping of Dokploy server IDs ↔ Proxmox VMIDs in provisioning database.

4. **Tenant Lifecycle Management**
   - Implement teardown workflows (suspend, destroy, archive) when tenants cancel or downgrade.
   - Add health checks that reconcile Dokploy servers vs. Proxmox inventory.

5. **Quota, Tiering & Billing Hooks**
   - Define server sizes, quotas, and pricing tiers.
   - Integrate billing (e.g., Stripe) to gate provisioning requests and track usage.

6. **Observability & Alerts**
   - Extend monitoring to capture provisioning success/failure, VM resource usage, and Dokploy deployment metrics per tenant.
   - Configure alerts for stuck builds, failed setups, or resource exhaustion.

7. **Security & Compliance Review**
   - Audit SSH key rotation policy, log retention, and access controls.
   - Conduct penetration testing on tenant isolation (network + Dokploy roles).

8. **Operational Playbooks & Documentation**
   - Document automated flows, manual overrides, and on-call procedures.
   - Provide tenant-facing docs covering limitations and support channels.

### Deliverables
- Provisioning service source code, CI/CD pipeline, and infrastructure manifests.
- Automated signup-to-ready VM workflow with average provisioning time target (e.g., <3 minutes).
- Billing/quotas configuration aligned with product tiers.
- Monitoring dashboards (Grafana/Prometheus or equivalent) for Proxmox + Dokploy.
- Security audit report and updated runbooks.
- Documentation set (internal operations + customer onboarding guide).

### Exit Criteria
- New tenant signup automatically results in an assigned VM/container and a functional Dokploy server without manual intervention.
- Fleet health and provisioning metrics visible in monitoring stack with alerting thresholds enforced.
- Decommissioning a tenant reclaims Proxmox resources and updates Dokploy records.

---

## Future Enhancements (Post-Phase 2)
- Pool of pre-warmed VMs for instant provisioning.
- Multi-region/cluster support with placement policies.
- Self-service scaling (customers request larger plans, orchestrator resizes or migrates VMs).
- Integration with backup/restore pipelines for tenant data snapshots.

## References & Tooling
- **Proxmox API Docs:** https://pve.proxmox.com/pve-docs/api-viewer/
- **Dokploy Server APIs:** See `apps/dokploy/server/api/routers` and `packages/server/src`.
- **Automation Tooling:** Terraform + Ansible (infra as code), BullMQ/Redis (queue), Node.js/Go (provisioning service).
- **Monitoring:** Prometheus + Grafana, Loki for logs, Alertmanager for notifications.
