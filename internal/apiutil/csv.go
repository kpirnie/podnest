package apiutil

import (
	"encoding/csv"
	"fmt"
	"io"
	"net/http"
)

// ExportCSV writes rows as a CSV file download with the given filename and header.
func ExportCSV(w http.ResponseWriter, filename string, header []string, rows [][]string) {
	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	cw := csv.NewWriter(w)
	_ = cw.Write(header)
	for _, row := range rows {
		_ = cw.Write(row)
	}
	cw.Flush()
}

// ImportCSV parses a multipart CSV upload and returns all data rows with the header skipped.
func ImportCSV(r *http.Request) ([][]string, error) {
	if err := r.ParseMultipartForm(2 << 20); err != nil {
		return nil, fmt.Errorf("failed to parse multipart form: %w", err)
	}
	f, _, err := r.FormFile("file")
	if err != nil {
		return nil, fmt.Errorf("file field is required")
	}
	defer f.Close()

	cr := csv.NewReader(io.LimitReader(f, 2<<20))
	all, err := cr.ReadAll()
	if err != nil {
		return nil, fmt.Errorf("invalid CSV: %w", err)
	}
	if len(all) < 2 {
		return nil, fmt.Errorf("CSV has no data rows")
	}
	return all[1:], nil
}
