// infra-verify: verifica el estado completo de la infraestructura en DigitalOcean.
// Cubre los edge cases de un terraform apply parcial o fallido.
//
// Checks en paralelo via DO API v2:
//   1. Droplet existe y status = "active"
//   2. DB cluster existe y status = "online"
//   3. Firewall de DB permite al Droplet (regla por droplet ID)
//   4. Reserved IP existe y está asignada al Droplet correcto
//   5. Container Registry existe y es accesible
//
// Uso:
//   DO_TOKEN=dop_v1_... APP_NAME=ebuddy ENVIRONMENT=prod \
//     go run ./infra-verify/
//
// Exit code: 0 = todo OK, 1 = algún check falló, 2 = error de configuración.

package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"sync"
	"time"
)

// ─── DO API types ────────────────────────────────────────────────────────────

type doDroplet struct {
	ID     int    `json:"id"`
	Name   string `json:"name"`
	Status string `json:"status"` // "new" | "active" | "off" | "archive"
}

type doDropletsResp struct {
	Droplets []doDroplet `json:"droplets"`
}

type doDBCluster struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	Status string `json:"status"` // "creating" | "online" | "migrating" | "error"
	Engine string `json:"engine"`
}

type doDBListResp struct {
	Databases []doDBCluster `json:"databases"`
}

type doFirewallRule struct {
	Type  string `json:"type"`  // "droplet" | "ip_addr" | "tag" | "app"
	Value string `json:"value"` // droplet ID as string
}

type doFirewallResp struct {
	Rules []doFirewallRule `json:"rules"`
}

type doReservedIP struct {
	IP      string      `json:"ip"`
	Droplet *doDroplet  `json:"droplet"` // nil si no está asignada
}

type doReservedIPsResp struct {
	ReservedIPs []doReservedIP `json:"reserved_ips"`
}

type doRegistry struct {
	Name string `json:"name"`
}

type doRegistryResp struct {
	Registry doRegistry `json:"registry"`
}

// ─── Result ──────────────────────────────────────────────────────────────────

type checkResult struct {
	name   string
	passed bool
	warn   bool   // true = advertencia, no fallo crítico
	detail string
}

// ─── HTTP helper ─────────────────────────────────────────────────────────────

type doClient struct {
	token string
	http  *http.Client
}

func newDOClient(token string) *doClient {
	return &doClient{
		token: token,
		http:  &http.Client{Timeout: 15 * time.Second},
	}
}

func (c *doClient) get(path string, out any) error {
	req, err := http.NewRequest("GET", "https://api.digitalocean.com/v2"+path, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+c.token)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.http.Do(req)
	if err != nil {
		return fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		return fmt.Errorf("DO API returned %d: %s", resp.StatusCode, string(body))
	}
	return json.Unmarshal(body, out)
}

// ─── Individual checks ────────────────────────────────────────────────────────

func checkDroplet(client *doClient, namePrefix string) checkResult {
	name := namePrefix + "-droplet"
	var resp doDropletsResp
	if err := client.get("/droplets?name="+name, &resp); err != nil {
		return checkResult{"droplet", false, false, err.Error()}
	}
	if len(resp.Droplets) == 0 {
		return checkResult{"droplet", false, false,
			fmt.Sprintf("droplet '%s' not found — terraform apply may not have run", name)}
	}
	d := resp.Droplets[0]
	switch d.Status {
	case "active":
		return checkResult{"droplet", true, false,
			fmt.Sprintf("id=%d status=active", d.ID)}
	case "new":
		return checkResult{"droplet", false, true,
			fmt.Sprintf("id=%d status=new — still provisioning, retry in 2-3 minutes", d.ID)}
	case "off":
		return checkResult{"droplet", false, false,
			fmt.Sprintf("id=%d status=off — droplet is powered off, start it from DO console or terraform", d.ID)}
	default:
		return checkResult{"droplet", false, false,
			fmt.Sprintf("id=%d status=%s — unexpected state", d.ID, d.Status)}
	}
}

func checkDatabase(client *doClient, namePrefix string) (checkResult, string) {
	var resp doDBListResp
	if err := client.get("/databases", &resp); err != nil {
		return checkResult{"database", false, false, err.Error()}, ""
	}

	targetName := namePrefix + "-db"
	for _, db := range resp.Databases {
		if db.Name == targetName {
			switch db.Status {
			case "online":
				return checkResult{"database", true, false,
					fmt.Sprintf("id=%s engine=pg status=online", db.ID)}, db.ID
			case "creating":
				return checkResult{"database", false, true,
					fmt.Sprintf("id=%s status=creating — still provisioning (~5 min)", db.ID)}, db.ID
			case "migrating":
				return checkResult{"database", false, true,
					fmt.Sprintf("id=%s status=migrating — migration in progress, wait for completion", db.ID)}, db.ID
			case "error":
				return checkResult{"database", false, false,
					fmt.Sprintf("id=%s status=error — DB cluster in error state, check DO console", db.ID)}, db.ID
			default:
				return checkResult{"database", false, false,
					fmt.Sprintf("id=%s status=%s — unexpected state", db.ID, db.Status)}, db.ID
			}
		}
	}

	return checkResult{"database", false, false,
		fmt.Sprintf("database cluster '%s' not found — run terraform apply", targetName)}, ""
}

func checkDBFirewall(client *doClient, dbID string, dropletID int) checkResult {
	if dbID == "" {
		return checkResult{"db-firewall", false, false, "skipped — database ID unknown"}
	}
	if dropletID == 0 {
		return checkResult{"db-firewall", false, false, "skipped — droplet ID unknown"}
	}

	var resp doFirewallResp
	if err := client.get("/databases/"+dbID+"/firewall", &resp); err != nil {
		return checkResult{"db-firewall", false, false, err.Error()}
	}

	target := fmt.Sprintf("%d", dropletID)
	for _, rule := range resp.Rules {
		if rule.Type == "droplet" && rule.Value == target {
			return checkResult{"db-firewall", true, false,
				fmt.Sprintf("droplet %d is allowed to connect to database", dropletID)}
		}
	}

	return checkResult{"db-firewall", false, false,
		fmt.Sprintf("droplet %d is NOT in DB firewall rules — partial apply? run terraform apply", dropletID)}
}

func checkReservedIP(client *doClient, dropletID int) checkResult {
	var resp doReservedIPsResp
	if err := client.get("/reserved_ips", &resp); err != nil {
		return checkResult{"reserved-ip", false, false, err.Error()}
	}
	if len(resp.ReservedIPs) == 0 {
		return checkResult{"reserved-ip", false, false,
			"no reserved IPs found — run terraform apply"}
	}
	for _, rip := range resp.ReservedIPs {
		if rip.Droplet == nil {
			continue
		}
		if rip.Droplet.ID == dropletID {
			return checkResult{"reserved-ip", true, false,
				fmt.Sprintf("ip=%s assigned to droplet %d", rip.IP, dropletID)}
		}
	}
	// IP existe pero no asignada al droplet correcto
	for _, rip := range resp.ReservedIPs {
		if rip.Droplet == nil {
			return checkResult{"reserved-ip", false, false,
				fmt.Sprintf("ip=%s exists but NOT assigned to any droplet — terraform apply needed", rip.IP)}
		}
	}
	return checkResult{"reserved-ip", false, false,
		fmt.Sprintf("no reserved IP assigned to droplet %d", dropletID)}
}

func checkRegistry(client *doClient) checkResult {
	var resp doRegistryResp
	if err := client.get("/registry", &resp); err != nil {
		if isNotFound(err) {
			return checkResult{"registry", false, false,
				"container registry not found — run terraform apply"}
		}
		return checkResult{"registry", false, false, err.Error()}
	}
	return checkResult{"registry", true, false,
		fmt.Sprintf("name=%s", resp.Registry.Name)}
}

func isNotFound(err error) bool {
	if err == nil {
		return false
	}
	return len(err.Error()) > 9 && err.Error()[:9] == "DO API re"
}

// ─── Main ─────────────────────────────────────────────────────────────────────

func main() {
	doToken := os.Getenv("DO_TOKEN")
	appName := os.Getenv("APP_NAME")
	environment := os.Getenv("ENVIRONMENT")

	if doToken == "" || appName == "" || environment == "" {
		fmt.Fprintln(os.Stderr, "ERROR: DO_TOKEN, APP_NAME, and ENVIRONMENT env vars are required")
		os.Exit(2)
	}

	namePrefix := appName + "-" + environment
	client := newDOClient(doToken)

	fmt.Printf("=== Infra Verify — %s ===\n\n", namePrefix)

	// ── Fase 1: checks independientes en paralelo ─────────────
	type phaseResult struct {
		droplet    checkResult
		dropletID  int
		database   checkResult
		databaseID string
		registry   checkResult
	}

	var phase1 phaseResult
	var wg sync.WaitGroup
	var mu sync.Mutex

	wg.Add(3)

	go func() {
		defer wg.Done()
		r := checkDroplet(client, namePrefix)
		mu.Lock()
		phase1.droplet = r
		// extraer ID si pasó
		if r.passed {
			var resp doDropletsResp
			_ = client.get("/droplets?name="+namePrefix+"-droplet", &resp)
			if len(resp.Droplets) > 0 {
				phase1.dropletID = resp.Droplets[0].ID
			}
		}
		mu.Unlock()
	}()

	go func() {
		defer wg.Done()
		r, dbID := checkDatabase(client, namePrefix)
		mu.Lock()
		phase1.database = r
		phase1.databaseID = dbID
		mu.Unlock()
	}()

	go func() {
		defer wg.Done()
		r := checkRegistry(client)
		mu.Lock()
		phase1.registry = r
		mu.Unlock()
	}()

	wg.Wait()

	// ── Fase 2: checks dependientes (necesitan IDs de fase 1) ─
	firewallResult := checkDBFirewall(client, phase1.databaseID, phase1.dropletID)
	reservedIPResult := checkReservedIP(client, phase1.dropletID)

	// ── Mostrar resultados ─────────────────────────────────────
	allResults := []checkResult{
		phase1.droplet,
		phase1.database,
		firewallResult,
		reservedIPResult,
		phase1.registry,
	}

	failed := 0
	warned := 0
	for _, r := range allResults {
		prefix := "PASS"
		if r.warn {
			prefix = "WARN"
			warned++
		} else if !r.passed {
			prefix = "FAIL"
			failed++
		}
		fmt.Printf("[%s] %-14s %s\n", prefix, r.name, r.detail)
	}

	fmt.Println()

	switch {
	case failed > 0:
		fmt.Fprintf(os.Stderr,
			"%d check(s) FAILED — see docs/operations/disaster-recovery.md for remediation\n", failed)
		os.Exit(1)
	case warned > 0:
		fmt.Printf("%d check(s) WARN — infrastructure is provisioning, retry in a few minutes\n", warned)
		os.Exit(0)
	default:
		fmt.Println("All checks passed ✓ — infrastructure is consistent")
	}
}
