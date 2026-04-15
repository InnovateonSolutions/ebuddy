package terratest

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/require"
)

type iamPolicyDocument struct {
	Statement []iamStatement `json:"Statement"`
}

type iamStatement struct {
	Sid      string   `json:"Sid"`
	Effect   string   `json:"Effect"`
	Action   any      `json:"Action"`
	Resource any      `json:"Resource"`
}

func policyActions(statement iamStatement) []string {
	switch actions := statement.Action.(type) {
	case string:
		return []string{actions}
	case []any:
		result := make([]string, 0, len(actions))
		for _, action := range actions {
			if s, ok := action.(string); ok {
				result = append(result, s)
			}
		}
		return result
	default:
		return nil
	}
}

func TestRoute53PolicyIncludesRequiredHostedZoneReadActions(t *testing.T) {
	t.Parallel()

	policyPath := filepath.Join("..", "..", "docs", "iam", "route53-policy.json")
	raw, err := os.ReadFile(policyPath)
	require.NoError(t, err)

	var policy iamPolicyDocument
	require.NoError(t, json.Unmarshal(raw, &policy))

	var manageStmt *iamStatement
	for i := range policy.Statement {
		if policy.Statement[i].Sid == "ManageEbuddyDNS" {
			manageStmt = &policy.Statement[i]
			break
		}
	}

	require.NotNil(t, manageStmt, "route53 policy must define ManageEbuddyDNS")

	actions := policyActions(*manageStmt)
	require.Contains(t, actions, "route53:GetHostedZone")
	require.Contains(t, actions, "route53:ListTagsForResource")
	require.Contains(t, actions, "route53:ChangeResourceRecordSets")
	require.Contains(t, actions, "route53:ListResourceRecordSets")
}
