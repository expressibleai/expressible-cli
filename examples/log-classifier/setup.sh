#!/bin/bash

mkdir -p samples

# --- NORMAL ---

cat > samples/001.input.txt << 'LOG'
2024-03-15 10:23:45 INFO [web-server] Request completed: GET /api/users/123 - 200 OK - 45ms
LOG
printf "normal" > samples/001.output.txt

cat > samples/002.input.txt << 'LOG'
2024-03-15 10:24:01 INFO [scheduler] Cron job daily-cleanup started successfully
LOG
printf "normal" > samples/002.output.txt

cat > samples/003.input.txt << 'LOG'
2024-03-15 10:24:15 INFO [auth-service] User john.doe@company.com logged in from 192.168.1.50
LOG
printf "normal" > samples/003.output.txt

cat > samples/004.input.txt << 'LOG'
2024-03-15 10:25:00 DEBUG [cache] Cache hit for key session:abc123, TTL remaining 1800s
LOG
printf "normal" > samples/004.output.txt

# --- WARNING ---

cat > samples/005.input.txt << 'LOG'
2024-03-15 10:26:12 WARN [db-pool] Connection pool utilization at 85% (17/20 connections in use)
LOG
printf "warning" > samples/005.output.txt

cat > samples/006.input.txt << 'LOG'
2024-03-15 10:26:30 WARN [disk-monitor] Disk usage on /var/log reached 78%, threshold is 80%
LOG
printf "warning" > samples/006.output.txt

cat > samples/007.input.txt << 'LOG'
2024-03-15 10:27:00 WARN [api-gateway] Rate limit approaching for client api-key-9f8e: 450/500 requests in current window
LOG
printf "warning" > samples/007.output.txt

cat > samples/008.input.txt << 'LOG'
2024-03-15 10:27:45 WARN [certificate-checker] TLS certificate for api.service.internal expires in 14 days
LOG
printf "warning" > samples/008.output.txt

# --- ERROR ---

cat > samples/009.input.txt << 'LOG'
2024-03-15 10:28:00 ERROR [payment-service] Transaction failed: timeout connecting to payment gateway after 30000ms. Order ID: ORD-78432
LOG
printf "error" > samples/009.output.txt

cat > samples/010.input.txt << 'LOG'
2024-03-15 10:28:15 ERROR [db] PostgreSQL connection refused: FATAL password authentication failed for user "app_readonly"
LOG
printf "error" > samples/010.output.txt

cat > samples/011.input.txt << 'LOG'
2024-03-15 10:29:00 ERROR [worker-3] Unhandled exception in job queue processor: TypeError: Cannot read properties of null (reading 'userId') at processOrder.js:142
LOG
printf "error" > samples/011.output.txt

cat > samples/012.input.txt << 'LOG'
2024-03-15 10:29:30 FATAL [app] Out of memory: heap allocation failed - requested 524288000 bytes. Process will restart.
LOG
printf "error" > samples/012.output.txt

# --- SECURITY EVENT ---

cat > samples/013.input.txt << 'LOG'
2024-03-15 10:30:00 WARN [auth-service] 47 failed login attempts for user admin@company.com from IP 203.0.113.42 in the last 5 minutes
LOG
printf "security-event" > samples/013.output.txt

cat > samples/014.input.txt << 'LOG'
2024-03-15 10:30:15 ALERT [waf] SQL injection attempt detected in request parameter: GET /search?q=1%27%20OR%201%3D1%20-- from IP 198.51.100.73
LOG
printf "security-event" > samples/014.output.txt

cat > samples/015.input.txt << 'LOG'
2024-03-15 10:31:00 WARN [auth-service] Privilege escalation attempt: user viewer@company.com tried to access /admin/users/delete with role VIEWER
LOG
printf "security-event" > samples/015.output.txt

cat > samples/016.input.txt << 'LOG'
2024-03-15 10:31:30 ALERT [ssh] Accepted publickey for root from 45.33.32.156 port 48290 - IP not in allowed bastion host list
LOG
printf "security-event" > samples/016.output.txt

# --- PERFORMANCE DEGRADATION ---

cat > samples/017.input.txt << 'LOG'
2024-03-15 10:32:00 WARN [web-server] Request latency spike: GET /api/reports/quarterly averaged 4200ms over last 60 seconds (baseline: 250ms)
LOG
printf "performance-degradation" > samples/017.output.txt

cat > samples/018.input.txt << 'LOG'
2024-03-15 10:32:30 WARN [db] Slow query detected: SELECT * FROM orders JOIN line_items ON orders.id = line_items.order_id WHERE created_at > ... took 12.4 seconds, rows examined: 2847000
LOG
printf "performance-degradation" > samples/018.output.txt

cat > samples/019.input.txt << 'LOG'
2024-03-15 10:33:00 WARN [load-balancer] Backend server node-3 health check response time degraded to 2800ms (threshold: 500ms), marking as unhealthy
LOG
printf "performance-degradation" > samples/019.output.txt

cat > samples/020.input.txt << 'LOG'
2024-03-15 10:33:30 WARN [gc-monitor] JVM garbage collection pause: 3400ms full GC, heap usage 94%. Application threads were stopped for 3.4 seconds.
LOG
printf "performance-degradation" > samples/020.output.txt

echo "Created 20 log samples (4 per category)"
