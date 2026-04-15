package terratest

import (
	"path/filepath"
	"testing"

	ttterraform "github.com/gruntwork-io/terratest/modules/terraform"
	test_structure "github.com/gruntwork-io/terratest/modules/test-structure"
	"github.com/stretchr/testify/require"
)

func copyTerraformModule(t *testing.T) string {
	t.Helper()

	repoRoot, err := filepath.Abs(filepath.Join("..", ".."))
	require.NoError(t, err)

	return test_structure.CopyTerraformFolderToTemp(t, repoRoot, "infra/terraform")
}

func testVars(enableRoute53 bool) map[string]interface{} {
	return map[string]interface{}{
		"do_token":       "dummy-token",
		"do_region":      "nyc3",
		"app_name":       "ebuddy",
		"environment":    "dev",
		"domain_name":    "ebuddy.example.com",
		"alert_email":    "dev@example.com",
		"ssh_pub_key":    "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIBootstrapTerratestKeyExampleOnly terratest@local",
		"droplet_size":   "s-1vcpu-2gb",
		"enable_route53": enableRoute53,
	}
}

func newTerraformOptions(t *testing.T, enableRoute53 bool) *ttterraform.Options {
	t.Helper()

	return &ttterraform.Options{
		TerraformDir:    copyTerraformModule(t),
		NoColor:         true,
		TerraformBinary: "terraform",
		Vars:            testVars(enableRoute53),
	}
}

func TestTerraformModuleFmtAndValidateWithoutRoute53(t *testing.T) {
	t.Parallel()

	opts := newTerraformOptions(t, false)

	_, err := ttterraform.RunTerraformCommandE(t, opts, "fmt", "-check", "-recursive")
	require.NoError(t, err)

	_, err = ttterraform.RunTerraformCommandE(t, opts, "init", "-backend=false", "-input=false")
	require.NoError(t, err)

	_, err = ttterraform.RunTerraformCommandE(t, opts, "validate")
	require.NoError(t, err)
}

func TestTerraformModuleValidateWithRoute53Enabled(t *testing.T) {
	t.Parallel()

	opts := newTerraformOptions(t, true)

	_, err := ttterraform.RunTerraformCommandE(t, opts, "init", "-backend=false", "-input=false")
	require.NoError(t, err)

	_, err = ttterraform.RunTerraformCommandE(t, opts, "validate")
	require.NoError(t, err)
}
