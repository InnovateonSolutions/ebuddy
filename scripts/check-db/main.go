// check-db: verifica conectividad TCP + TLS a un DO Managed PostgreSQL.
// No requiere driver de PostgreSQL — solo stdlib.
//
// Uso:
//   DATABASE_URL=postgresql://user:pass@host:port/db?sslmode=require \
//     go run ./check-db/
//
// Salida:
//   PASS [TCP]: host:port reachable
//   PASS [TLS]: TLS handshake successful — cert issued by DigiCert ...
//   PASS: PostgreSQL at host:port is reachable and TLS is valid
//
// Exit code 0 = éxito, 1 = fallo.

package main

import (
	"crypto/tls"
	"fmt"
	"net"
	"net/url"
	"os"
	"time"
)

const dialTimeout = 10 * time.Second

func main() {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		fatalf("DATABASE_URL env var is required\n")
	}

	u, err := url.Parse(dbURL)
	if err != nil {
		fatalf("invalid DATABASE_URL: %v\n", err)
	}

	host := u.Hostname()
	port := u.Port()
	if port == "" {
		port = "5432"
	}
	addr := net.JoinHostPort(host, port)

	// ── TCP check ────────────────────────────────────────────
	fmt.Printf("Checking TCP connectivity to %s ...\n", addr)
	conn, err := net.DialTimeout("tcp", addr, dialTimeout)
	if err != nil {
		fatalf("FAIL [TCP]: %v\n", err)
	}
	conn.Close()
	fmt.Printf("PASS [TCP]: %s reachable\n", addr)

	// ── TLS check ────────────────────────────────────────────
	fmt.Printf("Checking TLS handshake with %s ...\n", host)
	dialer := &net.Dialer{Timeout: dialTimeout}
	tlsConf := &tls.Config{
		ServerName:         host,
		InsecureSkipVerify: false, // siempre verificar el certificado
	}
	tlsConn, err := tls.DialWithDialer(dialer, "tcp", addr, tlsConf)
	if err != nil {
		fatalf("FAIL [TLS]: %v\n", err)
	}
	state := tlsConn.ConnectionState()
	tlsConn.Close()

	if len(state.PeerCertificates) > 0 {
		cert := state.PeerCertificates[0]
		fmt.Printf("PASS [TLS]: cert issued by %q — expires %s\n",
			cert.Issuer.CommonName,
			cert.NotAfter.Format("2006-01-02"),
		)
	} else {
		fmt.Println("PASS [TLS]: TLS handshake successful")
	}

	fmt.Printf("\nPASS: PostgreSQL at %s is reachable and TLS is valid\n", addr)
}

func fatalf(format string, args ...any) {
	fmt.Fprintf(os.Stderr, format, args...)
	os.Exit(1)
}
