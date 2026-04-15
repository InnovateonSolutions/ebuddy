// smoke-droplet: verifica que el Droplet de DigitalOcean está operativo.
// Checks en paralelo: SSH (puerto 22), HTTPS (puerto 443), /api/health.
//
// Uso:
//   DROPLET_IP=1.2.3.4 APP_URL=https://app.ebuddy.io \
//     go run ./smoke-droplet/
//
// Exit code 0 = todos los checks pasan, 1 = alguno falla.

package main

import (
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"os"
	"sync"
	"time"
)

const dialTimeout = 10 * time.Second

type result struct {
	name   string
	passed bool
	detail string
}

func checkTCP(name, addr string) result {
	conn, err := net.DialTimeout("tcp", addr, dialTimeout)
	if err != nil {
		return result{name, false, err.Error()}
	}
	conn.Close()
	return result{name, true, addr + " reachable"}
}

func checkHealth(appURL string) result {
	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Get(appURL + "/api/health")
	if err != nil {
		return result{"health /api/health", false, err.Error()}
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return result{"health /api/health", false, fmt.Sprintf("HTTP %d", resp.StatusCode)}
	}

	var body map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		return result{"health /api/health", false, "invalid JSON response"}
	}

	ok, _ := body["ok"].(bool)
	if !ok {
		return result{"health /api/health", false, fmt.Sprintf("ok != true in %v", body)}
	}

	return result{"health /api/health", true, "ok"}
}

func main() {
	dropletIP := os.Getenv("DROPLET_IP")
	if dropletIP == "" {
		fmt.Fprintln(os.Stderr, "FAIL: DROPLET_IP env var is required")
		os.Exit(1)
	}
	appURL := os.Getenv("APP_URL")

	type checkFn func() result

	checks := []checkFn{
		func() result { return checkTCP("SSH  (port 22)", net.JoinHostPort(dropletIP, "22")) },
		func() result { return checkTCP("HTTPS (port 443)", net.JoinHostPort(dropletIP, "443")) },
	}
	if appURL != "" {
		checks = append(checks, func() result { return checkHealth(appURL) })
	}

	var mu sync.Mutex
	var results []result
	var wg sync.WaitGroup

	for _, fn := range checks {
		fn := fn
		wg.Add(1)
		go func() {
			defer wg.Done()
			r := fn()
			mu.Lock()
			results = append(results, r)
			mu.Unlock()
		}()
	}
	wg.Wait()

	failed := 0
	for _, r := range results {
		if r.passed {
			fmt.Printf("PASS [%s]: %s\n", r.name, r.detail)
		} else {
			fmt.Fprintf(os.Stderr, "FAIL [%s]: %s\n", r.name, r.detail)
			failed++
		}
	}

	fmt.Println()
	if failed > 0 {
		fmt.Fprintf(os.Stderr, "%d check(s) failed\n", failed)
		os.Exit(1)
	}
	fmt.Println("All checks passed ✓")
}
