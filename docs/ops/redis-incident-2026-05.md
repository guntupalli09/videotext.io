# Redis Replica Incident Runbook

Date: 2026-05-31

## Executive summary

Redis was observed as:

```text
role:slave
master_host:124.220.206.118
master_port:23680
slave_read_only:1
```

The application is designed to use a standalone Redis instance for Bull queues only. A standalone instance becomes a replica only when Redis starts with replication configuration (`replicaof`/`slaveof`) or receives a runtime replication command (`REPLICAOF`/`SLAVEOF`). This repository contains no Redis config file, no startup script, and no application source code that sets `REPLICAOF`, `replicaof`, `SLAVEOF`, `slaveof`, or `124.220.206.118`.

The highest-probability root cause is remote runtime execution of `REPLICAOF 124.220.206.118 23680` against the Redis TCP port. Before this hardening change, Compose published Redis on the host with `6379:6379` and permitted operation without `REDIS_PASSWORD`, so any host or Internet path that could reach TCP/6379 could issue unauthenticated Redis admin commands.

## Evidence from repository audit

### Docker and Redis configuration

- `docker-compose.yml` is the only Compose file in the repository.
- Redis uses the upstream `redis:7-alpine` image.
- Redis persistent state is the named volume `redis-data` mounted at `/data`.
- The prior Compose definition published Redis to the host with `6379:6379`.
- The prior Redis startup command allowed `REDIS_PASSWORD` to be empty and did not disable `CONFIG`, `REPLICAOF`, or `SLAVEOF`.
- API and worker connect over the Compose network using `REDIS_URL`.
- No repository Redis config file is mounted into the container.

### Code/search findings

These searches should remain clean except for this runbook and hardening comments:

```bash
rg -n "124\.220\.206\.118|REPLICAOF|replicaof|SLAVEOF|slaveof|master_host|masterauth" . \
  -g '!node_modules' -g '!dist' -g '!build'
```

If those strings appear in executable code, deployment files, mounted scripts, or Redis configuration outside this incident documentation, treat that as a new finding.

## How Redis can become a replica

Every realistic mechanism falls into one of these categories:

1. **Startup configuration**
   - `redis-server /path/to/redis.conf` where the file contains `replicaof <host> <port>` or legacy `slaveof <host> <port>`.
   - Command-line startup arguments include `--replicaof <host> <port>`.
   - A custom image or entrypoint generates a Redis config containing replication directives.

2. **Runtime command**
   - Any authenticated Redis client with command access can run `REPLICAOF <host> <port>` or legacy `SLAVEOF <host> <port>`.
   - `REPLICAOF NO ONE` reverses the role, which matches the observed temporary fix.

3. **Persisted dynamic configuration**
   - If `CONFIG REWRITE` is enabled and Redis is using a writable config file, runtime changes can be written into that file and survive restarts.
   - AOF/RDB data files store key data, not ordinary server replication directives. Replica role itself is not normally recovered from `appendonly.aof` or `dump.rdb`; it is recovered from config/startup arguments or reissued runtime commands.

4. **Mounted volume/image residue**
   - A named volume can contain Redis data and AOF manifests from old containers. It does not by itself cause `replicaof` unless a Redis config file inside the volume is explicitly used by startup.
   - A recreated container using the same unsafe Compose definition can be compromised again shortly after restart if the port remains reachable.

5. **Misconfigured automation**
   - An operator script, backup/restore job, monitoring job, failover tool, or Redis management UI with network access can issue `REPLICAOF`.
   - Docker socket access is sensitive: a container with `/var/run/docker.sock` can exec into Redis or start other containers. The cleanup container in this repository runs only `docker system prune`, but Docker socket exposure should still be treated as privileged.

6. **External access / compromise**
   - Internet scanners continuously probe Redis on TCP/6379 and run commands such as `INFO`, `CONFIG`, `REPLICAOF`, `SLAVEOF`, `MODULE LOAD`, and key writes.
   - A common abuse pattern is to turn a Redis server into a replica of an attacker-controlled master, then stream attacker-controlled payload data. Even when the final goal is not a cryptominer, unexpected `master_host` on an Internet address is a strong compromise indicator.

## Most likely root cause ranking

1. **Remote unauthenticated runtime command via exposed Redis port** — highest probability. The observed state names an external master (`124.220.206.118:23680`), source searches found no matching configuration, and `REPLICAOF NO ONE` immediately fixed the issue.
2. **Remote authenticated runtime command after password disclosure or weak password** — possible if a password was set but exposed via logs, shell history, `.env` leakage, or brute force.
3. **Misconfigured automation or operator command** — possible if a host-level script, Redis GUI, monitoring system, or deployment automation ran `REPLICAOF`; no repository evidence was found.
4. **Container recreation with bad startup config** — unlikely in this repository because no config file or command-line `--replicaof` exists, but verify live `docker inspect` output and mounted files.
5. **Persisted Redis volume/config residue** — unlikely unless the live container starts from a config file stored in a mounted path, which this Compose file does not do.
6. **Application code path** — very unlikely; application Redis clients use Bull/job-cache operations and repository searches did not find replication commands.

## Hardening implemented in Compose

- Redis no longer publishes TCP/6379 to the host.
- `REDIS_PASSWORD` is required by Compose.
- API and worker Redis URLs include the password.
- Redis disables `CONFIG`, `REPLICAOF`, and `SLAVEOF` with `rename-command ""`.
- Redis healthcheck authenticates with `REDISCLI_AUTH`.

## Live incident investigation commands

Run these on the production host before destroying containers/volumes where possible.

### Capture current Redis state

```bash
docker compose exec redis sh -lc 'REDISCLI_AUTH="$REDIS_PASSWORD" redis-cli INFO replication'
docker compose exec redis sh -lc 'REDISCLI_AUTH="$REDIS_PASSWORD" redis-cli CONFIG GET dir dbfilename appendfilename appenddirname requirepass masterauth replicaof'
docker compose exec redis sh -lc 'REDISCLI_AUTH="$REDIS_PASSWORD" redis-cli ACL LIST'
docker compose exec redis sh -lc 'REDISCLI_AUTH="$REDIS_PASSWORD" redis-cli COMMAND INFO REPLICAOF SLAVEOF CONFIG'
```

Expected hardened result: `role:master`, authenticated commands work, and `COMMAND INFO` returns no usable `REPLICAOF`, `SLAVEOF`, or `CONFIG` command definitions.

### Inspect container runtime configuration

```bash
docker inspect videotools-redis --format '{{json .Config.Cmd}} {{json .Args}} {{json .HostConfig.PortBindings}} {{json .Mounts}}'
docker compose config
```

Expected hardened result: no host binding for port `6379/tcp`, `redis-data` mounted at `/data`, no `--replicaof` argument.

### Inspect network exposure from the host

```bash
ss -ltnp | awk '$4 ~ /:6379$/ || NR==1 {print}'
docker port videotools-redis || true
```

Expected hardened result: no host listener for Redis and no `docker port` mapping for Redis.

From an external machine, verify the port is closed or filtered:

```bash
nc -vz <server-public-ip> 6379
nmap -Pn -p 6379 <server-public-ip>
```

Expected hardened result: connection refused, timed out, closed, or filtered.

### Inspect firewall

Use the firewall manager deployed on the host:

```bash
ufw status verbose
iptables -S
nft list ruleset
```

Expected hardened result: no inbound allow rule for TCP/6379. Only required public ports such as 80/443 should be reachable.

### Inspect logs and compromise indicators

```bash
docker logs videotools-redis --since 21d | tee /tmp/videotools-redis.log
journalctl -u docker --since '21 days ago' | tee /tmp/docker.log
auth.log_paths='/var/log/auth.log /var/log/secure'; for f in $auth.log_paths; do [ -f "$f" ] && sudo tail -n 5000 "$f"; done
last -a | head -50
```

Search captured logs for Redis role changes, external IPs, and suspicious process creation:

```bash
rg -n 'REPLICAOF|SLAVEOF|replica|slave|124\.220\.206\.118|23680|Accepted|Possible SECURITY ATTACK|CONFIG|MODULE|crontab|miner|xmrig' /tmp/videotools-redis.log /tmp/docker.log 2>/dev/null
```

Redis OSS logs usually do not record every client command by default, so absence of a `REPLICAOF` log line does not clear compromise.

### Inspect Redis persistence files

```bash
docker compose exec redis sh -lc 'find /data -maxdepth 3 -type f -print -exec sh -c "echo --- {}; head -c 512 {} | strings | head -40" \;'
docker volume inspect videotextio_redis-data 2>/dev/null || docker volume ls | grep redis-data
```

Expected finding: AOF/RDB files may contain queue data; they should not be treated as Redis configuration unless Redis is explicitly started with a config file from `/data`.

## Emergency response commands

If Redis is ever observed as a replica again:

```bash
docker compose exec redis sh -lc 'REDISCLI_AUTH="$REDIS_PASSWORD" redis-cli INFO replication'
docker compose exec redis sh -lc 'REDISCLI_AUTH="$REDIS_PASSWORD" redis-cli REPLICAOF NO ONE'
docker compose exec redis sh -lc 'REDISCLI_AUTH="$REDIS_PASSWORD" redis-cli INFO replication'
```

Then immediately block exposure and rotate secrets:

```bash
ufw deny 6379/tcp || true
docker compose up -d --force-recreate redis api worker
openssl rand -hex 32
```

## Verification checklist after deploying the fix

1. Set a strong `REDIS_PASSWORD` in `.env`.
2. Recreate Redis, API, and worker so the hardened command and password are active:

```bash
docker compose up -d --force-recreate redis api worker
```

3. Verify Redis is master:

```bash
docker compose exec redis sh -lc 'REDISCLI_AUTH="$REDIS_PASSWORD" redis-cli INFO replication | sed -n "1,20p"'
```

4. Verify unauthenticated local access fails:

```bash
docker compose exec redis redis-cli ping
```

Expected result: `NOAUTH Authentication required`.

5. Verify replication commands are disabled:

```bash
docker compose exec redis sh -lc 'REDISCLI_AUTH="$REDIS_PASSWORD" redis-cli REPLICAOF 127.0.0.1 1'
docker compose exec redis sh -lc 'REDISCLI_AUTH="$REDIS_PASSWORD" redis-cli CONFIG GET "*"'
```

Expected result: `ERR unknown command` for both commands.

6. Verify host exposure is removed:

```bash
ss -ltnp | awk '$4 ~ /:6379$/ || NR==1 {print}'
docker port videotools-redis || true
```

7. Verify external exposure is closed from a different network:

```bash
nc -vz <server-public-ip> 6379
nmap -Pn -p 6379 <server-public-ip>
```

## Long-term recommendations

- Keep Redis on an internal Docker network only; do not publish Redis to the public host interface.
- Require authentication for all Redis deployments, including staging.
- Use ACLs or command renaming to disable administrative commands the app does not need: `CONFIG`, `REPLICAOF`, `SLAVEOF`, `MODULE`, `MIGRATE`, `RESTORE`, `SAVE`, `BGSAVE`, `DEBUG`, and `SHUTDOWN`. Validate compatibility before disabling persistence commands.
- Restrict host firewall inbound traffic to 80/443 and SSH from trusted IPs.
- Move recurring Docker cleanup out of a long-running Docker-socket-mounted container if possible; use a host systemd timer instead.
- Add a production monitoring check that alerts when `INFO replication` does not contain `role:master`.
- Rotate Redis passwords after any exposure and review `.env`, shell history, CI logs, deployment logs, and backups for secret leakage.
- Preserve forensic evidence before pruning containers or deleting volumes during future incidents.
