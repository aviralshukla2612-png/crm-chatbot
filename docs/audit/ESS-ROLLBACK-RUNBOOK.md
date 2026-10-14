# ESS Production Rollback Runbook

**Document ID:** `ESS-ROLLBACK-RUNBOOK-001`  
**Classification:** Disaster Recovery & Operational Runbook  
**Target:** Emperor Smart Solutions Production Cluster  
**Last Known Good Release:** Git Commit `9b0684d3332cbaca20a55519d99cb508f5dbddb2` / Docker Image `ess-frontend:v0.9.5-stable`  

---

## 1. Rollback Trigger Conditions

A production rollback must be initiated immediately if any of the following occur post-deployment:
1. **Critical Authentication Failure:** Valid users or organization admins cannot log in, or session cookies are rejected across all browsers.
2. **Cross-Tenant Data Leak:** Any evidence that Organization A can view, edit, or delete bots, leads, or chat history belonging to Organization B.
3. **Application Crash Loop:** Next.js container restarts continuously (`CrashLoopBackOff`) due to unhandled exceptions or memory leaks.
4. **Billing / Quota Loophole:** Users can exceed monthly quota limits indefinitely or trigger unpaid inference calls.
5. **Database Deadlock / Corruption:** PostgreSQL transaction deadlocks prevent read/write access to leads or conversations.

---

## 2. Roles and Responsibilities

- **Incident Commander:** Lead DevOps / Production Reliability Engineer.
- **Database Administrator:** Verifies backup snapshot integrity and schema compatibility before rollbacks.
- **Communications Lead:** Alerts active pilot partners within 15 minutes of an incident declaration.

---

## 3. Rollback Procedure (Step-by-Step)

### Step 1: Drain Ingress Traffic
If an active data leak or corruption is detected, temporarily route traffic to a static maintenance page:
```bash
# On Nginx Host
sudo cp /etc/nginx/snippets/maintenance.conf /etc/nginx/sites-available/ess.conf
sudo nginx -s reload
```

### Step 2: Roll Back Application Container
Revert the frontend container to the previous stable release image:
```bash
# In deployment directory on target server
docker compose down ess-frontend
docker compose up -d --no-deps ess-frontend-v0.9.5
```
Or via Git:
```bash
git checkout 9b0684d3332cbaca20a55519d99cb508f5dbddb2
docker compose build ess-frontend
docker compose up -d
```

### Step 3: Database Migration Rollback Considerations
> [!CAUTION]
> Do NOT drop database tables or persistent volumes (`pgdata`) during application rollbacks! All DDL in `idempotent_migration.sql` was written with `IF NOT EXISTS` and nullable additive columns. The previous code release can operate against the updated schema without schema rollback.

### Step 4: Verification and Smoke Testing
1. Execute health check: `curl -I https://ess.example.com/api/health`
2. Perform test login with internal audit account.
3. Verify public chatbot inference on test bot.
4. Confirm database read/write on leads and conversations.

### Step 5: Resume Ingress Traffic
```bash
sudo cp /etc/nginx/snippets/production.conf /etc/nginx/sites-available/ess.conf
sudo nginx -s reload
```
