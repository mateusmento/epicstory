package main

import (
	"encoding/base64"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"os"
	"path"
	"strings"

	vault "github.com/hashicorp/vault/api"
)

type ExportedSecret struct {
	Path string                 `json:"path"`
	Data map[string]interface{} `json:"data"`
}

func newClient(addr, token string) (*vault.Client, error) {
	cfg := vault.DefaultConfig()
	cfg.Address = addr
	client, err := vault.NewClient(cfg)
	if err != nil {
		return nil, err
	}
	if token != "" {
		client.SetToken(token)
	}
	return client, nil
}

func listKVRecursive(client *vault.Client, mount string, prefix string) ([]string, error) {
	var paths []string

	var listPath string
	if prefix == "" {
		listPath = fmt.Sprintf("%s/metadata", mount)
	} else {
		clean := strings.Trim(prefix, "/")
		listPath = fmt.Sprintf("%s/metadata/%s", mount, clean)
	}

	secret, err := client.Logical().List(listPath)
	if err != nil {
		return nil, err
	}
	if secret == nil || secret.Data == nil {
		return paths, nil
	}

	keysIfc, ok := secret.Data["keys"]
	if !ok || keysIfc == nil {
		return paths, nil
	}
	keysSlice, ok := keysIfc.([]interface{})
	if !ok {
		return paths, fmt.Errorf("unexpected keys type for %s", listPath)
	}

	for _, k := range keysSlice {
		keyStr := fmt.Sprintf("%v", k)
		if strings.HasSuffix(keyStr, "/") {
			folder := strings.TrimSuffix(keyStr, "/")
			var subPrefix string
			if prefix == "" {
				subPrefix = folder
			} else {
				subPrefix = path.Join(prefix, folder)
			}
			subPaths, err := listKVRecursive(client, mount, subPrefix)
			if err != nil {
				return nil, err
			}
			paths = append(paths, subPaths...)
		} else {
			var itemPath string
			if prefix == "" {
				itemPath = keyStr
			} else {
				itemPath = path.Join(prefix, keyStr)
			}
			paths = append(paths, itemPath)
		}
	}

	return paths, nil
}

func readKVv2(client *vault.Client, mount, relPath string) (map[string]interface{}, error) {
	readPath := fmt.Sprintf("%s/data/%s", mount, strings.Trim(relPath, "/"))
	secret, err := client.Logical().Read(readPath)
	if err != nil {
		return nil, fmt.Errorf("read %s: %w", readPath, err)
	}
	if secret == nil || secret.Data == nil {
		return nil, nil
	}
	dataIfc, ok := secret.Data["data"]
	if !ok || dataIfc == nil {
		return nil, nil
	}
	dataMap, ok := dataIfc.(map[string]interface{})
	if !ok {
		return nil, fmt.Errorf("unexpected data shape for %s", readPath)
	}
	return dataMap, nil
}

func writeKVv2(client *vault.Client, mount, relPath string, data map[string]interface{}) error {
	writePath := fmt.Sprintf("%s/data/%s", mount, strings.Trim(relPath, "/"))
	payload := map[string]interface{}{"data": data}
	_, err := client.Logical().Write(writePath, payload)
	if err != nil {
		return fmt.Errorf("write %s: %w", writePath, err)
	}
	return nil
}

func decryptWithTransit(client *vault.Client, transitKey, ciphertext string) (string, error) {
	p := map[string]interface{}{"ciphertext": ciphertext}
	secret, err := client.Logical().Write(fmt.Sprintf("transit/decrypt/%s", transitKey), p)
	if err != nil {
		return "", fmt.Errorf("transit/decrypt %s: %w", transitKey, err)
	}
	if secret == nil || secret.Data == nil {
		return "", fmt.Errorf("no data from transit/decrypt")
	}
	plainB64Ifc, ok := secret.Data["plaintext"]
	if !ok {
		return "", fmt.Errorf("no plaintext field from transit/decrypt")
	}
	plainB64 := fmt.Sprintf("%v", plainB64Ifc)
	plainBytes, err := base64.StdEncoding.DecodeString(plainB64)
	if err != nil {
		return "", fmt.Errorf("base64 decode plaintext: %w", err)
	}
	return string(plainBytes), nil
}

func encryptWithTransit(client *vault.Client, transitKey, plaintext string) (string, error) {
	plainB64 := base64.StdEncoding.EncodeToString([]byte(plaintext))
	p := map[string]interface{}{"plaintext": plainB64}
	secret, err := client.Logical().Write(fmt.Sprintf("transit/encrypt/%s", transitKey), p)
	if err != nil {
		return "", fmt.Errorf("transit/encrypt %s: %w", transitKey, err)
	}
	if secret == nil || secret.Data == nil {
		return "", fmt.Errorf("no data from transit/encrypt")
	}
	cipherIfc, ok := secret.Data["ciphertext"]
	if !ok {
		return "", fmt.Errorf("no ciphertext returned from transit/encrypt")
	}
	return fmt.Sprintf("%v", cipherIfc), nil
}

func exportSecrets(oldClient *vault.Client, mount, transitKey, outFile string) error {
	log.Printf("Listing secrets under mount %q...", mount)
	paths, err := listKVRecursive(oldClient, mount, "")
	if err != nil {
		return err
	}
	log.Printf("Found %d secret paths", len(paths))

	var out []ExportedSecret

	for _, p := range paths {
		log.Printf("Reading %s...", p)
		dataMap, err := readKVv2(oldClient, mount, p)
		if err != nil {
			return err
		}
		if dataMap == nil {
			continue
		}

		// For each field, if key == "encrypted" and is string, decrypt via transit
		exportData := make(map[string]interface{})
		for k, v := range dataMap {
			if k == "encrypted" {
				// decrypt if string
				if cs, ok := v.(string); ok && cs != "" {
					plain, err := decryptWithTransit(oldClient, transitKey, cs)
					if err != nil {
						return fmt.Errorf("decrypt %s.%s: %w", p, k, err)
					}
					exportData[k] = plain
					continue
				}
			}
			// otherwise copy as-is
			exportData[k] = v
		}

		out = append(out, ExportedSecret{
			Path: p,
			Data: exportData,
		})
	}

	f, err := os.Create(outFile)
	if err != nil {
		return fmt.Errorf("create export file: %w", err)
	}
	enc := json.NewEncoder(f)
	enc.SetIndent("", "  ")
	if err := enc.Encode(out); err != nil {
		f.Close()
		return fmt.Errorf("encode export JSON: %w", err)
	}
	f.Close()
	log.Printf("Exported %d secrets to %s", len(out), outFile)
	return nil
}

func importSecrets(newClient *vault.Client, mount, transitKey, inFile string) error {
	b, err := os.ReadFile(inFile)
	if err != nil {
		return fmt.Errorf("read import file: %w", err)
	}
	var items []ExportedSecret
	if err := json.Unmarshal(b, &items); err != nil {
		return fmt.Errorf("unmarshal import JSON: %w", err)
	}
	log.Printf("Importing %d secrets to mount %q", len(items), mount)

	for _, item := range items {
		// For each field named "encrypted", encrypt with new transit key
		newData := make(map[string]interface{})
		for k, v := range item.Data {
			if k == "encrypted" {
				if plain, ok := v.(string); ok {
					cipher, err := encryptWithTransit(newClient, transitKey, plain)
					if err != nil {
						return fmt.Errorf("encrypt %s: %w", item.Path, err)
					}
					newData[k] = cipher
					continue
				}
			}
			newData[k] = v
		}

		// write to kv v2: mount/data/<path> with {"data": newData}
		log.Printf("Writing %s...", item.Path)
		if err := writeKVv2(newClient, mount, item.Path, newData); err != nil {
			return fmt.Errorf("write %s: %w", item.Path, err)
		}
	}

	log.Printf("Import complete.")
	return nil
}

func main() {
	var (
		oldAddr    = flag.String("old-addr", os.Getenv("OLD_ADDR"), "Old Vault address (source)")
		oldToken   = flag.String("old-token", os.Getenv("OLD_TOKEN"), "Old Vault token")
		oldTransit = flag.String("old-transit", os.Getenv("OLD_TRANSIT_KEY"), "Old transit key name")
		newAddr    = flag.String("new-addr", os.Getenv("NEW_ADDR"), "New Vault address (target)")
		newToken   = flag.String("new-token", os.Getenv("NEW_TOKEN"), "New Vault token")
		newTransit = flag.String("new-transit", os.Getenv("NEW_TRANSIT_KEY"), "New transit key name")
		kvMount    = flag.String("mount", os.Getenv("KV_MOUNT"), "KV v2 mount path (e.g., secret)")
		exportFile = flag.String("out", "secrets_export.json", "Export file path")
		exportOnly = flag.Bool("export-only", false, "Only export")
		importOnly = flag.Bool("import-only", false, "Only import (reads -out)")
	)
	flag.Parse()

	if *kvMount == "" {
		log.Fatal("kv mount must be provided via -mount or KV_MOUNT env")
	}
	if !(*importOnly) && (*oldAddr == "" || *oldToken == "") {
		log.Fatal("old-addr and old-token must be provided (or via env OLD_ADDR/OLD_TOKEN)")
	}
	if !(*exportOnly) && (*newAddr == "" || *newToken == "") {
		log.Fatal("new-addr and new-token must be provided (or via env NEW_ADDR/NEW_TOKEN)")
	}

	if !(*importOnly) && *oldTransit == "" {
		log.Fatal("old-transit must be provided (or via env OLD_TRANSIT_KEY)")
	}

	if !(*exportOnly) && *newTransit == "" {
		log.Fatal("new-transit must be provided (or via env NEW_TRANSIT_KEY)")
	}

	if *importOnly && *exportOnly {
		log.Fatal("can't specify both -export-only and -import-only")
	}

	if !*importOnly {
		oldClient, err := newClient(*oldAddr, *oldToken)
		if err != nil {
			log.Fatalf("old client: %v", err)
		}

		if err := exportSecrets(oldClient, *kvMount, *oldTransit, *exportFile); err != nil {
			log.Fatalf("export failed: %v", err)
		}
		if *exportOnly {
			log.Printf("Export-only mode, finished.")
			return
		}
	}

	if !*exportOnly {
		newClient, err := newClient(*newAddr, *newToken)
		if err != nil {
			log.Fatalf("new client: %v", err)
		}

		if err := importSecrets(newClient, *kvMount, *newTransit, *exportFile); err != nil {
			log.Fatalf("import failed: %v", err)
		}
	}
}
